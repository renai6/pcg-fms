'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
import {
  DAY_START,
  DAY_END,
  HOUR_PX,
  TOTAL_HEIGHT,
  pad,
  hoursOfDay,
  formatRange,
  shiftDate,
  officeColor,
  todayString,
  type Room,
  type Person,
  type Booking,
} from '@/lib/rooms'

interface PublicRoomsScheduleProps {
  date: string
  rooms: Room[]
  bookings: Booking[]
  personnel: Person[]
}

interface BookingForm {
  roomId: string
  personnelId: string
  purpose: string
  date: string
  startTime: string
  endTime: string
}

export function PublicRoomsSchedule({
  date,
  rooms,
  bookings,
  personnel,
}: PublicRoomsScheduleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<BookingForm | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hours: number[] = []
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h)

  function goToDate(next: string) {
    router.push(`${pathname}?date=${next}`)
  }

  function openNew(roomId: number, startHour: number) {
    const start = Math.max(DAY_START, Math.min(startHour, DAY_END - 1))
    setError('')
    setForm({
      roomId: String(roomId),
      personnelId: personnel[0] ? String(personnel[0].id) : '',
      purpose: '',
      date,
      startTime: `${pad(start)}:00`,
      endTime: `${pad(start + 1)}:00`,
    })
    setDialogOpen(true)
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, roomId: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const hour = DAY_START + Math.floor(y / HOUR_PX)
    openNew(roomId, hour)
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
    const res = await fetch('/api/room-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(data.error ?? 'Failed to save booking')
      return
    }
    setDialogOpen(false)
    router.refresh()
  }

  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const selectedPerson = personnel.find((p) => String(p.id) === form?.personnelId)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => goToDate(shiftDate(date, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => goToDate(shiftDate(date, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Input
          type="date"
          className="w-44"
          value={date}
          onChange={(e) => e.target.value && goToDate(e.target.value)}
        />
        <Button variant="outline" onClick={() => goToDate(todayString())}>
          Today
        </Button>
        <span className="text-sm text-muted-foreground">{prettyDate}</span>
        <div className="ml-auto">
          <Button
            onClick={() => rooms[0] && openNew(rooms[0].id, 9)}
            disabled={rooms.length === 0}
          >
            New Booking
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-md border p-10 text-center text-muted-foreground">
          No rooms are available yet.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <div className="flex min-w-max">
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
                <div key={room.id} className="w-52 shrink-0 border-r last:border-r-0">
                  <div className="h-10 border-b px-2 flex flex-col justify-center">
                    <span className="text-sm font-medium truncate">{room.name}</span>
                    {room.floor && (
                      <span className="text-xs text-muted-foreground truncate">{room.floor}</span>
                    )}
                  </div>
                  <div
                    className="relative cursor-pointer"
                    style={{ height: TOTAL_HEIGHT }}
                    onClick={(e) => handleColumnClick(e, room.id)}
                  >
                    {/* Hour gridlines */}
                    {hours.slice(0, -1).map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-b border-border/60"
                        style={{ top: (h - DAY_START) * HOUR_PX, height: HOUR_PX }}
                      />
                    ))}

                    {/* Booking blocks (display-only) */}
                    {roomBookings.map((b) => {
                      const start = Math.max(hoursOfDay(b.startTime), DAY_START)
                      const end = Math.min(hoursOfDay(b.endTime), DAY_END)
                      const top = (start - DAY_START) * HOUR_PX
                      const height = Math.max((end - start) * HOUR_PX, 22)
                      const colors = officeColor(b.office)
                      return (
                        <div
                          key={b.id}
                          className="absolute inset-x-1 rounded-md border-l-4 px-2 py-1 overflow-hidden shadow-sm"
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
                        </div>
                      )
                    })}
                  </div>
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
            <DialogTitle>New Booking</DialogTitle>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
