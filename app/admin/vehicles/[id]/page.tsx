import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

async function getVehicleDetail(id: number) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      trips: {
        include: {
          personnel: { select: { firstName: true, lastName: true, employeeNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vehicle = await getVehicleDetail(Number(id))
  if (!vehicle) notFound()

  const activeTrip = vehicle.trips.find((t) => t.status === 'ONGOING')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/vehicles" className="text-sm text-muted-foreground hover:text-foreground">
          ← Vehicles
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{vehicle.name}</span>
            <Badge variant={activeTrip ? 'default' : 'secondary'}>
              {activeTrip ? 'Occupied' : 'Available'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <span className="text-muted-foreground">Plate Number</span>
          <span className="font-medium">{vehicle.plateNumber}</span>
          <span className="text-muted-foreground">Type</span>
          <span>{vehicle.type}</span>
          {activeTrip && (
            <>
              <span className="text-muted-foreground">Current Driver</span>
              <span>
                {activeTrip.personnel.firstName} {activeTrip.personnel.lastName} (
                {activeTrip.personnel.employeeNumber})
              </span>
              <span className="text-muted-foreground">Trip Number</span>
              <span>{activeTrip.tripNumber}</span>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Trip History</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip #</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Start Odo (km)</TableHead>
                <TableHead>End Odo (km)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicle.trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No trips recorded for this vehicle.
                  </TableCell>
                </TableRow>
              ) : (
                vehicle.trips.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.tripNumber}</TableCell>
                    <TableCell>
                      {t.personnel.firstName} {t.personnel.lastName}
                    </TableCell>
                    <TableCell>{new Date(t.startTime).toLocaleString()}</TableCell>
                    <TableCell>{t.endTime ? new Date(t.endTime).toLocaleString() : '—'}</TableCell>
                    <TableCell>{t.startOdometer}</TableCell>
                    <TableCell>{t.endOdometer ?? '—'}</TableCell>
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
    </div>
  )
}
