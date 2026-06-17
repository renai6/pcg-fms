import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripNumber: string }> }
) {
  const { tripNumber } = await params

  const trip = await prisma.trip.findUnique({
    where: { tripNumber },
    include: {
      vehicle: { select: { plateNumber: true, name: true } },
      personnel: { select: { firstName: true, lastName: true, employeeNumber: true } },
    },
  })

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }
  if (trip.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Trip already completed' }, { status: 409 })
  }

  return NextResponse.json(trip)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripNumber: string }> }
) {
  const { tripNumber } = await params
  const body = await request.json()
  const { endTime, endOdometer, endGasPercent } = body as {
    endTime: string
    endOdometer: number
    endGasPercent: number
  }

  if (!endTime || endOdometer == null || endGasPercent == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const trip = await prisma.trip.findUnique({ where: { tripNumber } })
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }
  if (trip.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Trip already completed' }, { status: 409 })
  }

  if (Number(endOdometer) < trip.startOdometer) {
    return NextResponse.json({ error: 'End odometer must be ≥ start odometer' }, { status: 400 })
  }
  if (new Date(endTime) <= trip.startTime) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  }
  if (Number(endGasPercent) < 0 || Number(endGasPercent) > 100) {
    return NextResponse.json({ error: 'Gas percent must be between 0 and 100' }, { status: 400 })
  }

  const updated = await prisma.trip.update({
    where: { tripNumber },
    data: {
      endTime: new Date(endTime),
      endOdometer: Number(endOdometer),
      endGasPercent: Number(endGasPercent),
      status: 'COMPLETED',
    },
  })

  return NextResponse.json(updated)
}
