"use client"

import { useState, useEffect, useRef } from "react"
import type { TradeTicketData } from "@/lib/types"
import { useTradingContext } from "@/hooks/trading-context"
import { getSymbolName, getContractLabel, formatDuration } from "@/lib/deriv/utils"
import type { ProposalResponse, BuyResponse } from "@/lib/deriv/types"
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react"

type TicketState = "pricing" | "confirming" | "executing" | "won" | "lost" | "error"

export function WidgetTradeTicket({ data }: { data: TradeTicketData }) {
  const { symbol, contract_type, amount, duration, duration_unit, barrier } = data
  const { client, connectionState, connect } = useTradingContext()

  const [state, setState] = useState<TicketState>("pricing")
  const [payout, setPayout] = useState<number | null>(null)
  const [askPrice, setAskPrice] = useState<number | null>(null)
  const [proposalId, setProposalId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ pnl: number; soldFor: number } | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  // Auto-connect and subscribe to proposal
  useEffect(() => {
    if (connectionState === "disconnected") {
      connect()
      return
    }
    if (connectionState !== "connected" && connectionState !== "authorized") return

    const { unsubscribe } = client.subscribeProposal(
      {
        symbol,
        contractType: contract_type,
        amount,
        duration,
        durationUnit: duration_unit,
        barrier,
      },
      (response: ProposalResponse) => {
        if (response.error) {
          setError(response.error.message)
          setState("error")
          return
        }
        if (response.proposal) {
          setProposalId(response.proposal.id)
          setPayout(response.proposal.payout)
          setAskPrice(response.proposal.ask_price)
        }
      }
    )
    unsubRef.current = unsubscribe

    return () => {
      unsubscribe()
      unsubRef.current = null
    }
  }, [connectionState, client, connect, symbol, contract_type, amount, duration, duration_unit, barrier])

  async function handleConfirm() {
    if (!proposalId || !askPrice) return

    setState("executing")
    // Unsubscribe from proposal stream
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    try {
      const buyResult = (await client.buy(proposalId, askPrice)) as BuyResponse
      if (buyResult.error) {
        setError(buyResult.error.message)
        setState("error")
        return
      }

      if (buyResult.buy) {
        const buyPrice = buyResult.buy.buy_price
        const paidPayout = buyResult.buy.payout

        // For instant-result contracts (ticks), the result is immediate
        // For longer contracts, we'd need to subscribe to proposal_open_contract
        // For now, show as pending and the user can check portfolio
        if (paidPayout > buyPrice) {
          setResult({ pnl: paidPayout - buyPrice, soldFor: paidPayout })
          setState("won")
        } else {
          // Contract is open — show success state
          setResult({ pnl: 0, soldFor: 0 })
          setState("won") // "Purchased" state
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed")
      setState("error")
    }
  }

  const isRise = contract_type === "CALL" || contract_type === "MULTUP"
  const DirectionIcon = isRise ? ArrowUpCircle : ArrowDownCircle
  const directionColor = isRise ? "text-green-500" : "text-red-500"
  const payoutPct = payout && askPrice ? (((payout - askPrice) / askPrice) * 100).toFixed(0) : null

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <DirectionIcon className={`h-5 w-5 ${directionColor}`} />
        <div>
          <h3 className="font-heading text-sm font-semibold">
            {getContractLabel(contract_type)} &middot; {getSymbolName(symbol)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatDuration(duration, duration_unit)}
            {barrier ? ` | Barrier: ${barrier}` : ""}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {state === "pricing" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stake</span>
              <span className="font-medium">${amount.toFixed(2)}</span>
            </div>
            {askPrice !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">${askPrice.toFixed(2)}</span>
              </div>
            )}
            {payout !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Payout</span>
                <span className="font-medium text-green-500">
                  ${payout.toFixed(2)}
                  {payoutPct && <span className="ml-1 text-xs">({payoutPct}%)</span>}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirm}
                disabled={!proposalId}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white transition-colors ${
                  isRise
                    ? "bg-green-600 hover:bg-green-700 disabled:bg-green-600/50"
                    : "bg-red-600 hover:bg-red-700 disabled:bg-red-600/50"
                } disabled:cursor-not-allowed`}
              >
                {proposalId ? "Confirm Trade" : "Loading price..."}
              </button>
              <button
                onClick={() => setState("error")}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Trading binary options involves substantial risk of loss.
            </p>
          </div>
        )}

        {state === "executing" && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Executing trade...</span>
          </div>
        )}

        {state === "won" && result && (
          <div className="flex flex-col items-center gap-2 py-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="font-heading text-sm font-semibold text-green-500">
              Trade Purchased!
            </p>
            {result.pnl > 0 && (
              <p className="text-xs text-muted-foreground">
                Payout: ${result.soldFor.toFixed(2)} (+${result.pnl.toFixed(2)})
              </p>
            )}
          </div>
        )}

        {state === "lost" && (
          <div className="flex flex-col items-center gap-2 py-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <p className="font-heading text-sm font-semibold text-red-500">Trade Lost</p>
            <p className="text-xs text-muted-foreground">
              Stake of ${amount.toFixed(2)} was lost
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-2 py-3">
            <XCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error ?? "Trade cancelled"}</p>
          </div>
        )}
      </div>
    </div>
  )
}
