import gsap from "gsap"

type FlyChipOptions = {
  /** Viewport x of the chip's starting center. */
  fromX: number
  /** Viewport y of the chip's starting center. */
  fromY: number
  /** Viewport x of the chip's destination center. */
  toX: number
  /** Viewport y of the chip's destination center. */
  toY: number
  /** Short label rendered inside the chip (e.g. "1" for a $1 stake). */
  label: string
  /** Tone — accent (orange) by default, or blue for parlay legs. */
  tone?: "accent" | "blue"
}

/**
 * Launch a small circular "chip" that arcs from `(fromX, fromY)` to
 * `(toX, toY)` in viewport space. The chip is a fixed-position DOM node
 * appended to <body>, tweened with GSAP, then removed on complete.
 *
 * Uses a quadratic Bezier approximation via two tweens (translate Y peak +
 * translate X direct) so the chip tosses in a soft arc — cheaper than
 * loading MotionPathPlugin for one animation.
 */
export function flyChip({
  fromX,
  fromY,
  toX,
  toY,
  label,
  tone = "accent",
}: FlyChipOptions) {
  if (typeof document === "undefined") return

  const chip = document.createElement("div")
  chip.textContent = label
  chip.setAttribute("aria-hidden", "true")
  chip.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "z-index:9999",
    "width:28px",
    "height:28px",
    "border-radius:9999px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-family:Styrene A, system-ui, sans-serif",
    "font-size:11px",
    "font-weight:700",
    "pointer-events:none",
    "box-shadow:0 4px 14px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.25) inset",
    tone === "blue"
      ? "background:#6a9bcc;color:#fff"
      : "background:#d97757;color:#fff",
  ].join(";")

  // Center the chip on (fromX, fromY) before painting anything.
  const half = 14
  gsap.set(chip, { x: fromX - half, y: fromY - half, scale: 0.6, opacity: 0 })
  document.body.appendChild(chip)

  const dx = toX - fromX
  const peakY = Math.min(fromY, toY) - 80

  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: () => chip.remove(),
  })

  tl.to(chip, { opacity: 1, scale: 1, duration: 0.15 })
    // Lift phase — go up and forward halfway.
    .to(
      chip,
      {
        x: fromX - half + dx * 0.5,
        y: peakY - half,
        duration: 0.28,
        ease: "power2.out",
      },
      0
    )
    // Drop phase — descend to target with a slight overshoot then ease in.
    .to(chip, {
      x: toX - half,
      y: toY - half,
      duration: 0.32,
      ease: "power2.in",
    })
    // Land — punch scale, fade out.
    .to(chip, { scale: 1.35, duration: 0.12, ease: "back.out(2)" })
    .to(chip, { scale: 0.4, opacity: 0, duration: 0.2, ease: "power2.in" }, ">-0.05")
}
