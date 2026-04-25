import { NextResponse } from "next/server"

const DERIV_REST_URL = "https://api.derivws.com"
const DERIV_APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || "32Z5qZ94Sx9Ev8p73z3eY"

/** Cache the demo account ID — it doesn't change between requests */
let cachedDemoAccountId: string | null = null

export async function GET() {
  const pat = process.env.DERIV_PAT
  if (!pat) {
    return NextResponse.json(
      { error: "DERIV_PAT not configured" },
      { status: 500 }
    )
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pat}`,
    "Deriv-App-ID": DERIV_APP_ID,
  }

  try {
    // 1. Discover demo account ID (cached after first call)
    if (!cachedDemoAccountId) {
      const accountsRes = await fetch(
        `${DERIV_REST_URL}/trading/v1/options/accounts`,
        { headers }
      )

      if (!accountsRes.ok) {
        const text = await accountsRes.text()
        console.error("[deriv-auth] accounts fetch failed:", accountsRes.status, text)
        return NextResponse.json(
          { error: "Failed to fetch Deriv accounts" },
          { status: 502 }
        )
      }

      const accountsData = (await accountsRes.json()) as {
        data: Array<{ account_id: string; account_type: string; status: string }>
      }

      const demoAccount = accountsData.data?.find(
        (a) => a.account_type === "demo" && a.status === "active"
      )

      if (!demoAccount) {
        console.error("[deriv-auth] no active demo account found")
        return NextResponse.json(
          { error: "No demo account found" },
          { status: 502 }
        )
      }

      cachedDemoAccountId = demoAccount.account_id
    }

    // 2. Get OTP → authenticated WebSocket URL
    const otpRes = await fetch(
      `${DERIV_REST_URL}/trading/v1/options/accounts/${cachedDemoAccountId}/otp`,
      { method: "POST", headers }
    )

    if (!otpRes.ok) {
      const text = await otpRes.text()
      console.error("[deriv-auth] OTP fetch failed:", otpRes.status, text)
      // If OTP fails, the cached account ID might be stale — clear it
      cachedDemoAccountId = null
      return NextResponse.json(
        { error: "Failed to generate OTP" },
        { status: 502 }
      )
    }

    const otpData = (await otpRes.json()) as { data: { url: string } }
    const wsUrl = otpData.data.url

    return NextResponse.json({ wsUrl, accountId: cachedDemoAccountId })
  } catch (err) {
    console.error("[deriv-auth] unexpected error:", err)
    return NextResponse.json(
      { error: "Internal error during Deriv auth" },
      { status: 500 }
    )
  }
}
