import { prisma } from '@/lib/prisma'
import { RoomsSchedule } from '@/components/admin/rooms-schedule'
import { ManageRoomsDialog } from '@/components/admin/manage-rooms-dialog'
import { PageHeader } from '@/components/admin/page-header'

type View = 'day' | 'week' | 'month'

interface PageProps {
  searchParams: Promise<{ date?: string; view?: string }>
}

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Sunday-based start of the week for the given date.
function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setDate(x.getDate() - x.getDay())
  x.setHours(0, 0, 0, 0)
  return x
}

// The half-open [start, end) range of days to load for a given view.
function rangeForView(view: View, focus: Date) {
  const start = new Date(focus)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)

  if (view === 'day') {
    end.setDate(end.getDate() + 1)
    return { start, end }
  }
  if (view === 'week') {
    const weekStart = startOfWeek(focus)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return { start: weekStart, end: weekEnd }
  }
  // month: cover the full 6-week grid that the calendar renders.
  const gridStart = startOfWeek(new Date(focus.getFullYear(), focus.getMonth(), 1))
  const gridEnd = new Date(gridStart)
  gridEnd.setDate(gridEnd.getDate() + 42)
  return { start: gridStart, end: gridEnd }
}

export default async function RoomsPage({ searchParams }: PageProps) {
  const { date: dateParam, view: viewParam } = await searchParams
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayString()
  const view: View = viewParam === 'week' || viewParam === 'month' ? viewParam : 'day'

  const { start: rangeStart, end: rangeEnd } = rangeForView(view, new Date(`${date}T00:00:00`))

  const [rooms, bookings, personnel] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: 'asc' } }),
    prisma.roomBooking.findMany({
      where: { startTime: { gte: rangeStart, lt: rangeEnd } },
      include: {
        room: { select: { name: true } },
        personnel: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.personnel.findMany({
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true, office: true },
    }),
  ])

  const bookingData = bookings.map((b) => ({
    id: b.id,
    roomId: b.roomId,
    personnelId: b.personnelId,
    office: b.office,
    purpose: b.purpose,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    personName: `${b.personnel.firstName} ${b.personnel.lastName}`,
    roomName: b.room.name,
  }))

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Room Schedule"
        description="See who is using which room, and reserve rooms by date and time."
      >
        <ManageRoomsDialog rooms={rooms} />
      </PageHeader>

      <RoomsSchedule
        date={date}
        view={view}
        rooms={rooms}
        bookings={bookingData}
        personnel={personnel}
      />
    </div>
  )
}
