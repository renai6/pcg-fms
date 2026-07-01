# Orange Theme + Homepage Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift the app's primary color from red to warm amber-orange and apply clean visual polish to the homepage.

**Architecture:** Two independent file edits - theme tokens in `globals.css` (CSS variables only, no component changes needed), and layout polish in `app/page.tsx` (add accent bar, icons, shadow, typography bump). No new dependencies required; `lucide-react` is already installed.

**Tech Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui (radix-nova), lucide-react

---

### Task 1: Update theme tokens to orange

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update `:root` primary tokens**

In `app/globals.css`, replace these lines inside `:root { ... }`:

```css
/* Before */
--primary: oklch(0.525 0.223 3.958);
--primary-foreground: oklch(0.971 0.014 343.198);
--ring: oklch(0.708 0 0);
--sidebar-primary: oklch(0.592 0.249 0.584);
--sidebar-primary-foreground: oklch(0.971 0.014 343.198);
```

```css
/* After */
--primary: oklch(0.703 0.195 48);
--primary-foreground: oklch(0.98 0 0);
--ring: oklch(0.703 0.195 48);
--sidebar-primary: oklch(0.703 0.195 48);
--sidebar-primary-foreground: oklch(0.98 0 0);
```

- [ ] **Step 2: Update `.dark` primary tokens**

In `app/globals.css`, replace these lines inside `.dark { ... }`:

```css
/* Before */
--primary: oklch(0.459 0.187 3.815);
--primary-foreground: oklch(0.971 0.014 343.198);
--ring: oklch(0.556 0 0);
--sidebar-primary: oklch(0.656 0.241 354.308);
--sidebar-primary-foreground: oklch(0.971 0.014 343.198);
```

```css
/* After */
--primary: oklch(0.75 0.18 48);
--primary-foreground: oklch(0.98 0 0);
--ring: oklch(0.75 0.18 48);
--sidebar-primary: oklch(0.75 0.18 48);
--sidebar-primary-foreground: oklch(0.98 0 0);
```

- [ ] **Step 3: Start dev server and verify orange appears**

Run: `pnpm dev`

Navigate to `http://localhost:3000`. The "Start Trip Log" button should be orange (#f97316-ish), not red. Admin sidebar primary color should also be orange.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: shift primary color theme from red to warm amber-orange"
```

---

### Task 2: Polish homepage layout

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the entire file with the polished version**

Replace `app/page.tsx` with:

```tsx
import Link from 'next/link'
import { Navigation, CircleCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-background">
      <div className="text-center">
        <div className="h-1 w-16 bg-primary rounded-full mx-auto mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">PCG Facility Management</h1>
        <p className="text-muted-foreground mt-3 text-base">Vehicle Trip Monitoring System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card className="shadow-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Log a Trip
            </CardTitle>
            <CardDescription>
              Starting a trip? Enter your details to log your departure and receive a trip number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/trip/log">Start Trip Log</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheck className="h-5 w-5 text-primary" />
              Complete a Trip
            </CardTitle>
            <CardDescription>
              Returning from a trip? Enter your trip number to update the status to completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/trip/complete">Complete Trip</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Admin?{' '}
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Sign in here
        </Link>
      </p>
    </main>
  )
}
```

- [ ] **Step 2: Verify in browser**

With dev server still running at `http://localhost:3000`, check:

- Orange accent bar (`h-1 w-16`) appears centered above the title
- Title is visibly larger (`text-4xl` vs previous `text-3xl`)
- Navigation icon appears in orange next to "Log a Trip"
- CircleCheck icon appears in orange next to "Complete a Trip"
- "Log a Trip" card has a faint orange border tint
- Both cards have subtle shadow depth
- "Start Trip Log" button is filled orange; "Complete Trip" button is outline
- Admin sign-in link at bottom is unchanged

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: polish homepage layout with accent bar, icons, and card elevation"
```
