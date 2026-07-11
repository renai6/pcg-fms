import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { PublicRoomsSchedule } from '@/components/rooms/public-rooms-schedule'
import { todayString, isValidDate, dayWindow } from '@/lib/rooms'

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function PublicRoomsPage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams
  const date = isValidDate(dateParam) ? dateParam : todayString()

  const { dayStart, nextDay } = dayWindow(date)

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
    <main className="min-h-screen bg-muted/30 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/pcg_logo.webp"
            alt="Philippine Coast Guard"
            width={80}
            height={80}
            priority
            className="size-20"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Room Schedule</h1>
            <p className="text-muted-foreground mt-1">
              See who is using which room, and reserve a room by date and time.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            ← Back to home
          </Link>
        </header>

        <PublicRoomsSchedule
          date={date}
          rooms={rooms}
          bookings={bookingData}
          personnel={personnel}
        />
      </div>
    </main>
  )
}
