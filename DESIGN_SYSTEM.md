# Design System Reference

This document defines the typography, colors, spacing, and component patterns used across the application. Use it as a checklist when building new UI components.

---

## Typography

### Font Families

| Role | Font Family | Tailwind Class | Fallback Stack |
|------|-------------|----------------|----------------|
| **Headings** | Styrene A | `font-heading` | system-ui, sans-serif |
| **Body text** | Tiempos Text | `font-body` | ui-serif, Georgia, Cambria, Times New Roman, serif |
| **Display / hero** | Tiempos Headline | `font-display` | ui-serif, Georgia, serif |
| **Sans (alias)** | Styrene A | `font-sans` | system-ui, sans-serif |
| **Serif (alias)** | Tiempos Text | `font-serif` | ui-serif, Georgia, Cambria, serif |
| **Monospace** | System mono | `font-mono` | ui-monospace, Cascadia Code, Source Code Pro, Menlo, Consolas |

### Font Files (`public/fonts/`)

**Styrene A** (static weights):
| Weight | File |
|--------|------|
| 100 Thin | `StyreneA-Thin-Trial.woff2` |
| 300 Light | `StyreneA-Light-Trial.woff2` |
| 300 Light Italic | `StyreneA-LightItalic-Trial.woff2` |
| 400 Regular | `StyreneA-Regular-Trial.woff2` |
| 400 Regular Italic | `StyreneA-RegularItalic-Trial.woff2` |
| 500 Medium | `StyreneA-Medium-Trial.woff2` |
| 500 Medium Italic | `StyreneA-MediumItalic-Trial.woff2` |

**Tiempos** (variable fonts, weight range 100–900):
| Family | Roman | Italic |
|--------|-------|--------|
| Tiempos Text | `test-tiempos-text-vf-roman.woff2` | `test-tiempos-text-vf-italic.woff2` |
| Tiempos Fine | `test-tiempos-fine-vf-roman.woff2` | `test-tiempos-fine-vf-italic.woff2` |
| Tiempos Headline | `test-tiempos-headline-vf-roman.woff2` | `test-tiempos-headline-vf-italic.woff2` |

### Usage Rules

- **Headings** (`h1`–`h6`): Always `font-heading` (Styrene A). Auto-applied via `@layer base` in globals.css.
- **Body / paragraphs**: Always `font-body` (Tiempos Text). Auto-applied to `<body>` and `<html>`.
- **Hero / display text**: Use `font-display` (Tiempos Headline) for large decorative headings (e.g., the chat greeting).
- **UI chrome** (buttons, labels, nav, badges): Use `font-heading` (Styrene A) with `text-sm` or `text-xs`.
- **Monospace** (code blocks, pricing): Use `font-mono`.
- **Preferred heading weight**: `font-medium` (500). Avoid `font-bold` on headings — Styrene A looks best at medium weight.
- **Body text size**: `text-[15px] leading-relaxed` is the standard for chat message text.

---

## Colors

### Brand Palette

| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| Primary Dark | `#141413` | `text-brand-dark` / `bg-brand-dark` | Near-black, primary text in light mode |
| Primary Light | `#faf9f5` | `text-brand-light` / `bg-brand-light` | Warm white, backgrounds in light mode |
| Mid Gray | `#b0aea5` | `text-brand-mid` / `bg-brand-mid` | Muted text, borders, rings |
| Light Gray | `#e8e6dc` | `text-brand-light-gray` / `bg-brand-light-gray` | Borders, secondary backgrounds |
| Accent Orange | `#d97757` | `text-brand-orange` / `bg-brand-orange` | CTA buttons, links, sparkle icon |
| Accent Blue | `#6a9bcc` | `text-brand-blue` / `bg-brand-blue` | Charts, data visualization |
| Accent Green | `#788c5d` | `text-brand-green` / `bg-brand-green` | Charts, positive indicators |

### Semantic Color Tokens

Use these instead of raw hex values. They automatically adapt between light and dark mode.

| Token | Tailwind Class | Light Mode | Dark Mode |
|-------|----------------|------------|-----------|
| `--background` | `bg-background` | `#faf9f5` | `#2b2a27` |
| `--foreground` | `text-foreground` | `#141413` | `#faf9f5` |
| `--card` | `bg-card` | `#ffffff` | `#353431` |
| `--card-foreground` | `text-card-foreground` | `#141413` | `#faf9f5` |
| `--primary` | `bg-primary` | `#141413` | `#faf9f5` |
| `--primary-foreground` | `text-primary-foreground` | `#faf9f5` | `#141413` |
| `--secondary` | `bg-secondary` | `#e8e6dc` | `#3d3c38` |
| `--secondary-foreground` | `text-secondary-foreground` | `#141413` | `#faf9f5` |
| `--muted` | `bg-muted` | `#e8e6dc` | `#3d3c38` |
| `--muted-foreground` | `text-muted-foreground` | `#706f6a` | `#b0aea5` |
| `--accent` | `bg-accent` | `#d97757` | `#ae5630` |
| `--accent-foreground` | `text-accent-foreground` | `#ffffff` | `#faf9f5` |
| `--destructive` | `bg-destructive` | `#c4391c` | `#e05a3a` |
| `--border` | `border-border` | `#e8e6dc` | `rgba(250,249,245,0.1)` |
| `--input` | `bg-input` | `#e8e6dc` | `rgba(250,249,245,0.15)` |
| `--ring` | `ring-ring` | `#b0aea5` | `#706f6a` |

