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
import { PageHeader } from '@/components/admin/page-header'

interface Personnel {
  id: number
  employeeNumber: string
  firstName: string
  lastName: string
  rank: string
  office: string
  contactNumber: string
  isAdmin: boolean
}

interface PersonnelTableProps {
  personnel: Personnel[]
}

const emptyForm = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  rank: '',
  office: '',
  contactNumber: '',
  isAdmin: false,
  password: '',
}

export function PersonnelTable({ personnel }: PersonnelTableProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editPerson, setEditPerson] = useState<Personnel | null>(null)
  const [deletePerson, setDeletePerson] = useState<Personnel | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setAddOpen(true)
  }

  function openEdit(p: Personnel) {
    setForm({
      employeeNumber: p.employeeNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      rank: p.rank,
      office: p.office,
      contactNumber: p.contactNumber,
      isAdmin: p.isAdmin,
      password: '',
    })
    setError('')
    setEditPerson(p)
  }

  async function handleAdd() {
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to add personnel'); return }
    setAddOpen(false)
    router.refresh()
  }

  async function handleEdit() {
    if (!editPerson) return
    setError('')
    setSubmitting(true)
    const res = await fetch(`/api/personnel/${editPerson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to update personnel'); return }
    setEditPerson(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deletePerson) return
    setSubmitting(true)
    const res = await fetch(`/api/personnel/${deletePerson.id}`, { method: 'DELETE' })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? 'Failed to delete personnel'); return }
    setDeletePerson(null)
    router.refresh()
  }

  const personnelFormFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>First Name</Label>
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Last Name</Label>
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Employee Number</Label>
        <Input value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Rank</Label>
        <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Office</Label>
        <Input value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Contact Number</Label>
        <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isAdmin"
          checked={form.isAdmin}
          onChange={(e) => setForm({ ...form, isAdmin: e.target.checked, password: '' })}
          className="h-4 w-4"
        />
        <Label htmlFor="isAdmin">Grant admin access</Label>
      </div>
      {form.isAdmin && (
        <div className="space-y-1">
          <Label>Password {editPerson ? '(leave blank to keep current)' : ''}</Label>
          <Input
            type="password"
            placeholder={editPerson ? 'Leave blank to keep current' : 'Set password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Personnel" description="Manage staff records and system access.">
        <Button onClick={openAdd}>Add Personnel</Button>
      </PageHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personnel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No personnel records yet.
                </TableCell>
              </TableRow>
            ) : (
              personnel.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.employeeNumber}</TableCell>
                  <TableCell>{p.firstName} {p.lastName}</TableCell>
                  <TableCell>{p.rank}</TableCell>
                  <TableCell>{p.office}</TableCell>
                  <TableCell>{p.contactNumber}</TableCell>
                  <TableCell>
                    {p.isAdmin ? (
                      <Badge>Admin</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Personnel</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeletePerson(p)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Personnel</DialogTitle>
          </DialogHeader>
          {personnelFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Personnel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editPerson} onOpenChange={(o) => !o && setEditPerson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Personnel</DialogTitle>
          </DialogHeader>
          {personnelFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPerson(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletePerson} onOpenChange={(o) => !o && setDeletePerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Personnel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deletePerson?.firstName} {deletePerson?.lastName}</strong>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePerson(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
