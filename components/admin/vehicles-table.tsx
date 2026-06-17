'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

interface Vehicle {
  id: number
  plateNumber: string
  name: string
  type: string
  isOccupied: boolean
  currentDriver: string | null
}

interface VehiclesTableProps {
  vehicles: Vehicle[]
}

const emptyForm = { plateNumber: '', name: '', type: '' }

export function VehiclesTable({ vehicles }: VehiclesTableProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setAddOpen(true)
  }

  function openEdit(v: Vehicle) {
    setForm({ plateNumber: v.plateNumber, name: v.name, type: v.type })
    setError('')
    setEditVehicle(v)
  }

  async function handleAdd() {
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to add vehicle'); return }
    setAddOpen(false)
    router.refresh()
  }

  async function handleEdit() {
    if (!editVehicle) return
    setError('')
    setSubmitting(true)
    const res = await fetch(`/api/vehicles/${editVehicle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update vehicle'); return }
    setEditVehicle(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteVehicle) return
    setSubmitting(true)
    const res = await fetch(`/api/vehicles/${deleteVehicle.id}`, { method: 'DELETE' })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to delete vehicle'); return }
    setDeleteVehicle(null)
    router.refresh()
  }

  const VehicleForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Plate Number</Label>
        <Input
          placeholder="e.g. ABC 123"
          value={form.plateNumber}
          onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          placeholder="e.g. Service Van 1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Type</Label>
        <Input
          placeholder="e.g. Van, Truck, Sedan"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vehicles</h1>
        <Button onClick={openAdd}>Add Vehicle</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Driver</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No vehicles yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/vehicles/${v.id}`} className="hover:underline">
                      {v.plateNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.type}</TableCell>
                  <TableCell>
                    <Badge variant={v.isOccupied ? 'default' : 'secondary'}>
                      {v.isOccupied ? 'Occupied' : 'Available'}
                    </Badge>
                  </TableCell>
                  <TableCell>{v.currentDriver ?? '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteVehicle(v)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editVehicle} onOpenChange={(o) => !o && setEditVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVehicle(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteVehicle} onOpenChange={(o) => !o && setDeleteVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteVehicle?.name} ({deleteVehicle?.plateNumber})</strong>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVehicle(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
