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
  const balanceUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const unsub = client.onConnectionChange(setConnectionState)
    return () => { unsub() }
  }, [client])

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

  const connect = useCallback(() => { client.connect() }, [client])
  const disconnect = useCallback(() => { client.disconnect(); setBalance(null) }, [client])

  const value = useMemo<TradingState>(() => ({
    client,
    connectionState,
    balance,
    currency,
    accountType: "demo",
    connect,
    disconnect,
  }), [client, connectionState, balance, currency, connect, disconnect])

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
