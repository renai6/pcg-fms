# PCG Facility Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack facility management system with vehicle trip monitoring, admin dashboard, and personnel management.

**Architecture:** Next.js 16 App Router with Server Components for admin data reads and Client Components for interactive forms and tables. A custom JWT auth layer (jose + bcryptjs) secures admin routes via middleware. Prisma 7 + MariaDB handles persistence via the `@prisma/adapter-mariadb` driver adapter. Admin table mutations use client-side fetch to API routes followed by `router.refresh()` to re-run Server Components.

**Tech Stack:** Next.js 16, React 19, Prisma 7 + MariaDB (`@prisma/adapter-mariadb`), Tailwind v4, shadcn/ui (radix-nova), jose, bcryptjs

**Note on testing:** No test runner is configured. Verification steps use `pnpm build` (TypeScript compilation + Next.js build check).

---

## File Map

| Path | Role |
|---|---|
| `prisma/schema.prisma` | Data models: Personnel, Vehicle, Trip |
| `prisma/seed.ts` | Default admin account seeder |
| `lib/prisma.ts` | Prisma client singleton with MariaDB adapter |
| `lib/auth.ts` | JWT sign/verify, bcrypt helpers, session type, getSession() |
| `middleware.ts` | Protect /admin/* routes via JWT cookie verification |
| `app/api/auth/login/route.ts` | POST: verify credentials, set fms_session cookie |
| `app/api/auth/logout/route.ts` | POST: clear fms_session cookie |
| `app/api/trips/route.ts` | POST: create trip (public) |
| `app/api/trips/[tripNumber]/route.ts` | GET: lookup trip, PATCH: complete trip (both public) |
| `app/api/vehicles/route.ts` | GET: list with occupation status; POST: create (admin) |
| `app/api/vehicles/[id]/route.ts` | PATCH: update (admin), DELETE: remove (admin) |
| `app/api/personnel/route.ts` | GET: list (admin), POST: create (admin) |
| `app/api/personnel/[id]/route.ts` | PATCH: update (admin), DELETE: remove (admin) |
| `app/page.tsx` | Home — links to log/complete trip |
| `app/login/page.tsx` | Admin login form (client) |
| `app/trip/log/page.tsx` | Public trip log page shell (server) |
| `app/trip/complete/page.tsx` | Public trip complete page shell (server) |
| `app/admin/layout.tsx` | Admin shell — reads session, renders sidebar |
| `app/admin/page.tsx` | Dashboard with summary stats (server) |
| `app/admin/vehicles/page.tsx` | Vehicle list + status (server → client table) |
| `app/admin/vehicles/[id]/page.tsx` | Vehicle detail + trip history (server) |
| `app/admin/trips/page.tsx` | Full trip log with filters (server + client filters) |
| `app/admin/personnel/page.tsx` | Personnel list (server → client table) |
| `components/admin/sidebar.tsx` | Sidebar nav with active state (client) |
| `components/admin/vehicles-table.tsx` | Vehicles table with add/edit/delete modals (client) |
| `components/admin/personnel-table.tsx` | Personnel table with add/edit/delete modals (client) |
| `components/admin/trip-filters.tsx` | Trip filter controls (client) |
| `components/trip/log-form.tsx` | Trip log form — fetches vehicles, submits (client) |
| `components/trip/complete-form.tsx` | Trip complete form — lookup + submit (client) |

---

## Task 1: Prisma Schema + Environment Setup

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env` (add JWT_SECRET)
- Modify: `package.json` (add prisma seed config)

- [ ] **Step 1: Add JWT_SECRET to .env**

Open `.env` and add:
```
JWT_SECRET=replace_this_with_a_long_random_string_at_least_32_chars
```

Generate a real secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

- [ ] **Step 2: Replace prisma/schema.prisma with full schema**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mysql"
}

enum TripStatus {
  ONGOING
  COMPLETED
}

model Personnel {
  id             Int      @id @default(autoincrement())
  employeeNumber String   @unique
  firstName      String
  lastName       String
  rank           String
  office         String
  contactNumber  String
  isAdmin        Boolean  @default(false)
  passwordHash   String?
  createdAt      DateTime @default(now())
  trips          Trip[]
}

model Vehicle {
  id          Int      @id @default(autoincrement())
  plateNumber String   @unique
  name        String
  type        String
  createdAt   DateTime @default(now())
  trips       Trip[]
}

model Trip {
  id              Int        @id @default(autoincrement())
  tripNumber      String     @unique
  vehicleId       Int
  vehicle         Vehicle    @relation(fields: [vehicleId], references: [id])
  personnelId     Int
  personnel       Personnel  @relation(fields: [personnelId], references: [id])
  startTime       DateTime
  startOdometer   Float
  startGasPercent Float
  endTime         DateTime?
  endOdometer     Float?
  endGasPercent   Float?
  status          TripStatus @default(ONGOING)
  createdAt       DateTime   @default(now())
}
```

- [ ] **Step 3: Add prisma seed config to package.json**

Add inside the root JSON object of `package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 4: Run migration**

```bash
pnpm dlx prisma migrate dev --name init
```

Expected: migration files created in `prisma/migrations/`, no errors.

- [ ] **Step 5: Regenerate Prisma client**

```bash
pnpm dlx prisma generate
```

Expected: `Generated Prisma Client` message, `generated/prisma/` folder populated.

---

## Task 2: Install New Dependencies

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add jose bcryptjs tsx
```

- [ ] **Step 2: Install type definitions**

```bash
pnpm add -D @types/bcryptjs
```

- [ ] **Step 3: Verify install**

```bash
pnpm build 2>&1 | head -20
```

Expected: may fail on missing files — that's fine. What must NOT appear: `Cannot find module 'jose'` or `Cannot find module 'bcryptjs'`.

---

## Task 3: Prisma Client Singleton + Auth Utilities

**Files:**
- Create: `lib/prisma.ts`
- Create: `lib/auth.ts`

- [ ] **Step 1: Create lib/prisma.ts**

```typescript
import { PrismaClient } from '@/generated/prisma'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 2: Create lib/auth.ts**

```typescript
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'

export interface SessionPayload {
  id: number
  employeeNumber: string
  firstName: string
  lastName: string
}

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!)
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get('fms_session')?.value
  if (!token) return null
  return verifyToken(token)
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS|Cannot find"
```

Expected: no errors related to `lib/prisma.ts` or `lib/auth.ts`.

---

## Task 4: Seed Script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create prisma/seed.ts**

```typescript
import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma'
import bcrypt from 'bcryptjs'

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = 'admin123'
  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.personnel.upsert({
    where: { employeeNumber: 'ADMIN001' },
    update: {},
    create: {
      employeeNumber: 'ADMIN001',
      firstName: 'System',
      lastName: 'Admin',
      rank: 'Administrator',
      office: 'IT',
      contactNumber: '000-0000',
      isAdmin: true,
      passwordHash,
    },
  })

  console.log('✓ Default admin created:')
  console.log('  Employee Number: ADMIN001')
  console.log('  Password:        admin123')
  console.log('  → Change this password immediately after first login.')
  console.log(`  ID: ${admin.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the seed**

```bash
pnpm dlx prisma db seed
```

Expected output:
```
✓ Default admin created:
  Employee Number: ADMIN001
  Password:        admin123
  → Change this password immediately after first login.
```

---

## Task 5: Middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create middleware.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('fms_session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifyToken(token)
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error TS|Cannot find"
```

Expected: no TypeScript errors in `middleware.ts`.

- [ ] **Step 3: Commit foundation**

```bash
git add prisma/schema.prisma prisma/seed.ts lib/prisma.ts lib/auth.ts middleware.ts package.json .env
git commit -m "feat: add Prisma schema, auth utilities, and middleware"
```

---

## Task 6: Auth API Routes

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Create app/api/auth/login/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { employeeNumber, password } = body as { employeeNumber: string; password: string }

  if (!employeeNumber || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const personnel = await prisma.personnel.findUnique({ where: { employeeNumber } })

  if (!personnel || !personnel.isAdmin || !personnel.passwordHash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, personnel.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({
    id: personnel.id,
    employeeNumber: personnel.employeeNumber,
    firstName: personnel.firstName,
    lastName: personnel.lastName,
  })

  const response = NextResponse.json({ success: true })
  response.cookies.set('fms_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
```

- [ ] **Step 2: Create app/api/auth/logout/route.ts**

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('fms_session', '', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return response
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/
git commit -m "feat: add auth API routes (login/logout)"
```

---

## Task 7: Trip API Routes

**Files:**
- Create: `app/api/trips/route.ts`
- Create: `app/api/trips/[tripNumber]/route.ts`

- [ ] **Step 1: Create app/api/trips/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { employeeNumber, vehicleId, startTime, startOdometer, startGasPercent } = body as {
    employeeNumber: string
    vehicleId: number
    startTime: string
    startOdometer: number
    startGasPercent: number
  }

  if (!employeeNumber || !vehicleId || !startTime || startOdometer == null || startGasPercent == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (Number(startGasPercent) < 0 || Number(startGasPercent) > 100) {
    return NextResponse.json({ error: 'Gas percent must be between 0 and 100' }, { status: 400 })
  }

  const personnel = await prisma.personnel.findUnique({ where: { employeeNumber } })
  if (!personnel) {
    return NextResponse.json({ error: 'Employee number not found' }, { status: 404 })
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const activeTrip = await prisma.trip.findFirst({
    where: { vehicleId: Number(vehicleId), status: 'ONGOING' },
  })
  if (activeTrip) {
    return NextResponse.json({ error: 'Vehicle is currently on an active trip' }, { status: 409 })
  }

  const trip = await prisma.$transaction(async (tx) => {
    const count = await tx.trip.count()
    const tripNumber = `TRP-${String(count + 1).padStart(5, '0')}`
    return tx.trip.create({
      data: {
        tripNumber,
        vehicleId: Number(vehicleId),
        personnelId: personnel.id,
        startTime: new Date(startTime),
        startOdometer: Number(startOdometer),
        startGasPercent: Number(startGasPercent),
        status: 'ONGOING',
      },
    })
  })

  return NextResponse.json({ tripNumber: trip.tripNumber }, { status: 201 })
}
```

- [ ] **Step 2: Create app/api/trips/[tripNumber]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripNumber: string }> }
) {
  const { tripNumber } = await params

  const trip = await prisma.trip.findUnique({
    where: { tripNumber },
    include: {
      vehicle: { select: { plateNumber: true, name: true } },
      personnel: { select: { firstName: true, lastName: true, employeeNumber: true } },
    },
  })

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }
  if (trip.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Trip already completed' }, { status: 409 })
  }

  return NextResponse.json(trip)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripNumber: string }> }
) {
  const { tripNumber } = await params
  const body = await request.json()
  const { endTime, endOdometer, endGasPercent } = body as {
    endTime: string
    endOdometer: number
    endGasPercent: number
  }

  if (!endTime || endOdometer == null || endGasPercent == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const trip = await prisma.trip.findUnique({ where: { tripNumber } })
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }
  if (trip.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Trip already completed' }, { status: 409 })
  }

  if (Number(endOdometer) < trip.startOdometer) {
    return NextResponse.json({ error: 'End odometer must be ≥ start odometer' }, { status: 400 })
  }
  if (new Date(endTime) <= trip.startTime) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  }
  if (Number(endGasPercent) < 0 || Number(endGasPercent) > 100) {
    return NextResponse.json({ error: 'Gas percent must be between 0 and 100' }, { status: 400 })
  }

  const updated = await prisma.trip.update({
    where: { tripNumber },
    data: {
      endTime: new Date(endTime),
      endOdometer: Number(endOdometer),
      endGasPercent: Number(endGasPercent),
      status: 'COMPLETED',
    },
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/trips/
git commit -m "feat: add trip API routes (create/lookup/complete)"
```

---

## Task 8: Vehicle API Routes

**Files:**
- Create: `app/api/vehicles/route.ts`
- Create: `app/api/vehicles/[id]/route.ts`

- [ ] **Step 1: Create app/api/vehicles/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'ONGOING' },
        select: {
          id: true,
          personnel: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(
    vehicles.map((v) => ({
      id: v.id,
      plateNumber: v.plateNumber,
      name: v.name,
      type: v.type,
      createdAt: v.createdAt,
      isOccupied: v.trips.length > 0,
      currentDriver: v.trips[0]?.personnel
        ? `${v.trips[0].personnel.firstName} ${v.trips[0].personnel.lastName}`
        : null,
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { plateNumber, name, type } = body as { plateNumber: string; name: string; type: string }

  if (!plateNumber || !name || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.vehicle.findUnique({ where: { plateNumber } })
  if (existing) {
    return NextResponse.json({ error: 'Plate number already exists' }, { status: 409 })
  }

  const vehicle = await prisma.vehicle.create({ data: { plateNumber, name, type } })
  return NextResponse.json(vehicle, { status: 201 })
}
```

- [ ] **Step 2: Create app/api/vehicles/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { plateNumber, name, type } = body as { plateNumber: string; name: string; type: string }

  const vehicle = await prisma.vehicle.update({
    where: { id: Number(id) },
    data: { plateNumber, name, type },
  })
  return NextResponse.json(vehicle)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const activeTrip = await prisma.trip.findFirst({
    where: { vehicleId: Number(id), status: 'ONGOING' },
  })
  if (activeTrip) {
    return NextResponse.json({ error: 'Cannot delete a vehicle with an active trip' }, { status: 409 })
  }

  await prisma.vehicle.delete({ where: { id: Number(id) } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/vehicles/
git commit -m "feat: add vehicle API routes"
```

---

## Task 9: Personnel API Routes

**Files:**
- Create: `app/api/personnel/route.ts`
- Create: `app/api/personnel/[id]/route.ts`

- [ ] **Step 1: Create app/api/personnel/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hashPassword } from '@/lib/auth'

const personnelSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  rank: true,
  office: true,
  contactNumber: true,
  isAdmin: true,
  createdAt: true,
}

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const personnel = await prisma.personnel.findMany({
    select: personnelSelect,
    orderBy: { lastName: 'asc' },
  })
  return NextResponse.json(personnel)
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { employeeNumber, firstName, lastName, rank, office, contactNumber, isAdmin, password } =
    body as {
      employeeNumber: string
      firstName: string
      lastName: string
      rank: string
      office: string
      contactNumber: string
      isAdmin: boolean
      password?: string
    }

  if (!employeeNumber || !firstName || !lastName || !rank || !office || !contactNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (isAdmin && !password) {
    return NextResponse.json({ error: 'Password required for admin accounts' }, { status: 400 })
  }

  const existing = await prisma.personnel.findUnique({ where: { employeeNumber } })
  if (existing) {
    return NextResponse.json({ error: 'Employee number already exists' }, { status: 409 })
  }

  const passwordHash = isAdmin && password ? await hashPassword(password) : null

  const personnel = await prisma.personnel.create({
    data: { employeeNumber, firstName, lastName, rank, office, contactNumber, isAdmin: !!isAdmin, passwordHash },
    select: personnelSelect,
  })
  return NextResponse.json(personnel, { status: 201 })
}
```

- [ ] **Step 2: Create app/api/personnel/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hashPassword } from '@/lib/auth'

const personnelSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  rank: true,
  office: true,
  contactNumber: true,
  isAdmin: true,
  createdAt: true,
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { employeeNumber, firstName, lastName, rank, office, contactNumber, isAdmin, password } =
    body as {
      employeeNumber: string
      firstName: string
      lastName: string
      rank: string
      office: string
      contactNumber: string
      isAdmin: boolean
      password?: string
    }

  const updateData: Record<string, unknown> = {
    employeeNumber,
    firstName,
    lastName,
    rank,
    office,
    contactNumber,
    isAdmin: !!isAdmin,
  }

  if (isAdmin && password) {
    updateData.passwordHash = await hashPassword(password)
  } else if (!isAdmin) {
    updateData.passwordHash = null
  }

  const personnel = await prisma.personnel.update({
    where: { id: Number(id) },
    data: updateData,
    select: personnelSelect,
  })
  return NextResponse.json(personnel)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const numId = Number(id)

  if (session.id === numId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 409 })
  }

  await prisma.personnel.delete({ where: { id: numId } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/personnel/
git commit -m "feat: add personnel API routes"
```

---

## Task 10: Install shadcn UI Components

**Files:** `components/ui/` (generated by shadcn CLI)

- [ ] **Step 1: Install required components**

```bash
pnpm dlx shadcn add input label card badge dialog select separator table
```

Answer any prompts with the defaults. This generates files in `components/ui/`.

- [ ] **Step 2: Verify components exist**

```bash
ls components/ui/
```

Expected: `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`, `select.tsx`, `separator.tsx`, `table.tsx` (and any dependencies).

- [ ] **Step 3: Commit**

```bash
git add components/ui/
git commit -m "feat: add shadcn UI components"
```

---

## Task 11: Home Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```typescript
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">PCG Facility Management</h1>
        <p className="text-muted-foreground mt-2">Vehicle Trip Monitoring System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Log a Trip</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Complete a Trip</CardTitle>
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

- [ ] **Step 2: Update metadata in app/layout.tsx**

Change the `metadata` object:
```typescript
export const metadata: Metadata = {
  title: 'PCG Facility Management System',
  description: 'Vehicle trip monitoring and personnel management',
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: add home page"
```

---

## Task 12: Trip Log Page + Form Component

**Files:**
- Create: `components/trip/log-form.tsx`
- Create: `app/trip/log/page.tsx`

- [ ] **Step 1: Create components/trip/log-form.tsx**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Vehicle {
  id: number
  plateNumber: string
  name: string
  type: string
  isOccupied: boolean
}

export function LogForm() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [tripNumber, setTripNumber] = useState('')

  const [form, setForm] = useState({
    employeeNumber: '',
    vehicleId: '',
    startTime: '',
    startOdometer: '',
    startGasPercent: '',
  })

  useEffect(() => {
    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((data: Vehicle[]) => {
        setVehicles(data.filter((v) => !v.isOccupied))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeNumber: form.employeeNumber,
        vehicleId: Number(form.vehicleId),
        startTime: form.startTime,
        startOdometer: Number(form.startOdometer),
        startGasPercent: Number(form.startGasPercent),
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    setTripNumber(data.tripNumber)
  }

  if (tripNumber) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Trip Logged Successfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Your trip number is:</p>
          <p className="text-4xl font-bold tracking-widest text-center py-4 bg-muted rounded-lg">
            {tripNumber}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Please note this number. You will need it to complete your trip upon return.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setTripNumber('')
              setForm({ employeeNumber: '', vehicleId: '', startTime: '', startOdometer: '', startGasPercent: '' })
            }}
          >
            Log Another Trip
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Log a Trip</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="employeeNumber">Employee Number</Label>
            <Input
              id="employeeNumber"
              placeholder="e.g. EMP001"
              value={form.employeeNumber}
              onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="vehicle">Vehicle</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading vehicles...</p>
            ) : (
              <Select
                value={form.vehicleId}
                onValueChange={(val) => setForm({ ...form, vehicleId: val })}
                required
              >
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <SelectItem value="-" disabled>No vehicles available</SelectItem>
                  ) : (
                    vehicles.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} — {v.plateNumber} ({v.type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="startTime">Departure Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="startOdometer">Start Odometer (km)</Label>
            <Input
              id="startOdometer"
              type="number"
              min={0}
              step={0.1}
              placeholder="e.g. 12500"
              value={form.startOdometer}
              onChange={(e) => setForm({ ...form, startOdometer: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="startGasPercent">Fuel Level (%)</Label>
            <Input
              id="startGasPercent"
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="0 – 100"
              value={form.startGasPercent}
              onChange={(e) => setForm({ ...form, startGasPercent: e.target.value })}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !form.vehicleId}>
            {submitting ? 'Logging trip...' : 'Log Trip & Get Trip Number'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create app/trip/log/page.tsx**

```typescript
import { LogForm } from '@/components/trip/log-form'
import Link from 'next/link'

export default function TripLogPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background">
      <LogForm />
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        ← Back to home
      </Link>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/trip/log-form.tsx app/trip/log/page.tsx
git commit -m "feat: add trip log page"
```

---

## Task 13: Trip Complete Page + Form Component

**Files:**
- Create: `components/trip/complete-form.tsx`
- Create: `app/trip/complete/page.tsx`

- [ ] **Step 1: Create components/trip/complete-form.tsx**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface TripDetails {
  id: number
  tripNumber: string
  startTime: string
  startOdometer: number
  startGasPercent: number
  vehicle: { plateNumber: string; name: string }
  personnel: { firstName: string; lastName: string; employeeNumber: string }
}

export function CompleteForm() {
  const [lookupNumber, setLookupNumber] = useState('')
  const [trip, setTrip] = useState<TripDetails | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [looking, setLooking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    endTime: '',
    endOdometer: '',
    endGasPercent: '',
  })

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLookupError('')
    setTrip(null)
    setLooking(true)

    const res = await fetch(`/api/trips/${lookupNumber.trim().toUpperCase()}`)
    const data = await res.json()
    setLooking(false)

    if (!res.ok) {
      setLookupError(data.error ?? 'Trip not found')
      return
    }

    setTrip(data)
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (!trip) return
    setSubmitError('')
    setSubmitting(true)

    const res = await fetch(`/api/trips/${trip.tripNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endTime: form.endTime,
        endOdometer: Number(form.endOdometer),
        endGasPercent: Number(form.endGasPercent),
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setSubmitError(data.error ?? 'Something went wrong')
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Trip Completed</CardTitle>
          <CardDescription>
            Trip {trip?.tripNumber} has been marked as completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setDone(false)
              setTrip(null)
              setLookupNumber('')
              setForm({ endTime: '', endOdometer: '', endGasPercent: '' })
            }}
          >
            Complete Another Trip
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete a Trip</CardTitle>
          <CardDescription>Enter your trip number to look up the trip.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-2">
            <Input
              placeholder="e.g. TRP-00001"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              required
            />
            <Button type="submit" disabled={looking}>
              {looking ? 'Looking up...' : 'Look Up'}
            </Button>
          </form>
          {lookupError && <p className="text-sm text-destructive mt-2">{lookupError}</p>}
        </CardContent>
      </Card>

      {trip && (
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Trip Number</span>
              <span className="font-medium">{trip.tripNumber}</span>
              <span className="text-muted-foreground">Vehicle</span>
              <span>{trip.vehicle.name} ({trip.vehicle.plateNumber})</span>
              <span className="text-muted-foreground">Driver</span>
              <span>{trip.personnel.firstName} {trip.personnel.lastName}</span>
              <span className="text-muted-foreground">Departure</span>
              <span>{new Date(trip.startTime).toLocaleString()}</span>
              <span className="text-muted-foreground">Start Odometer</span>
              <span>{trip.startOdometer} km</span>
              <span className="text-muted-foreground">Start Fuel</span>
              <span>{trip.startGasPercent}%</span>
            </div>

            <Separator />

            <form onSubmit={handleComplete} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="endTime">Arrival Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endOdometer">End Odometer (km)</Label>
                <Input
                  id="endOdometer"
                  type="number"
                  min={trip.startOdometer}
                  step={0.1}
                  placeholder={`≥ ${trip.startOdometer}`}
                  value={form.endOdometer}
                  onChange={(e) => setForm({ ...form, endOdometer: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endGasPercent">End Fuel Level (%)</Label>
                <Input
                  id="endGasPercent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="0 – 100"
                  value={form.endGasPercent}
                  onChange={(e) => setForm({ ...form, endGasPercent: e.target.value })}
                  required
                />
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Completing...' : 'Mark as Completed'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create app/trip/complete/page.tsx**

```typescript
import { CompleteForm } from '@/components/trip/complete-form'
import Link from 'next/link'

export default function TripCompletePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background">
      <CompleteForm />
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        ← Back to home
      </Link>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/trip/complete-form.tsx app/trip/complete/page.tsx
git commit -m "feat: add trip complete page"
```

---

## Task 14: Login Page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create app/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ employeeNumber: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>PCG Facility Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="employeeNumber">Employee Number</Label>
              <Input
                id="employeeNumber"
                placeholder="e.g. ADMIN001"
                value={form.employeeNumber}
                onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add admin login page"
```

---

## Task 15: Admin Layout + Sidebar

**Files:**
- Create: `components/admin/sidebar.tsx`
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Create components/admin/sidebar.tsx**

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/vehicles', label: 'Vehicles' },
  { href: '/admin/trips', label: 'Trips' },
  { href: '/admin/personnel', label: 'Personnel' },
]

interface SidebarProps {
  userName: string
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r bg-sidebar min-h-screen">
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground">PCG Facility Management</p>
        <p className="text-sm font-medium truncate mt-0.5">{userName}</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create app/admin/layout.tsx**

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { Sidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('fms_session')?.value
  const session = token ? await verifyToken(token) : null

  if (!session) redirect('/login')

  const userName = `${session.firstName} ${session.lastName}`

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={userName} />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/sidebar.tsx app/admin/layout.tsx
git commit -m "feat: add admin layout and sidebar"
```

---

## Task 16: Admin Dashboard

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create app/admin/page.tsx**

```typescript
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function getStats() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [totalVehicles, occupiedVehicles, tripsToday, totalPersonnel] = await Promise.all([
    prisma.vehicle.count(),
    prisma.trip.count({ where: { status: 'ONGOING' } }),
    prisma.trip.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.personnel.count(),
  ])

  return { totalVehicles, occupiedVehicles, tripsToday, totalPersonnel }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  const cards = [
    { title: 'Total Vehicles', value: stats.totalVehicles },
    { title: 'Currently Occupied', value: stats.occupiedVehicles },
    { title: 'Trips Today', value: stats.tripsToday },
    { title: 'Total Personnel', value: stats.totalPersonnel },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin dashboard"
```

---

## Task 17: Admin Vehicles Page + Table Component

**Files:**
- Create: `components/admin/vehicles-table.tsx`
- Create: `app/admin/vehicles/page.tsx`

- [ ] **Step 1: Create components/admin/vehicles-table.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

interface Vehicle {
  id: number
  plateNumber: string
  name: string
  type: string
  isOccupied: boolean
  currentDriver: string | null
}

interface VehiclesTableProps {
  vehicles: Vehicle[]
}

const emptyForm = { plateNumber: '', name: '', type: '' }

export function VehiclesTable({ vehicles }: VehiclesTableProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setAddOpen(true)
  }

  function openEdit(v: Vehicle) {
    setForm({ plateNumber: v.plateNumber, name: v.name, type: v.type })
    setError('')
    setEditVehicle(v)
  }

  async function handleAdd() {
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to add vehicle'); return }
    setAddOpen(false)
    router.refresh()
  }

  async function handleEdit() {
    if (!editVehicle) return
    setError('')
    setSubmitting(true)
    const res = await fetch(`/api/vehicles/${editVehicle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update vehicle'); return }
    setEditVehicle(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteVehicle) return
    setSubmitting(true)
    const res = await fetch(`/api/vehicles/${deleteVehicle.id}`, { method: 'DELETE' })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to delete vehicle'); return }
    setDeleteVehicle(null)
    router.refresh()
  }

  const VehicleForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Plate Number</Label>
        <Input
          placeholder="e.g. ABC 123"
          value={form.plateNumber}
          onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          placeholder="e.g. Service Van 1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Type</Label>
        <Input
          placeholder="e.g. Van, Truck, Sedan"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <Button onClick={openAdd}>Add Vehicle</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Driver</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No vehicles yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/vehicles/${v.id}`} className="hover:underline">
                      {v.plateNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.type}</TableCell>
                  <TableCell>
                    <Badge variant={v.isOccupied ? 'default' : 'secondary'}>
                      {v.isOccupied ? 'Occupied' : 'Available'}
                    </Badge>
                  </TableCell>
                  <TableCell>{v.currentDriver ?? '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteVehicle(v)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editVehicle} onOpenChange={(o) => !o && setEditVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVehicle(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteVehicle} onOpenChange={(o) => !o && setDeleteVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteVehicle?.name} ({deleteVehicle?.plateNumber})</strong>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVehicle(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Create app/admin/vehicles/page.tsx**

```typescript
import { prisma } from '@/lib/prisma'
import { VehiclesTable } from '@/components/admin/vehicles-table'

async function getVehicles() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'ONGOING' },
        select: {
          personnel: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return vehicles.map((v) => ({
    id: v.id,
    plateNumber: v.plateNumber,
    name: v.name,
    type: v.type,
    isOccupied: v.trips.length > 0,
    currentDriver: v.trips[0]?.personnel
      ? `${v.trips[0].personnel.firstName} ${v.trips[0].personnel.lastName}`
      : null,
  }))
}

export default async function VehiclesPage() {
  const vehicles = await getVehicles()
  return (
    <div className="p-6">
      <VehiclesTable vehicles={vehicles} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/vehicles-table.tsx app/admin/vehicles/page.tsx
git commit -m "feat: add admin vehicles page"
```

---

## Task 18: Admin Vehicle Detail Page

**Files:**
- Create: `app/admin/vehicles/[id]/page.tsx`

- [ ] **Step 1: Create app/admin/vehicles/[id]/page.tsx**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

async function getVehicleDetail(id: number) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      trips: {
        include: {
          personnel: { select: { firstName: true, lastName: true, employeeNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vehicle = await getVehicleDetail(Number(id))
  if (!vehicle) notFound()

  const activeTrip = vehicle.trips.find((t) => t.status === 'ONGOING')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/vehicles" className="text-sm text-muted-foreground hover:text-foreground">
          ← Vehicles
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{vehicle.name}</span>
            <Badge variant={activeTrip ? 'default' : 'secondary'}>
              {activeTrip ? 'Occupied' : 'Available'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <span className="text-muted-foreground">Plate Number</span>
          <span className="font-medium">{vehicle.plateNumber}</span>
          <span className="text-muted-foreground">Type</span>
          <span>{vehicle.type}</span>
          {activeTrip && (
            <>
              <span className="text-muted-foreground">Current Driver</span>
              <span>
                {activeTrip.personnel.firstName} {activeTrip.personnel.lastName} (
                {activeTrip.personnel.employeeNumber})
              </span>
              <span className="text-muted-foreground">Trip Number</span>
              <span>{activeTrip.tripNumber}</span>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Trip History</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip #</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Start Odo (km)</TableHead>
                <TableHead>End Odo (km)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicle.trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No trips recorded for this vehicle.
                  </TableCell>
                </TableRow>
              ) : (
                vehicle.trips.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.tripNumber}</TableCell>
                    <TableCell>
                      {t.personnel.firstName} {t.personnel.lastName}
                    </TableCell>
                    <TableCell>{new Date(t.startTime).toLocaleString()}</TableCell>
                    <TableCell>{t.endTime ? new Date(t.endTime).toLocaleString() : '—'}</TableCell>
                    <TableCell>{t.startOdometer}</TableCell>
                    <TableCell>{t.endOdometer ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'ONGOING' ? 'default' : 'secondary'}>
                        {t.status === 'ONGOING' ? 'Ongoing' : 'Completed'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/vehicles/
git commit -m "feat: add vehicle detail page"
```

---

## Task 19: Admin Trips Page

**Files:**
- Create: `components/admin/trip-filters.tsx`
- Create: `app/admin/trips/page.tsx`

- [ ] **Step 1: Create components/admin/trip-filters.tsx**

```typescript
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Vehicle {
  id: number
  name: string
  plateNumber: string
}

interface TripFiltersProps {
  vehicles: Vehicle[]
}

export function TripFilters({ vehicles }: TripFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1">
        <Label>Vehicle</Label>
        <Select
          value={searchParams.get('vehicleId') ?? 'all'}
          onValueChange={(v) => updateParam('vehicleId', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vehicles</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name} ({v.plateNumber})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Status</Label>
        <Select
          value={searchParams.get('status') ?? 'all'}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ONGOING">Ongoing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Date</Label>
        <Input
          type="date"
          className="w-44"
          value={searchParams.get('date') ?? ''}
          onChange={(e) => updateParam('date', e.target.value)}
        />
      </div>

      <Button
        variant="outline"
        onClick={() => router.push(pathname)}
      >
        Clear Filters
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create app/admin/trips/page.tsx**

`useSearchParams()` in `TripFilters` requires a `<Suspense>` boundary per Next.js 16 rules — see the import below.

```typescript
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TripFilters } from '@/components/admin/trip-filters'

interface PageProps {
  searchParams: Promise<{ vehicleId?: string; status?: string; date?: string }>
}

async function getData(filters: { vehicleId?: string; status?: string; date?: string }) {
  const where: Record<string, unknown> = {}

  if (filters.vehicleId) {
    where.vehicleId = Number(filters.vehicleId)
  }
  if (filters.status === 'ONGOING' || filters.status === 'COMPLETED') {
    where.status = filters.status
  }
  if (filters.date) {
    const day = new Date(filters.date)
    const nextDay = new Date(filters.date)
    nextDay.setDate(nextDay.getDate() + 1)
    where.createdAt = { gte: day, lt: nextDay }
  }

  const [trips, vehicles] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { plateNumber: true, name: true } },
        personnel: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vehicle.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, plateNumber: true } }),
  ])

  return { trips, vehicles }
}

export default async function TripsPage({ searchParams }: PageProps) {
  const filters = await searchParams
  const { trips, vehicles } = await getData(filters)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Trip Log</h1>

      <Suspense fallback={<div className="h-10 animate-pulse bg-muted rounded-md" />}>
        <TripFilters vehicles={vehicles} />
      </Suspense>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip #</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Arrival</TableHead>
              <TableHead>Start Odo</TableHead>
              <TableHead>End Odo</TableHead>
              <TableHead>Start Fuel</TableHead>
              <TableHead>End Fuel</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No trips found.
                </TableCell>
              </TableRow>
            ) : (
              trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.tripNumber}</TableCell>
                  <TableCell>{t.vehicle.name} ({t.vehicle.plateNumber})</TableCell>
                  <TableCell>
                    {t.personnel.firstName} {t.personnel.lastName}
                  </TableCell>
                  <TableCell>{new Date(t.startTime).toLocaleString()}</TableCell>
                  <TableCell>{t.endTime ? new Date(t.endTime).toLocaleString() : '—'}</TableCell>
                  <TableCell>{t.startOdometer} km</TableCell>
                  <TableCell>{t.endOdometer != null ? `${t.endOdometer} km` : '—'}</TableCell>
                  <TableCell>{t.startGasPercent}%</TableCell>
                  <TableCell>{t.endGasPercent != null ? `${t.endGasPercent}%` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'ONGOING' ? 'default' : 'secondary'}>
                      {t.status === 'ONGOING' ? 'Ongoing' : 'Completed'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/trip-filters.tsx app/admin/trips/page.tsx
git commit -m "feat: add admin trips page with filters"
```

---

## Task 20: Admin Personnel Page + Table Component

**Files:**
- Create: `components/admin/personnel-table.tsx`
- Create: `app/admin/personnel/page.tsx`

- [ ] **Step 1: Create components/admin/personnel-table.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Personnel {
  id: number
  employeeNumber: string
  firstName: string
  lastName: string
  rank: string
  office: string
  contactNumber: string
  isAdmin: boolean
}

interface PersonnelTableProps {
  personnel: Personnel[]
}

const emptyForm = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  rank: '',
  office: '',
  contactNumber: '',
  isAdmin: false,
  password: '',
}

export function PersonnelTable({ personnel }: PersonnelTableProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editPerson, setEditPerson] = useState<Personnel | null>(null)
  const [deletePerson, setDeletePerson] = useState<Personnel | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setAddOpen(true)
  }

  function openEdit(p: Personnel) {
    setForm({
      employeeNumber: p.employeeNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      rank: p.rank,
      office: p.office,
      contactNumber: p.contactNumber,
      isAdmin: p.isAdmin,
      password: '',
    })
    setError('')
    setEditPerson(p)
  }

  async function handleAdd() {
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to add personnel'); return }
    setAddOpen(false)
    router.refresh()
  }

  async function handleEdit() {
    if (!editPerson) return
    setError('')
    setSubmitting(true)
    const res = await fetch(`/api/personnel/${editPerson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update personnel'); return }
    setEditPerson(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deletePerson) return
    setSubmitting(true)
    const res = await fetch(`/api/personnel/${deletePerson.id}`, { method: 'DELETE' })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to delete personnel'); return }
    setDeletePerson(null)
    router.refresh()
  }

  const PersonnelForm = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>First Name</Label>
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Last Name</Label>
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Employee Number</Label>
        <Input value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Rank</Label>
        <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Office</Label>
        <Input value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Contact Number</Label>
        <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isAdmin"
          checked={form.isAdmin}
          onChange={(e) => setForm({ ...form, isAdmin: e.target.checked, password: '' })}
          className="h-4 w-4"
        />
        <Label htmlFor="isAdmin">Grant admin access</Label>
      </div>
      {form.isAdmin && (
        <div className="space-y-1">
          <Label>Password {editPerson ? '(leave blank to keep current)' : ''}</Label>
          <Input
            type="password"
            placeholder={editPerson ? 'Leave blank to keep current' : 'Set password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Personnel</h1>
        <Button onClick={openAdd}>Add Personnel</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personnel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No personnel records yet.
                </TableCell>
              </TableRow>
            ) : (
              personnel.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.employeeNumber}</TableCell>
                  <TableCell>{p.firstName} {p.lastName}</TableCell>
                  <TableCell>{p.rank}</TableCell>
                  <TableCell>{p.office}</TableCell>
                  <TableCell>{p.contactNumber}</TableCell>
                  <TableCell>
                    {p.isAdmin ? (
                      <Badge>Admin</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Personnel</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeletePerson(p)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Personnel</DialogTitle>
          </DialogHeader>
          <PersonnelForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Personnel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editPerson} onOpenChange={(o) => !o && setEditPerson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Personnel</DialogTitle>
          </DialogHeader>
          <PersonnelForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPerson(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletePerson} onOpenChange={(o) => !o && setDeletePerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Personnel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deletePerson?.firstName} {deletePerson?.lastName}</strong>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePerson(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Create app/admin/personnel/page.tsx**

```typescript
import { prisma } from '@/lib/prisma'
import { PersonnelTable } from '@/components/admin/personnel-table'

async function getPersonnel() {
  return prisma.personnel.findMany({
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      rank: true,
      office: true,
      contactNumber: true,
      isAdmin: true,
    },
    orderBy: { lastName: 'asc' },
  })
}

export default async function PersonnelPage() {
  const personnel = await getPersonnel()
  return (
    <div className="p-6">
      <PersonnelTable personnel={personnel} />
    </div>
  )
}
```

- [ ] **Step 3: Final build check**

```bash
pnpm build
```

Expected: build completes with no TypeScript errors. Warnings about dynamic routes or client boundaries are acceptable.

- [ ] **Step 4: Final commit**

```bash
git add components/admin/personnel-table.tsx app/admin/personnel/page.tsx
git commit -m "feat: add admin personnel page — system complete"
```

---

## Summary of Environment Variables Required

Ensure `.env` contains:
```
DATABASE_URL=mysql://user:password@host:3306/dbname
JWT_SECRET=your_long_random_secret_here
```

## First-Run Checklist

After all tasks are complete:
1. Run `pnpm dlx prisma migrate dev` to apply schema
2. Run `pnpm dlx prisma db seed` to create default admin
3. Run `pnpm dev` to start the dev server
4. Navigate to `http://localhost:3000/login`
5. Sign in with employee number `ADMIN001` and password `admin123`
6. Add vehicles via `/admin/vehicles`
7. Add personnel via `/admin/personnel`
8. Test trip log at `http://localhost:3000/trip/log`
9. Test trip complete at `http://localhost:3000/trip/complete`
