// Shared helpers and types for the room-scheduling UIs (admin + public).

// Day-grid layout constants.
export const DAY_START = 6 // 6:00
export const DAY_END = 20 // 20:00
export const HOUR_PX = 56
export const TOTAL_HEIGHT = (DAY_END - DAY_START) * HOUR_PX

export interface Room {
  id: number
  name: string
  floor: string | null
  capacity: number | null
}

export interface Person {
  id: number
  firstName: string
  lastName: string
  office: string
}

export interface Booking {
  id: number
  roomId: number
  personnelId: number
  office: string
  purpose: string
  startTime: string
  endTime: string
  personName: string
  roomName: string
}

export function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Fractional hours since midnight, in local time.
export function hoursOfDay(iso: string) {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

export function timeValue(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  return `${new Date(startIso).toLocaleTimeString([], opts)} – ${new Date(
    endIso
  ).toLocaleTimeString([], opts)}`
}

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Curated, theme-harmonious palette (warm + muted neutrals) assigned
// deterministically per office label so bookings stay legible and on-brand.
const OFFICE_PALETTE = [
  { hue: 40, sat: 65 }, // amber (brand-adjacent)
  { hue: 25, sat: 55 }, // terracotta
  { hue: 200, sat: 35 }, // slate blue
  { hue: 150, sat: 30 }, // muted teal
  { hue: 265, sat: 30 }, // muted violet
  { hue: 340, sat: 35 }, // dusty rose
  { hue: 90, sat: 30 }, // olive
  { hue: 15, sat: 20 }, // warm grey
]

export function officeColor(office: string) {
  let hash = 0
  for (let i = 0; i < office.length; i++) {
    hash = (hash * 31 + office.charCodeAt(i)) & 0xffffffff
  }
  const { hue, sat } = OFFICE_PALETTE[Math.abs(hash) % OFFICE_PALETTE.length]
  return {
    background: `hsl(${hue} ${sat}% 95%)`,
    borderColor: `hsl(${hue} ${sat}% 52%)`,
    color: `hsl(${hue} ${Math.min(sat + 10, 60)}% 26%)`,
  }
}

// Page-level date helpers shared by the admin and public room pages.
export function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function isValidDate(date: string | undefined): date is string {
  return !!date && /^\d{4}-\d{2}-\d{2}$/.test(date)
}

// Local-time [dayStart, nextDay) window for a YYYY-MM-DD date.
export function dayWindow(date: string) {
  const dayStart = new Date(`${date}T00:00:00`)
  const nextDay = new Date(dayStart)
  nextDay.setDate(nextDay.getDate() + 1)
  return { dayStart, nextDay }
}
