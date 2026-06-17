import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { employeeNumber, vehicleId, startTime, startOdometer, startGasPercent } = body as {
    employeeNumber: string
    vehicleId: number
    startTime: string
    startOdometer: number
    startGasPercent: number
  }

  if (!employeeNumber || !vehicleId || !startTime || startOdometer == null || startGasPercent == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (Number(startGasPercent) < 0 || Number(startGasPercent) > 100) {
    return NextResponse.json({ error: 'Gas percent must be between 0 and 100' }, { status: 400 })
  }

  const personnel = await prisma.personnel.findUnique({ where: { employeeNumber } })
  if (!personnel) {
    return NextResponse.json({ error: 'Employee number not found' }, { status: 404 })
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const activeTrip = await prisma.trip.findFirst({
    where: { vehicleId: Number(vehicleId), status: 'ONGOING' },
  })
  if (activeTrip) {
    return NextResponse.json({ error: 'Vehicle is currently on an active trip' }, { status: 409 })
  }

  const trip = await prisma.$transaction(async (tx) => {
    const count = await tx.trip.count()
    const tripNumber = `TRP-${String(count + 1).padStart(5, '0')}`
    return tx.trip.create({
      data: {
        tripNumber,
        vehicleId: Number(vehicleId),
        personnelId: personnel.id,
        startTime: new Date(startTime),
        startOdometer: Number(startOdometer),
        startGasPercent: Number(startGasPercent),
        status: 'ONGOING',
      },
    })
  })

  return NextResponse.json({ tripNumber: trip.tripNumber }, { status: 201 })
}
