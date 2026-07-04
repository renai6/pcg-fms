'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Room {
  id: number
  name: string
  floor: string | null
  capacity: number | null
}

interface ManageRoomsDialogProps {
  rooms: Room[]
}

const emptyForm = { name: '', floor: '', capacity: '' }

export function ManageRoomsDialog({ rooms }: ManageRoomsDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setAddOpen(true)
  }

  function openEdit(r: Room) {
    setForm({
      name: r.name,
      floor: r.floor ?? '',
      capacity: r.capacity != null ? String(r.capacity) : '',
    })
    setError('')
    setEditRoom(r)
  }

  async function handleAdd() {
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(data.error ?? 'Failed to add room')
      return
    }
    setAddOpen(false)
    router.refresh()
  }

  async function handleEdit() {
    if (!editRoom) return
    setError('')
    setSubmitting(true)
    const res = await fetch(`/api/rooms/${editRoom.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(data.error ?? 'Failed to update room')
      return
    }
    setEditRoom(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteRoom) return
    setError('')
    setSubmitting(true)
    const res = await fetch(`/api/rooms/${deleteRoom.id}`, { method: 'DELETE' })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete room')
      return
    }
    setDeleteRoom(null)
    router.refresh()
  }

  const roomFormFields = (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          placeholder="e.g. Conference Room A"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Floor (optional)</Label>
        <Input
          placeholder="e.g. 2nd Floor"
          value={form.floor}
          onChange={(e) => setForm({ ...form, floor: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Capacity (optional)</Label>
        <Input
          type="number"
          min={1}
          placeholder="e.g. 12"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Manage Rooms</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Rooms</DialogTitle>
            <DialogDescription>
              Add, edit, or remove the rooms available for booking.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button size="sm" onClick={openAdd}>
              Add Room
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No rooms yet. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.floor ?? '—'}</TableCell>
                      <TableCell>{r.capacity ?? '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setError('')
                            setDeleteRoom(r)
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
          </DialogHeader>
          {roomFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editRoom} onOpenChange={(o) => !o && setEditRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
          </DialogHeader>
          {roomFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoom(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteRoom} onOpenChange={(o) => !o && setDeleteRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteRoom?.name}</strong>? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoom(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
