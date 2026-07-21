import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { safeNextPath } from "@/lib/auth-redirect"

function copySessionState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header)
    if (value) target.headers.set(header, value)
  }

  return target
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "trading_game" },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )

          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.getClaims()
  const isAuthenticated = !error && Boolean(data?.claims.sub)
  const { pathname, search } = request.nextUrl

  if (!isAuthenticated && pathname.startsWith("/chat")) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.search = ""
    loginUrl.searchParams.set("next", `${pathname}${search}`)
    return copySessionState(response, NextResponse.redirect(loginUrl))
  }

  if (isAuthenticated && pathname === "/login") {
    const destination = safeNextPath(request.nextUrl.searchParams.get("next"))
    return copySessionState(
      response,
      NextResponse.redirect(new URL(destination, request.url))
    )
  }

  return response
}
