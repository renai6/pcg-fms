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
  const body = await request.json()
  const { plateNumber, name, type } = body as { plateNumber: string; name: string; type: string }

  const vehicle = await prisma.vehicle.update({
    where: { id: Number(id) },
    data: { plateNumber, name, type },
  })
  return NextResponse.json(vehicle)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const activeTrip = await prisma.trip.findFirst({
    where: { vehicleId: Number(id), status: 'ONGOING' },
  })
  if (activeTrip) {
    return NextResponse.json({ error: 'Cannot delete a vehicle with an active trip' }, { status: 409 })
  }

  await prisma.vehicle.delete({ where: { id: Number(id) } })
  return NextResponse.json({ success: true })
}
