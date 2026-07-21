"use client"

import { FormEvent, Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { MascotCharacter } from "@/components/mascot-icon"
import { safeNextPath } from "@/lib/auth-redirect"
import { supabase } from "@/lib/supabase"

type Mode = "sign-in" | "sign-up"

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  )
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get("next"))
  const callbackError = searchParams.get("error")

  const [mode, setMode] = useState<Mode>("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(callbackError)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setNotice(null)
    setIsGoogleSubmitting(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })

    if (oauthError) {
      setError(oauthError.message)
      setIsGoogleSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setIsSubmitting(true)

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        router.replace(next)
        router.refresh()
        return
      }

      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      })

      if (signUpError) throw signUpError

      if (data.session) {
        router.replace(next)
        router.refresh()
      } else {
        setNotice(
          "Check your email to confirm your account, then return here to sign in."
        )
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Authentication failed. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  return (
    <main className="relative grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute top-5 right-5 z-10">
        <AnimatedThemeToggler className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&>svg]:h-4 [&>svg]:w-4" />
      </div>

      <section className="hidden overflow-hidden bg-primary px-12 py-10 text-primary-foreground lg:flex lg:flex-col">
        <Link href="/" className="font-display text-2xl">
          tickr
        </Link>
        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-xl">
            <MascotCharacter size={72} />
            <h1 className="mt-8 font-display text-5xl leading-[1.08] xl:text-6xl">
              Your trading desk, remembered.
            </h1>
            <p className="mt-6 max-w-lg font-body text-lg leading-relaxed text-primary-foreground/70">
              Sign in to keep your market analysis, signals, and trading
              conversations private and available across devices.
            </p>
          </div>
        </div>
        <p className="font-heading text-xs text-primary-foreground/40">
          Charts, signals, and trades in conversation.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-20 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="font-display text-2xl lg:hidden">
            tickr
          </Link>

          <div className="mt-12 lg:mt-0">
            <p className="font-heading text-xs font-medium tracking-[0.18em] text-accent uppercase">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </p>
            <h2 className="mt-3 font-display text-4xl leading-tight">
              {mode === "sign-in"
                ? "Sign in to continue"
                : "Start your private workspace"}
            </h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
              {mode === "sign-in"
                ? "Your chat history is only visible to your account."
                : "Each account gets its own isolated conversation history."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleSubmitting}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 font-heading text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGoogleSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            <span className="font-heading text-xs text-muted-foreground uppercase">
              or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="font-heading text-sm font-medium">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 font-body text-sm transition-shadow outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="block">
              <span className="font-heading text-sm font-medium">Password</span>
              <input
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "sign-up" ? 8 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "sign-up" ? "At least 8 characters" : "Your password"
                }
                className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 font-body text-sm transition-shadow outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-body text-sm text-red-600 dark:text-red-300"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 font-body text-sm text-foreground"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 font-heading text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-muted-foreground">
            {mode === "sign-in" ? "New to tickr?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(mode === "sign-in" ? "sign-up" : "sign-in")
              }
              className="font-heading font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent"
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
