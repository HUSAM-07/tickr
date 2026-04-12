"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
  const clientRef = useRef(getDerivClient())
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [balance, setBalance] = useState<number | null>(null)
  const [currency, setCurrency] = useState("USD")
  const balanceUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const client = clientRef.current
    const unsub = client.onConnectionChange((state) => {
      setConnectionState(state)
    })

    return () => {
      unsub()
    }
  }, [])

  // Subscribe to balance only when authorized (requires login)
  useEffect(() => {
    const client = clientRef.current
    if (connectionState === "authorized") {
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
    }
  }, [connectionState])

  const connect = useCallback(() => {
    clientRef.current.connect()
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current.disconnect()
    setBalance(null)
  }, [])

  return (
    <TradingContext.Provider
      value={{
        client: clientRef.current,
        connectionState,
        balance,
        currency,
        accountType: "demo", // Phase 5 will add real account support
        connect,
        disconnect,
      }}
    >
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
