'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_START = 6 // 6:00
const DAY_END = 20 // 20:00
const HOUR_PX = 56
const TOTAL_HEIGHT = (DAY_END - DAY_START) * HOUR_PX
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type View = 'day' | 'week' | 'month'

interface Room {
  id: number
  name: string
  floor: string | null
  capacity: number | null
}

interface Person {
  id: number
  firstName: string
  lastName: string
  office: string
}

interface Booking {
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

interface RoomsScheduleProps {
  date: string
  view: View
  rooms: Room[]
  bookings: Booking[]
  personnel: Person[]
}

interface BookingForm {
  id: number | null
  roomId: string
  personnelId: string
  purpose: string
  date: string
  startTime: string
  endTime: string
}

// A booking positioned inside a single day column, with overlap lanes resolved.
interface PositionedBooking {
  b: Booking
  top: number
  height: number
  lane: number
  lanes: number
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Fractional hours since midnight, in local time.
function hoursOfDay(iso: string) {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

function timeValue(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  return `${new Date(startIso).toLocaleTimeString([], opts)} – ${new Date(
    endIso
  ).toLocaleTimeString([], opts)}`
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`)
}

function dayOf(iso: string) {
  return toDateStr(new Date(iso))
}

function shiftDate(dateStr: string, days: number) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

function addMonths(dateStr: string, n: number) {
  const d = parseDate(dateStr)
  const targetDay = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(targetDay, lastDay))
  return toDateStr(d)
}

// The seven date strings of the Sunday-based week containing `dateStr`.
function weekDates(dateStr: string) {
  const start = parseDate(dateStr)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => shiftDate(toDateStr(start), i))
}

// The 42 date strings (6 weeks) of the month grid containing `dateStr`.
function monthGridDates(dateStr: string) {
  const d = parseDate(dateStr)
  const gridStart = new Date(d.getFullYear(), d.getMonth(), 1)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  return Array.from({ length: 42 }, (_, i) => shiftDate(toDateStr(gridStart), i))
}

// Pack a day's bookings into non-overlapping lanes so concurrent bookings
// sit side by side instead of stacking on top of each other.
function layoutDay(dayBookings: Booking[]): PositionedBooking[] {
  const items = dayBookings
    .map((b) => ({
      b,
      start: Math.max(hoursOfDay(b.startTime), DAY_START),
      end: Math.min(hoursOfDay(b.endTime), DAY_END),
    }))
    .filter((x) => x.end > x.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const result: PositionedBooking[] = []
  let cluster: typeof items = []
  let clusterEnd = -Infinity

  const flush = () => {
    if (cluster.length === 0) return
    const laneEnds: number[] = []
    const laneOf = new Map<Booking, number>()
    for (const it of cluster) {
      let lane = laneEnds.findIndex((end) => end <= it.start)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(it.end)
      } else {
        laneEnds[lane] = it.end
      }
      laneOf.set(it.b, lane)
    }
    const lanes = laneEnds.length
    for (const it of cluster) {
      result.push({
        b: it.b,
        top: (it.start - DAY_START) * HOUR_PX,
        height: Math.max((it.end - it.start) * HOUR_PX, 22),
        lane: laneOf.get(it.b) ?? 0,
        lanes,
      })
    }
    cluster = []
    clusterEnd = -Infinity
  }

  for (const it of items) {
    if (cluster.length > 0 && it.start >= clusterEnd) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.end)
  }
  flush()
  return result
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

function officeColor(office: string) {
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

export function RoomsSchedule({ date, view, rooms, bookings, personnel }: RoomsScheduleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<BookingForm | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const hours: number[] = []
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h)

  const todayStr = toDateStr(new Date())

  function goTo(nextDate: string, nextView: View = view) {
    const params = new URLSearchParams()
    params.set('date', nextDate)
    if (nextView !== 'day') params.set('view', nextView)
    router.push(`${pathname}?${params.toString()}`)
  }

  function navigate(dir: -1 | 1) {
    if (view === 'day') goTo(shiftDate(date, dir))
    else if (view === 'week') goTo(shiftDate(date, dir * 7))
    else goTo(addMonths(date, dir))
  }

  function openNew(roomId: number, dayStr: string, startHour: number) {
    const start = Math.max(DAY_START, Math.min(startHour, DAY_END - 1))
    setError('')
    setForm({
      id: null,
      roomId: String(roomId),
      personnelId: personnel[0] ? String(personnel[0].id) : '',
      purpose: '',
      date: dayStr,
      startTime: `${pad(start)}:00`,
      endTime: `${pad(start + 1)}:00`,
    })
    setDialogOpen(true)
  }

  function openEdit(b: Booking) {
    setError('')
    setForm({
      id: b.id,
      roomId: String(b.roomId),
      personnelId: String(b.personnelId),
      purpose: b.purpose,
      date: dayOf(b.startTime),
      startTime: timeValue(b.startTime),
      endTime: timeValue(b.endTime),
    })
    setDialogOpen(true)
  }

  function handleColumnClick(
    e: React.MouseEvent<HTMLDivElement>,
    roomId: number,
    dayStr: string
  ) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const hour = DAY_START + Math.floor(y / HOUR_PX)
    openNew(roomId, dayStr, hour)
  }

  async function handleSubmit() {
    if (!form) return
    setError('')
    setSubmitting(true)
    const payload = {
      roomId: Number(form.roomId),
      personnelId: Number(form.personnelId),
      purpose: form.purpose,
      startTime: new Date(`${form.date}T${form.startTime}`).toISOString(),
      endTime: new Date(`${form.date}T${form.endTime}`).toISOString(),
    }
    const res = await fetch(
      form.id ? `/api/room-bookings/${form.id}` : '/api/room-bookings',
      {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(data.error ?? 'Failed to save booking')
      return
    }
    setDialogOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!form?.id) return
    setDeleting(true)
    const res = await fetch(`/api/room-bookings/${form.id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete booking')
      return
    }
    setDialogOpen(false)
    router.refresh()
  }

  let title: string
  if (view === 'day') {
    title = parseDate(date).toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } else if (view === 'week') {
    const wd = weekDates(date)
    const first = parseDate(wd[0]).toLocaleDateString([], { month: 'short', day: 'numeric' })
    const last = parseDate(wd[6]).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    title = `${first} – ${last}`
  } else {
    title = parseDate(date).toLocaleDateString([], { month: 'long', year: 'numeric' })
  }

  const selectedPerson = personnel.find((p) => String(p.id) === form?.personnelId)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Input
          type="date"
          className="w-44"
          value={date}
          onChange={(e) => e.target.value && goTo(e.target.value)}
        />
        <Button variant="outline" onClick={() => goTo(todayStr)}>
          Today
        </Button>
        <span className="text-sm text-muted-foreground">{title}</span>

        {/* View switcher */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? 'default' : 'ghost'}
                className="capitalize"
                onClick={() => goTo(date, v)}
              >
                {v}
              </Button>
            ))}
          </div>
          <Button onClick={() => rooms[0] && openNew(rooms[0].id, date, 9)} disabled={rooms.length === 0}>
            New Booking
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-md border p-10 text-center text-muted-foreground">
          No rooms yet. Use <strong>Manage Rooms</strong> above to add a room before scheduling.
        </div>
      ) : view === 'day' ? (
        /* ---------- DAY VIEW: rooms as columns ---------- */
        <div className="rounded-md border overflow-x-auto">
          <div className="flex">
            {/* Time gutter */}
            <div className="w-16 shrink-0 border-r bg-muted/30">
              <div className="h-10 border-b" />
              <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                    style={{ top: (h - DAY_START) * HOUR_PX }}
                  >
                    {pad(h)}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Room columns */}
            {rooms.map((room) => {
              const roomBookings = bookings.filter((b) => b.roomId === room.id)
              return (
                <div key={room.id} className="flex-1 min-w-52 border-r last:border-r-0">
                  <div className="h-10 border-b px-2 flex flex-col justify-center">
                    <span className="text-sm font-medium truncate">{room.name}</span>
                    {room.floor && (
                      <span className="text-xs text-muted-foreground truncate">{room.floor}</span>
                    )}
                  </div>
                  <div
                    className="relative cursor-pointer"
                    style={{ height: TOTAL_HEIGHT }}
                    onClick={(e) => handleColumnClick(e, room.id, date)}
                  >
                    {/* Hour gridlines */}
                    {hours.slice(0, -1).map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-b border-border/60"
                        style={{ top: (h - DAY_START) * HOUR_PX, height: HOUR_PX }}
                      />
                    ))}

                    {/* Booking blocks */}
                    {roomBookings.map((b) => {
                      const start = Math.max(hoursOfDay(b.startTime), DAY_START)
                      const end = Math.min(hoursOfDay(b.endTime), DAY_END)
                      const top = (start - DAY_START) * HOUR_PX
                      const height = Math.max((end - start) * HOUR_PX, 22)
                      const colors = officeColor(b.office)
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(b)
                          }}
                          className="absolute inset-x-1 rounded-md border-l-4 px-2 py-1 text-left overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          style={{ top, height, ...colors }}
                        >
                          <div className="text-xs font-semibold leading-tight truncate">
                            {b.office}
                          </div>
                          <div className="text-[11px] leading-tight truncate">{b.personName}</div>
                          {height > 44 && (
                            <div className="text-[11px] leading-tight truncate opacity-80">
                              {b.purpose}
                            </div>
                          )}
                          {height > 60 && (
                            <div className="text-[10px] leading-tight opacity-70 mt-0.5">
                              {formatRange(b.startTime, b.endTime)}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : view === 'week' ? (
        /* ---------- WEEK VIEW: days as columns ---------- */
        <div className="rounded-md border overflow-x-auto">
          <div className="flex">
            {/* Time gutter */}
            <div className="w-14 shrink-0 border-r bg-muted/30">
              <div className="h-12 border-b" />
              <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                    style={{ top: (h - DAY_START) * HOUR_PX }}
                  >
                    {pad(h)}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Day columns */}
            {weekDates(date).map((dayStr) => {
              const d = parseDate(dayStr)
              const isToday = dayStr === todayStr
              const positioned = layoutDay(bookings.filter((b) => dayOf(b.startTime) === dayStr))
              return (
                <div key={dayStr} className="flex-1 min-w-32 border-r last:border-r-0">
                  <button
                    type="button"
                    onClick={() => goTo(dayStr, 'day')}
                    className={cn(
                      'h-12 w-full border-b px-2 flex flex-col justify-center hover:bg-muted transition-colors',
                      isToday && 'bg-primary/10'
                    )}
                  >
                    <span className="text-xs text-muted-foreground">{WEEKDAYS[d.getDay()]}</span>
                    <span className={cn('text-sm font-medium', isToday && 'text-primary')}>
                      {d.getDate()}
                    </span>
                  </button>
                  <div
                    className="relative cursor-pointer"
                    style={{ height: TOTAL_HEIGHT }}
                    onClick={(e) => handleColumnClick(e, rooms[0].id, dayStr)}
                  >
                    {/* Hour gridlines */}
                    {hours.slice(0, -1).map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-b border-border/60"
                        style={{ top: (h - DAY_START) * HOUR_PX, height: HOUR_PX }}
                      />
                    ))}

                    {/* Booking blocks */}
                    {positioned.map((p) => {
                      const colors = officeColor(p.b.office)
                      const widthPct = 100 / p.lanes
                      return (
                        <button
                          key={p.b.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(p.b)
                          }}
                          className="absolute rounded-md border-l-4 px-1.5 py-0.5 text-left overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          style={{
                            top: p.top,
                            height: p.height,
                            left: `calc(${p.lane * widthPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            ...colors,
                          }}
                        >
                          <div className="text-[11px] font-semibold leading-tight truncate">
                            {p.b.roomName}
                          </div>
                          <div className="text-[10px] leading-tight truncate">{p.b.office}</div>
                          {p.height > 42 && (
                            <div className="text-[10px] leading-tight truncate opacity-80">
                              {p.b.personName}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ---------- MONTH VIEW: calendar grid ---------- */
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGridDates(date).map((dayStr) => {
              const d = parseDate(dayStr)
              const inMonth = d.getMonth() === parseDate(date).getMonth()
              const isToday = dayStr === todayStr
              const dayBookings = bookings.filter((b) => dayOf(b.startTime) === dayStr)
              const shown = dayBookings.slice(0, 3)
              const extra = dayBookings.length - shown.length
              return (
                <div
                  key={dayStr}
                  onClick={() => goTo(dayStr, 'day')}
                  className={cn(
                    'min-h-24 border-b border-r p-1 flex flex-col gap-0.5 cursor-pointer transition-colors hover:bg-muted/40 [&:nth-child(7n)]:border-r-0',
                    !inMonth && 'bg-muted/20'
                  )}
                >
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        'text-xs w-5 h-5 flex items-center justify-center rounded-full',
                        isToday && 'bg-primary text-primary-foreground font-medium',
                        !inMonth && !isToday && 'text-muted-foreground'
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  {shown.map((b) => {
                    const colors = officeColor(b.office)
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(b)
                        }}
                        className="rounded border-l-2 px-1 py-0.5 text-left overflow-hidden"
                        style={colors}
                      >
                        <span className="text-[10px] leading-tight truncate block">
                          <span className="font-medium">
                            {new Date(b.startTime).toLocaleTimeString([], { hour: 'numeric' })}
                          </span>{' '}
                          {b.roomName}
                        </span>
                      </button>
                    )
                  })}
                  {extra > 0 && (
                    <span className="text-[10px] text-muted-foreground px-1">+{extra} more</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Booking dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Edit Booking' : 'New Booking'}</DialogTitle>
            <DialogDescription>
              Reserve a room for a person. Their office is recorded on the booking.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Room</Label>
                <Select
                  value={form.roomId}
                  onValueChange={(v) => setForm({ ...form, roomId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                        {r.floor ? ` — ${r.floor}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Personnel</Label>
                <Select
                  value={form.personnelId}
                  onValueChange={(v) => setForm({ ...form, personnelId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select personnel" />
                  </SelectTrigger>
                  <SelectContent>
                    {personnel.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.firstName} {p.lastName} — {p.office}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPerson && (
                  <p className="text-xs text-muted-foreground">
                    Office <strong>{selectedPerson.office}</strong> will be recorded for this
                    booking.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Purpose</Label>
                <Input
                  placeholder="e.g. Team meeting"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <div>
              {form?.id && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : form?.id ? 'Save Changes' : 'Create Booking'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
