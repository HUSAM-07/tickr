"use client"

import {
  DERIV_WS_URL,
  DERIV_APP_ID,
  HEARTBEAT_INTERVAL,
  RECONNECT_BASE_DELAY,
  RECONNECT_MAX_DELAY,
  MAX_RECONNECT_ATTEMPTS,
} from "./constants"
import type {
  ConnectionState,
  DerivRequest,
  DerivResponse,
  TickResponse,
  OHLCResponse,
  TicksHistoryResponse,
  ProposalResponse,
  BuyResponse,
  BalanceResponse,
} from "./types"

type MessageHandler = (response: DerivResponse) => void
type ConnectionHandler = (state: ConnectionState) => void
type SubscriptionCallback = (data: unknown) => void

/**
 * Singleton WebSocket client for the Deriv API v3.
 *
 * Handles connection lifecycle, heartbeat, auto-reconnect,
 * request/response correlation via req_id, and subscription management.
 */
class DerivWSClient {
  private ws: WebSocket | null = null
  private state: ConnectionState = "disconnected"
  private reqCounter = 0
  private pendingRequests = new Map<number, { resolve: (v: DerivResponse) => void; reject: (e: Error) => void }>()
  private subscriptions = new Map<string, SubscriptionCallback>() // subscription_id -> callback
  private messageHandlers = new Set<MessageHandler>()
  private connectionHandlers = new Set<ConnectionHandler>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private authToken: string | null = null

  // ── Connection lifecycle ──

