import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hashPassword } from '@/lib/auth'

const personnelSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  rank: true,
  office: true,
  contactNumber: true,
  isAdmin: true,
  createdAt: true,
}

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const personnel = await prisma.personnel.findMany({
    select: personnelSelect,
    orderBy: { lastName: 'asc' },
  })
  return NextResponse.json(personnel)
}

export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { employeeNumber, firstName, lastName, rank, office, contactNumber, isAdmin, password } =
    body as {
      employeeNumber: string
      firstName: string
      lastName: string
      rank: string
      office: string
      contactNumber: string
      isAdmin: boolean
      password?: string
    }

  if (!employeeNumber || !firstName || !lastName || !rank || !office || !contactNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (isAdmin && !password) {
    return NextResponse.json({ error: 'Password required for admin accounts' }, { status: 400 })
  }

  const existing = await prisma.personnel.findUnique({ where: { employeeNumber } })
  if (existing) {
    return NextResponse.json({ error: 'Employee number already exists' }, { status: 409 })
  }

  const passwordHash = isAdmin && password ? await hashPassword(password) : null

  const personnel = await prisma.personnel.create({
    data: { employeeNumber, firstName, lastName, rank, office, contactNumber, isAdmin: !!isAdmin, passwordHash },
    select: personnelSelect,
  })
  return NextResponse.json(personnel, { status: 201 })
}
