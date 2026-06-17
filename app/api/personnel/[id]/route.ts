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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
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

  const updateData: Record<string, unknown> = {
    employeeNumber,
    firstName,
    lastName,
    rank,
    office,
    contactNumber,
    isAdmin: !!isAdmin,
  }

  if (isAdmin && password) {
    updateData.passwordHash = await hashPassword(password)
  } else if (!isAdmin) {
    updateData.passwordHash = null
  }

  const personnel = await prisma.personnel.update({
    where: { id: Number(id) },
    data: updateData,
    select: personnelSelect,
  })
  return NextResponse.json(personnel)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const numId = Number(id)

  if (session.id === numId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 409 })
  }

  await prisma.personnel.delete({ where: { id: numId } })
  return NextResponse.json({ success: true })
}
