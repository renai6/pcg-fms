import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'ONGOING' },
        select: {
          id: true,
          personnel: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(
    vehicles.map((v) => ({
      id: v.id,
      plateNumber: v.plateNumber,
      name: v.name,
      type: v.type,
      createdAt: v.createdAt,
      isOccupied: v.trips.length > 0,
      currentDriver: v.trips[0]?.personnel
        ? `${v.trips[0].personnel.firstName} ${v.trips[0].personnel.lastName}`
        : null,
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { plateNumber, name, type } = body as { plateNumber: string; name: string; type: string }

  if (!plateNumber || !name || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.vehicle.findUnique({ where: { plateNumber } })
  if (existing) {
    return NextResponse.json({ error: 'Plate number already exists' }, { status: 409 })
  }

  const vehicle = await prisma.vehicle.create({ data: { plateNumber, name, type } })
  return NextResponse.json(vehicle, { status: 201 })
}
