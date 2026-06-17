import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TripFilters } from '@/components/admin/trip-filters'

interface PageProps {
  searchParams: Promise<{ vehicleId?: string; status?: string; date?: string }>
}

async function getData(filters: { vehicleId?: string; status?: string; date?: string }) {
  const where: Record<string, unknown> = {}

  if (filters.vehicleId) {
    where.vehicleId = Number(filters.vehicleId)
  }
  if (filters.status === 'ONGOING' || filters.status === 'COMPLETED') {
    where.status = filters.status
  }
  if (filters.date) {
    const day = new Date(filters.date)
    const nextDay = new Date(filters.date)
    nextDay.setDate(nextDay.getDate() + 1)
    where.createdAt = { gte: day, lt: nextDay }
  }

  const [trips, vehicles] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { plateNumber: true, name: true } },
        personnel: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vehicle.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, plateNumber: true } }),
  ])

  return { trips, vehicles }
}

export default async function TripsPage({ searchParams }: PageProps) {
  const filters = await searchParams
  const { trips, vehicles } = await getData(filters)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Trip Log</h1>

      <Suspense fallback={<div className="h-10 animate-pulse bg-muted rounded-md" />}>
        <TripFilters vehicles={vehicles} />
      </Suspense>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip #</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Arrival</TableHead>
              <TableHead>Start Odo</TableHead>
              <TableHead>End Odo</TableHead>
              <TableHead>Start Fuel</TableHead>
              <TableHead>End Fuel</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No trips found.
                </TableCell>
              </TableRow>
            ) : (
              trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.tripNumber}</TableCell>
                  <TableCell>{t.vehicle.name} ({t.vehicle.plateNumber})</TableCell>
                  <TableCell>
                    {t.personnel.firstName} {t.personnel.lastName}
                  </TableCell>
                  <TableCell>{new Date(t.startTime).toLocaleString()}</TableCell>
                  <TableCell>{t.endTime ? new Date(t.endTime).toLocaleString() : '—'}</TableCell>
                  <TableCell>{t.startOdometer} km</TableCell>
                  <TableCell>{t.endOdometer != null ? `${t.endOdometer} km` : '—'}</TableCell>
                  <TableCell>{t.startGasPercent}%</TableCell>
                  <TableCell>{t.endGasPercent != null ? `${t.endGasPercent}%` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'ONGOING' ? 'default' : 'secondary'}>
                      {t.status === 'ONGOING' ? 'Ongoing' : 'Completed'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
