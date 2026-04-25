"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { getDerivClient, type DerivWSClient } from "@/lib/deriv/client"
import type {
  ConnectionState,
  BalanceResponse,
} from "@/lib/deriv/types"

type TradingState = {
  client: DerivWSClient
  connectionState: ConnectionState
  balance: number | null
  currency: string
  accountType: "demo" | "real"
  accountId: string | null
  authError: string | null
  connect: () => void
  disconnect: () => void
}

const TradingContext = createContext<TradingState | null>(null)

export function TradingProvider({ children }: { children: ReactNode }) {
  // Stable singleton — getDerivClient() returns the same instance every time
  const [client] = useState(() => getDerivClient())
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [balance, setBalance] = useState<number | null>(null)
  const [currency, setCurrency] = useState("USD")
  const [accountId, setAccountId] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const balanceUnsubRef = useRef<(() => void) | null>(null)
  const authAttemptedRef = useRef(false)

  // Fetch authenticated WS URL from our server-side proxy
  const fetchAuthUrl = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/deriv-auth")
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(data.error || `Auth failed: ${res.status}`)
      }
      const { wsUrl, accountId: id } = await res.json()
      setAccountId(id)
      setAuthError(null)
      return wsUrl as string
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auth failed"
      setAuthError(msg)
      console.warn("[TradingProvider] auth failed:", msg)
      return null
    }
  }, [])

  useEffect(() => {
    const unsub = client.onConnectionChange(setConnectionState)
    // Auto-connect on mount
    client.connect()
    return () => { unsub() }
  }, [client])

  // Auto-authorize when public WS connects
  useEffect(() => {
    if (connectionState !== "connected") return
    if (authAttemptedRef.current) return // Don't retry on every "connected" event
    authAttemptedRef.current = true

    fetchAuthUrl().then((url) => {
      if (url) client.authorizeWithUrl(url)
    })
  }, [connectionState, client, fetchAuthUrl])

  // Wire up reconnect auth callback so expired OTPs get refreshed
  useEffect(() => {
    client.setReconnectAuthCallback(fetchAuthUrl)
    return () => client.setReconnectAuthCallback(null)
  }, [client, fetchAuthUrl])

  // Subscribe to balance only when authorized (requires login)
  useEffect(() => {
    if (connectionState !== "authorized") return

    const { unsubscribe } = client.subscribeBalance((data: BalanceResponse) => {
      if (data.balance) {
        setBalance(data.balance.balance)
        setCurrency(data.balance.currency)
      }
    })
    balanceUnsubRef.current = unsubscribe

    return () => {
      unsubscribe()
      balanceUnsubRef.current = null
    }
  }, [connectionState, client])

  const connect = useCallback(() => { authAttemptedRef.current = false; client.connect() }, [client])
  const disconnect = useCallback(() => { client.disconnect(); setBalance(null); authAttemptedRef.current = false }, [client])

  const value = useMemo<TradingState>(() => ({
    client,
    connectionState,
    balance,
    currency,
    accountType: "demo",
    accountId,
    authError,
    connect,
    disconnect,
  }), [client, connectionState, balance, currency, accountId, authError, connect, disconnect])

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  )
}

export function useTradingContext(): TradingState {
  const ctx = useContext(TradingContext)
  if (!ctx) {
    throw new Error("useTradingContext must be used within <TradingProvider>")
  }
  return ctx
}
