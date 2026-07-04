import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(rooms)
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, floor, capacity } = body as {
    name: string
    floor?: string
    capacity?: number | string | null
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Room name is required' }, { status: 400 })
  }

  const existing = await prisma.room.findUnique({ where: { name: name.trim() } })
  if (existing) {
    return NextResponse.json({ error: 'A room with that name already exists' }, { status: 409 })
  }

  const room = await prisma.room.create({
    data: {
      name: name.trim(),
      floor: floor?.trim() || null,
      capacity: capacity ? Number(capacity) : null,
    },
  })
  return NextResponse.json(room, { status: 201 })
}
