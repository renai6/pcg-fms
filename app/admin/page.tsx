import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/admin/page-header'
import { Car, Activity, Route, Users } from 'lucide-react'

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
    { title: 'Total Vehicles', value: stats.totalVehicles, icon: Car },
    { title: 'Currently Occupied', value: stats.occupiedVehicles, icon: Activity },
    { title: 'Trips Today', value: stats.tripsToday, icon: Route },
    { title: 'Total Personnel', value: stats.totalPersonnel, icon: Users },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Dashboard" description="Overview of fleet and facility activity." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <card.icon className="size-4" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
