# Orange Theme + Homepage Polish

**Date:** 2026-07-01
**Status:** Approved

## Goal

Shift the app's primary color from red to warm amber-orange and apply a clean professional polish to the homepage layout - without restructuring it.

## Scope

Two files are touched: `app/globals.css` (theme tokens) and `app/page.tsx` (homepage layout).

## Theme Changes (`app/globals.css`)

Replace the `--primary` token and all related hue-matched tokens from red to warm amber-orange (#f97316, `oklch(0.703 0.195 48)`).

Tokens to update in `:root`:

- `--primary`: `oklch(0.703 0.195 48)`
- `--primary-foreground`: `oklch(0.98 0 0)` (white, unchanged in spirit)
- `--ring`: `oklch(0.703 0.195 48)`
- `--sidebar-primary`: `oklch(0.703 0.195 48)`
- `--sidebar-primary-foreground`: `oklch(0.98 0 0)`

Tokens to update in `.dark`:

- `--primary`: `oklch(0.75 0.18 48)` (slightly lighter for dark bg contrast)
- `--primary-foreground`: `oklch(0.98 0 0)`
- `--ring`: `oklch(0.75 0.18 48)`
- `--sidebar-primary`: `oklch(0.75 0.18 48)`
- `--sidebar-primary-foreground`: `oklch(0.98 0 0)`

No other tokens change.

## Homepage Layout Polish (`app/page.tsx`)

The two-card centered layout is preserved exactly. Changes are purely visual:

**Accent bar** - A `h-1 w-16 bg-primary rounded-full mx-auto` bar is added above the `<h1>` as a brand marker.

**Typography** - `<h1>` bumped from `text-3xl` to `text-4xl`. Subtitle (`<p>`) bumped from default to `text-base` with `mt-3` for slightly more breathing room.

**Card icons** - Lucide icons added inline with each card title:
- "Log a Trip" - `Navigation` icon (`text-primary`)
- "Complete a Trip" - `CircleCheck` icon (`text-primary`)

**Card elevation** - Both cards gain `shadow-sm`. The "Log a Trip" card gains `border-primary/20` to subtly signal it as the primary action.

**Buttons** - No change. "Log a Trip" already uses the filled primary variant (now orange). "Complete a Trip" stays `variant="outline"`.

**Admin link** - No change.

## Out of Scope

- No changes to the login page, admin pages, or trip pages
- No structural layout changes (no hero section, no header bar)
- No new dependencies
