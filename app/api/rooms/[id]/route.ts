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
  const roomId = Number(id)
  const body = await request.json()
  const { name, floor, capacity } = body as {
    name: string
    floor?: string
    capacity?: number | string | null
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Room name is required' }, { status: 400 })
  }

  const duplicate = await prisma.room.findFirst({
    where: { name: name.trim(), id: { not: roomId } },
  })
  if (duplicate) {
    return NextResponse.json({ error: 'A room with that name already exists' }, { status: 409 })
  }

  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      name: name.trim(),
      floor: floor?.trim() || null,
      capacity: capacity ? Number(capacity) : null,
    },
  })
  return NextResponse.json(room)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const roomId = Number(id)

  const booking = await prisma.roomBooking.findFirst({ where: { roomId } })
  if (booking) {
    return NextResponse.json(
      { error: 'Cannot delete a room that has bookings. Remove its bookings first.' },
      { status: 409 }
    )
  }

  await prisma.room.delete({ where: { id: roomId } })
  return NextResponse.json({ success: true })
}
