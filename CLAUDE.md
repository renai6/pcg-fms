# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev          # start dev server
pnpm build        # production build
pnpm lint         # run ESLint (flat config, eslint.config.mjs)
pnpm dlx prisma migrate dev    # run migrations
pnpm dlx prisma generate       # regenerate Prisma client
```

No test runner is configured yet.

## Architecture

This is a Next.js 16 / React 19 App Router project. All routes live under `app/`. Server Components are the default; add `"use client"` only when needed.

**UI layer** — shadcn/ui with the `radix-nova` style. Components are generated into `components/ui/`. Add new ones with `pnpm dlx shadcn add <component>`. The `cn()` helper in `lib/utils.ts` merges Tailwind classes.

**Styling** — Tailwind CSS v4. There is no `tailwind.config.*` file; everything is configured in `app/globals.css` via `@theme inline { … }` CSS variables. Design tokens (`--color-primary`, `--radius`, etc.) are defined there.

**Database** — Prisma 7 + MariaDB. Schema is at `prisma/schema.prisma`. The generator is `provider = "prisma-client"` (not the old `prisma-client-js`) and outputs to `generated/prisma/`. Config lives in `prisma.config.ts` and reads `DATABASE_URL` from the environment.

**Path aliases** — `@/` maps to the project root (components at `@/components`, utils at `@/lib/utils`, etc.).

## Key version notes

- **Next.js 16** and **React 19** — APIs and conventions differ significantly from training data. Check `node_modules/next/` source or changelogs before assuming behavior.
- **Tailwind v4** — `@import "tailwindcss"` replaces the old `@tailwind` directives. Class names and plugin APIs changed; verify before use.
- **Prisma 7** — `@prisma/client` import paths and the generated client location (`generated/prisma`) differ from earlier versions.
- **radix-ui v1** — imports come from the `radix-ui` unified package (e.g., `import { Slot } from "radix-ui"`), not individual `@radix-ui/*` packages.
