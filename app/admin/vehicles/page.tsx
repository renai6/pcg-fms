import { prisma } from '@/lib/prisma'
import { VehiclesTable } from '@/components/admin/vehicles-table'

async function getVehicles() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'ONGOING' },
        select: {
          personnel: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return vehicles.map((v) => ({
    id: v.id,
    plateNumber: v.plateNumber,
    name: v.name,
    type: v.type,
    isOccupied: v.trips.length > 0,
    currentDriver: v.trips[0]?.personnel
      ? `${v.trips[0].personnel.firstName} ${v.trips[0].personnel.lastName}`
      : null,
  }))
}

export default async function VehiclesPage() {
  const vehicles = await getVehicles()
  return (
    <div className="p-6">
      <VehiclesTable vehicles={vehicles} />
    </div>
  )
}
