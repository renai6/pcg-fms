import { prisma } from '@/lib/prisma'
import { PersonnelTable } from '@/components/admin/personnel-table'

async function getPersonnel() {
  return prisma.personnel.findMany({
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      rank: true,
      office: true,
      contactNumber: true,
      isAdmin: true,
    },
    orderBy: { lastName: 'asc' },
  })
}

export default async function PersonnelPage() {
  const personnel = await getPersonnel()
  return (
    <div className="p-6">
      <PersonnelTable personnel={personnel} />
    </div>
  )
}
