# PCG Facility Management System — Design Spec

**Date:** 2026-06-17  
**Project:** pcg-fms  
**Stack:** Next.js 16, React 19, Prisma 7, MariaDB, Tailwind v4, shadcn/ui (radix-nova)

---

## Overview

A facility management system with a vehicle trip monitoring module, personnel management, and admin dashboard. Public-facing forms allow drivers to log and complete trips without authentication. An admin-only area (protected by JWT session) handles vehicle management, personnel management, and viewing trip/vehicle data.

---

## Data Model

### Personnel
```
id              Int       @id @default(autoincrement())
employeeNumber  String    @unique
firstName       String
lastName        String
rank            String
office          String
contactNumber   String
isAdmin         Boolean   @default(false)
passwordHash    String?   // only set for admin accounts
createdAt       DateTime  @default(now())
trips           Trip[]
```

### Vehicle
```
id           Int       @id @default(autoincrement())
plateNumber  String    @unique
name         String
type         String    // free text, e.g. "Van", "Truck", "Sedan"
createdAt    DateTime  @default(now())
trips        Trip[]
```

### Trip
```
id              Int       @id @default(autoincrement())
tripNumber      String    @unique  // e.g. TRP-00001, auto-generated
vehicleId       Int
vehicle         Vehicle   @relation(...)
personnelId     Int
personnel       Personnel @relation(...)
startTime       DateTime
startOdometer   Float
startGasPercent Float     // 0–100
endTime         DateTime?
endOdometer     Float?
endGasPercent   Float?    // 0–100
status          TripStatus @default(ONGOING)
createdAt       DateTime  @default(now())

enum TripStatus { ONGOING COMPLETED }
```

**Derived vehicle status:** A vehicle is **Occupied** if it has any trip with `status = ONGOING`; otherwise **Available**.

**Trip number generation:** `TRP-` prefix + zero-padded total trip count at time of creation (e.g. `TRP-00001`, `TRP-00042`).

---

## Route Structure

### Public Routes (no authentication)
| Route | Purpose |
|---|---|
| `/` | Home page — links to Log Trip and Complete Trip |
| `/trip/log` | Driver logs a new trip |
| `/trip/complete` | Personnel looks up a trip by number and marks it complete |

### Admin Routes (redirect to `/login` if no valid session)
| Route | Purpose |
|---|---|
| `/login` | Admin login form |
| `/admin` | Dashboard with summary cards |
| `/admin/vehicles` | Vehicle list with status + add/edit/delete modals |
| `/admin/vehicles/[id]` | Vehicle detail + trip history for that vehicle |
| `/admin/trips` | Full trip log, filterable by vehicle/status/date |
| `/admin/personnel` | Personnel table + add/edit/delete modals |

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/auth/login` | Verify credentials, set JWT cookie |
| `POST /api/auth/logout` | Clear JWT cookie |
| `POST /api/trips` | Create a new trip (public) |
| `PATCH /api/trips/[tripNumber]` | Complete a trip (public) |
| CRUD `/api/vehicles` | Vehicle management (admin) |
| CRUD `/api/personnel` | Personnel management (admin) |

---

## Authentication

- **Library:** `jose` for JWT signing/verification, `bcryptjs` for password hashing
- **Cookie:** `fms_session` — httpOnly, SameSite=Strict, 8-hour expiry
- **JWT payload:** `{ id, employeeNumber, isAdmin: true }`
- **Middleware:** `middleware.ts` intercepts all `/admin/*` requests, verifies the cookie, redirects to `/login` on failure
- **Login:** Matches `employeeNumber` where `isAdmin = true`, verifies `passwordHash` with bcrypt, issues JWT on success
- **Logout:** Clears `fms_session` cookie, redirects to `/login`
- **First admin:** `prisma/seed.ts` creates a default admin account; credentials printed to console on first run

---

## Core Trip Flows

### Logging a Trip (`/trip/log`)
1. Driver selects vehicle from dropdown — only vehicles with no `ONGOING` trip are shown
2. Driver enters: employee number, start time, start odometer, start gas %
3. Server validates employee number exists in `Personnel`
4. Server creates `Trip` record with `status = ONGOING`, generates trip number
5. Trip number is displayed prominently — driver records it

### Completing a Trip (`/trip/complete`)
1. Personnel enters trip number
2. Server returns trip details (vehicle, driver name, start data) for confirmation
3. Personnel fills in: end time, end odometer, end gas %
4. Server validates and updates trip: sets end fields, `status = COMPLETED`
5. Confirmation displayed

### Validation Rules
- Employee number must exist in `Personnel`
- Vehicle must not have an existing `ONGOING` trip at time of submission (server-side check, not just UI dropdown)
- End odometer ≥ start odometer
- End time must be after start time
- Gas % must be between 0 and 100
- Trip number not found or already completed → clear error message

---

## Admin Pages

### Dashboard (`/admin`)
Summary cards:
- Total vehicles
- Vehicles currently occupied
- Total trips today
- Total personnel

### Vehicle Status (`/admin/vehicles`)
- Table columns: plate number, name, type, status (Occupied / Available), current driver if occupied
- Add / edit / delete via modal dialogs

### Vehicle Detail (`/admin/vehicles/[id]`)
- Vehicle info at the top
- Trip history table for that vehicle below

### Trip Log (`/admin/trips`)
- Table columns: trip number, vehicle, driver, start time, end time, status
- Filters: vehicle, status (ongoing/completed), date range
- Row click → full trip detail (all odometer and gas data)

### Personnel Management (`/admin/personnel`)
- Table columns: employee number, name, rank, office, contact number, admin badge
- Add / edit / delete via modal dialogs
- Add/edit modal includes an admin toggle; enabling it reveals a password field

---

## UI Patterns

- **Modals** for all add/edit/delete actions on admin tables (no separate pages except vehicle detail)
- **shadcn/ui** components throughout with `radix-nova` style
- **Tailwind v4** utility classes; design tokens in `app/globals.css`
- Admin layout: sidebar navigation + main content area
- Public pages: minimal, centered layout focused on the form

---

## Seed Script

`prisma/seed.ts` creates:
- One default admin account (employee number + password printed to console)
- Optionally a few sample vehicles and personnel for development

---

## Out of Scope (for this phase)
- Driver authentication / driver accounts
- Notifications or alerts
- Maintenance tracking
- Reporting / export
- Mobile app