  connect(): void {
    if (this.ws && (this.state === "connected" || this.state === "connecting" || this.state === "authorized")) {
      return
    }

    this.setState("connecting")
    const url = `${DERIV_WS_URL}?app_id=${DERIV_APP_ID}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.setState("connected")
      this.reconnectAttempts = 0
      this.startHeartbeat()

      // Re-authorize if we had a token
      if (this.authToken) {
        this.authorize(this.authToken).catch(console.error)
      }
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as DerivResponse
        this.handleMessage(data)
      } catch {
        // Ignore malformed messages
      }
    }

    this.ws.onerror = () => {
      // onclose will fire after this, handle reconnect there
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      this.setState("disconnected")
      this.rejectAllPending("Connection closed")
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS // prevent auto-reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopHeartbeat()
    this.subscriptions.clear()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setState("disconnected")
  }

  getState(): ConnectionState {
    return this.state
  }

  // ── Auth ──

  async authorize(token: string): Promise<DerivResponse> {
    this.authToken = token
    const response = await this.send({ authorize: token })
    if (!response.error) {
      this.setState("authorized")
    }
    return response
  }

  // ── Core send/receive ──

  send(request: DerivRequest): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"))
        return
      }

      const reqId = ++this.reqCounter
      const payload = { ...request, req_id: reqId }

      this.pendingRequests.set(reqId, { resolve, reject })
      this.ws.send(JSON.stringify(payload))

      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId)
          reject(new Error(`Request ${reqId} timed out`))
        }
      }, 30_000)
    })
  }

  // ── Subscriptions ──

  /** Subscribe to a stream. Returns an unsubscribe function. */
  subscribe(
    request: DerivRequest,
    callback: SubscriptionCallback
  ): { promise: Promise<DerivResponse>; unsubscribe: () => void } {
    let subscriptionId: string | null = null

    const promise = this.send({ ...request, subscribe: 1 }).then((response) => {
      const subId = (response as { subscription?: { id: string } }).subscription?.id
      if (subId) {
        subscriptionId = subId
        this.subscriptions.set(subId, callback)
      }
      // Also call the callback with the first response
      callback(response)
      return response
    }).catch((err) => {
      // Subscription errors are non-fatal — log and swallow
      console.warn(`[DerivWS] Subscription failed: ${err instanceof Error ? err.message : err}`)
      return { msg_type: "error", error: { code: "SubFailed", message: String(err) } } as DerivResponse
    })

    return {
      promise,
      unsubscribe: () => {
        if (subscriptionId) {
          this.forget(subscriptionId)
          this.subscriptions.delete(subscriptionId)
        }
      },
    }
  }

  /** Unsubscribe from a specific stream */
  async forget(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId)
    try {
      await this.send({ forget: subscriptionId })
    } catch {
      // Best-effort
    }
  }

  /** Unsubscribe from all streams of a type */
  async forgetAll(streamType: string): Promise<void> {
    try {
      await this.send({ forget_all: streamType })
    } catch {
      // Best-effort
    }
    // Remove matching subscriptions from local map
    // (Deriv doesn't tell us which IDs were forgotten, so clear all)
    if (streamType === "ticks") {
      this.subscriptions.clear()
    }
  }

  // ── Convenience methods for common API calls ──

  async getTicksHistory(
    symbol: string,
    options: { style?: "ticks" | "candles"; granularity?: number; count?: number } = {}
  ): Promise<TicksHistoryResponse> {
    return (await this.send({
      ticks_history: symbol,
      style: options.style ?? "candles",
      granularity: options.granularity ?? 60,
      count: options.count ?? 100,
      end: "latest",
    })) as TicksHistoryResponse
  }

  subscribeTicks(
    symbol: string,
    callback: (tick: TickResponse) => void
  ): { promise: Promise<DerivResponse>; unsubscribe: () => void } {
    return this.subscribe({ ticks: symbol }, (data) => {
      callback(data as TickResponse)
    })
  }

  subscribeCandles(
    symbol: string,
    granularity: number,
    callback: (candle: OHLCResponse) => void
  ): { promise: Promise<DerivResponse>; unsubscribe: () => void } {
    return this.subscribe(
      { ticks_history: symbol, style: "candles", granularity, end: "latest", count: 1 },
      (data) => {
        callback(data as OHLCResponse)
      }
    )
  }

  subscribeProposal(
    params: {
      symbol: string
      contractType: string
      amount: number
      duration: number
      durationUnit: string
      basis?: string
      barrier?: string
    },
    callback: (proposal: ProposalResponse) => void
  ): { promise: Promise<DerivResponse>; unsubscribe: () => void } {
    return this.subscribe(
      {
        proposal: 1,
        amount: params.amount,
        basis: params.basis ?? "stake",
        contract_type: params.contractType,
        currency: "USD",
        duration: params.duration,
        duration_unit: params.durationUnit,
        symbol: params.symbol,
        ...(params.barrier ? { barrier: params.barrier } : {}),
      },
      (data) => callback(data as ProposalResponse)
    )
  }

  async buy(proposalId: string, price: number): Promise<BuyResponse> {
    return (await this.send({ buy: proposalId, price })) as BuyResponse
  }

  subscribeBalance(
    callback: (balance: BalanceResponse) => void
  ): { promise: Promise<DerivResponse>; unsubscribe: () => void } {
    return this.subscribe({ balance: 1, account: "current" }, (data) => {
      callback(data as BalanceResponse)
    })
  }

  async getActiveSymbols(): Promise<DerivResponse> {
    return this.send({ active_symbols: "brief", product_type: "basic" })
  }

  // ── Event handlers ──

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler)
    // Immediately fire with current state
    handler(this.state)
    return () => this.connectionHandlers.delete(handler)
  }

  // ── Internals ──

  private handleMessage(data: DerivResponse): void {
    // Resolve pending request
    if (data.req_id && this.pendingRequests.has(data.req_id)) {
      const pending = this.pendingRequests.get(data.req_id)!
      this.pendingRequests.delete(data.req_id)
      if (data.error) {
        pending.reject(new Error(data.error.message))
      } else {
        pending.resolve(data)
      }
    }

    // Route to subscription callback
    const subId = (data as { subscription?: { id: string } }).subscription?.id
    if (subId && this.subscriptions.has(subId)) {
      this.subscriptions.get(subId)!(data)
    }

    // Notify all generic message handlers
    for (const handler of this.messageHandlers) {
      handler(data)
    }
  }

  private setState(newState: ConnectionState): void {
    this.state = newState
    for (const handler of this.connectionHandlers) {
      handler(newState)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: 1 }))
      }
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    )
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private rejectAllPending(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error(reason))
    }
    this.pendingRequests.clear()
  }
}

// Singleton instance
let instance: DerivWSClient | null = null

export function getDerivClient(): DerivWSClient {
  if (!instance) {
    instance = new DerivWSClient()
  }
  return instance
}

export type { DerivWSClient }
