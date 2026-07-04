import { prisma } from '@/lib/prisma'
import { RoomsSchedule } from '@/components/admin/rooms-schedule'
import { ManageRoomsDialog } from '@/components/admin/manage-rooms-dialog'
import { PageHeader } from '@/components/admin/page-header'

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function RoomsPage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayString()

  const dayStart = new Date(`${date}T00:00:00`)
  const nextDay = new Date(dayStart)
  nextDay.setDate(nextDay.getDate() + 1)

  const [rooms, bookings, personnel] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: 'asc' } }),
    prisma.roomBooking.findMany({
      where: { startTime: { gte: dayStart, lt: nextDay } },
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
        rooms={rooms}
        bookings={bookingData}
        personnel={personnel}
      />
    </div>
  )
}