### Chart Colors

Used in Recharts components and data visualization. These are identical in light and dark mode (except chart-5).

| Token | Hex | Purpose |
|-------|-----|---------|
| `--chart-1` | `#d97757` | Primary series (orange) |
| `--chart-2` | `#6a9bcc` | Secondary series (blue) |
| `--chart-3` | `#788c5d` | Tertiary series (green) |
| `--chart-4` | `#b0aea5` | Quaternary series (gray) |
| `--chart-5` | `#141413` / `#faf9f5` | Quinary (dark/light flip) |

### Color Rules

- **Never hardcode hex values** in components. Always use semantic tokens (`bg-background`, `text-foreground`, `border-border`, etc.).
- **Brand colors** (`bg-brand-orange`, etc.) are acceptable for one-off decorative elements but prefer semantic tokens for anything that needs dark mode support.
- **Opacity modifiers**: Use Tailwind's opacity syntax (`text-foreground/80`, `bg-secondary/50`) for subtle variations.

---

## Spacing & Layout

### Border Radius

| Size | Value | Tailwind | Common Usage |
|------|-------|----------|--------------|
| sm | `0.375rem` | `rounded-sm` | Small badges |
| md | `0.5rem` | `rounded-md` | Buttons |
| lg | `0.625rem` | `rounded-lg` | Input fields, small cards |
| xl | `0.875rem` | `rounded-xl` | Cards, code blocks, tables |
| 2xl | `1.125rem` | `rounded-2xl` | Large cards, input containers |
| 3xl | `1.375rem` | `rounded-3xl` | Feature sections |

### Standard Spacing Patterns

- **Page padding**: `px-6 md:px-12 lg:px-20`
- **Max content width**: `max-w-7xl mx-auto` (landing) / `max-w-3xl mx-auto` (chat)
- **Section vertical spacing**: `pt-16 pb-20 md:pt-24 md:pb-28`
- **Card padding**: `p-4` (compact) / `p-5` (standard) / `p-8` (feature cards)
- **Component internal gap**: `gap-2` (tight) / `gap-3` (standard) / `gap-6` (sections)

---

## Component Patterns

### Buttons

- **Primary CTA**: `rounded-full bg-primary px-5 py-2.5 text-sm font-heading font-medium text-primary-foreground`
- **Icon button**: `h-8 w-8 rounded-lg` with `hover:bg-secondary hover:text-foreground`
- **Pill / tag**: `rounded-full border border-border px-4 py-2 font-heading text-sm`

### Cards

- **Standard card**: `rounded-xl border border-border bg-card p-4`
- **Feature card**: `rounded-2xl border border-border bg-card p-8 hover:bg-secondary`
- **Dark feature card**: `rounded-3xl bg-primary text-primary-foreground`
- **Widget card** (charts/tables): `rounded-xl border border-border bg-card` with chart-specific padding

### Input Areas

- **Chat input container**: `rounded-2xl border border-border bg-card shadow-sm` (no `overflow-hidden` — popover children need to escape)
- **Textarea**: `bg-transparent px-5 pt-4 pb-2 font-body text-[15px] focus:outline-none`
- **Toolbar row**: `flex items-center justify-between px-3 pb-3`

### Tables (Markdown & Widget)

- **Container**: `rounded-xl border border-border overflow-x-auto`
- **Header row**: `bg-secondary/50 border-b border-border`
- **Header cells**: `px-4 py-2.5 font-heading text-xs font-medium text-muted-foreground`
- **Body cells**: `px-4 py-2.5 font-body text-sm`
- **Row hover**: `hover:bg-secondary/30`
- **Row dividers**: `border-b border-border last:border-b-0`

### Popovers / Dropdowns

- **Container**: `rounded-xl border border-border bg-card shadow-lg z-50`
- **Position**: `absolute bottom-full mb-2` (opens upward from trigger)
- **Section dividers**: `border-t border-border`
- **Hover state**: `hover:bg-secondary/60 rounded-lg`

### Chat Messages

- **User bubble**: `rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground` (right-aligned)
- **Assistant message**: Left-aligned, no bubble, with "Claude" label in `font-heading text-xs font-medium text-muted-foreground`
- **Message text**: Rendered via `react-markdown` + `remark-gfm` through `<MarkdownRenderer>`
- **Max width**: `max-w-[85%]`

---

## Dark Mode

- Toggled via the `d` key (handled by `ThemeProvider`)
- Applied via `.dark` class on the `<html>` element
- All semantic tokens automatically switch — no conditional logic needed in components
- Use `@custom-variant dark (&:is(.dark *))` for Tailwind dark variant support
- Test every new component in both themes before shipping

---

## Checklist for New Components

- [ ] Uses `font-heading` for labels/titles and `font-body` for content
- [ ] Uses semantic color tokens, not hardcoded hex values
- [ ] Has appropriate `rounded-*` border radius
- [ ] Includes `border border-border` for card-like containers
- [ ] Hover states use `hover:bg-secondary` or `hover:bg-secondary/60`
- [ ] Transitions use `transition-colors` or `transition-opacity`
- [ ] Looks correct in both light and dark mode
- [ ] Responsive: tested at mobile (`px-4`), tablet (`md:px-6`), and desktop (`lg:px-20`)
- [ ] No `overflow-hidden` on containers that have popover/dropdown children
- [ ] Text sizes follow the hierarchy: `text-xs` (labels) → `text-sm` (UI chrome) → `text-[15px]` (body) → `text-lg`+ (headings)
