const SAFE_ORIGIN = "https://tickr.invalid"
const DEFAULT_PATH = "/chat"

export function safeNextPath(value: string | null) {
  if (!value?.startsWith("/")) return DEFAULT_PATH

  try {
    const destination = new URL(value, SAFE_ORIGIN)

    if (
      destination.origin !== SAFE_ORIGIN ||
      destination.pathname === "/login"
    ) {
      return DEFAULT_PATH
    }

    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return DEFAULT_PATH
  }
}
