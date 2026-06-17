'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Vehicle {
  id: number
  plateNumber: string
  name: string
  type: string
  isOccupied: boolean
}

export function LogForm() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [tripNumber, setTripNumber] = useState('')

  const [form, setForm] = useState({
    employeeNumber: '',
    vehicleId: '',
    startTime: '',
    startOdometer: '',
    startGasPercent: '',
  })

  useEffect(() => {
    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((data: Vehicle[]) => {
        setVehicles(data.filter((v) => !v.isOccupied))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeNumber: form.employeeNumber,
        vehicleId: Number(form.vehicleId),
        startTime: form.startTime,
        startOdometer: Number(form.startOdometer),
        startGasPercent: Number(form.startGasPercent),
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    setTripNumber(data.tripNumber)
  }

  if (tripNumber) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Trip Logged Successfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Your trip number is:</p>
          <p className="text-4xl font-bold tracking-widest text-center py-4 bg-muted rounded-lg">
            {tripNumber}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Please note this number. You will need it to complete your trip upon return.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setTripNumber('')
              setForm({ employeeNumber: '', vehicleId: '', startTime: '', startOdometer: '', startGasPercent: '' })
            }}
          >
            Log Another Trip
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Log a Trip</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="employeeNumber">Employee Number</Label>
            <Input
              id="employeeNumber"
              placeholder="e.g. EMP001"
              value={form.employeeNumber}
              onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="vehicle">Vehicle</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading vehicles...</p>
            ) : (
              <Select
                value={form.vehicleId}
                onValueChange={(val) => setForm({ ...form, vehicleId: val })}
                required
              >
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <SelectItem value="-" disabled>No vehicles available</SelectItem>
                  ) : (
                    vehicles.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} — {v.plateNumber} ({v.type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="startTime">Departure Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="startOdometer">Start Odometer (km)</Label>
            <Input
              id="startOdometer"
              type="number"
              min={0}
              step={0.1}
              placeholder="e.g. 12500"
              value={form.startOdometer}
              onChange={(e) => setForm({ ...form, startOdometer: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="startGasPercent">Fuel Level (%)</Label>
            <Input
              id="startGasPercent"
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="0 – 100"
              value={form.startGasPercent}
              onChange={(e) => setForm({ ...form, startGasPercent: e.target.value })}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !form.vehicleId}>
            {submitting ? 'Logging trip...' : 'Log Trip & Get Trip Number'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
