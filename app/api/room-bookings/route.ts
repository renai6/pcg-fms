import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { roomId, personnelId, purpose, startTime, endTime } = body as {
    roomId: number | string
    personnelId: number | string
    purpose: string
    startTime: string
    endTime: string
  }

  if (!roomId || !personnelId || !purpose?.trim() || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const start = new Date(startTime)
  const end = new Date(endTime)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start or end time' }, { status: 400 })
  }
  if (start >= end) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  }

  // Snapshot the person's office server-side so it is authoritative.
  const person = await prisma.personnel.findUnique({
    where: { id: Number(personnelId) },
    select: { office: true },
  })
  if (!person) {
    return NextResponse.json({ error: 'Selected personnel not found' }, { status: 400 })
  }

  const conflict = await prisma.roomBooking.findFirst({
    where: {
      roomId: Number(roomId),
      startTime: { lt: end },
      endTime: { gt: start },
    },
  })
  if (conflict) {
    return NextResponse.json({ error: 'Room already booked for that time' }, { status: 409 })
  }

  const booking = await prisma.roomBooking.create({
    data: {
      roomId: Number(roomId),
      personnelId: Number(personnelId),
      office: person.office,
      purpose: purpose.trim(),
      startTime: start,
      endTime: end,
    },
  })
  return NextResponse.json(booking, { status: 201 })
}
