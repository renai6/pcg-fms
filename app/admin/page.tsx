import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function getStats() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [totalVehicles, occupiedVehicles, tripsToday, totalPersonnel] = await Promise.all([
    prisma.vehicle.count(),
    prisma.trip.count({ where: { status: 'ONGOING' } }),
    prisma.trip.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.personnel.count(),
  ])

  return { totalVehicles, occupiedVehicles, tripsToday, totalPersonnel }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  const cards = [
    { title: 'Total Vehicles', value: stats.totalVehicles },
    { title: 'Currently Occupied', value: stats.occupiedVehicles },
    { title: 'Trips Today', value: stats.tripsToday },
    { title: 'Total Personnel', value: stats.totalPersonnel },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
