import { NextResponse } from "next/server"
import { safeNextPath } from "@/lib/auth-redirect"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const response = NextResponse.redirect(new URL(next, url.origin))
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }
  }

  const loginUrl = new URL("/login", url.origin)
  loginUrl.searchParams.set(
    "error",
    "The sign-in link is invalid or has expired. Please try again."
  )
  return NextResponse.redirect(loginUrl)
}
