'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface TripDetails {
  id: number
  tripNumber: string
  startTime: string
  startOdometer: number
  startGasPercent: number
  vehicle: { plateNumber: string; name: string }
  personnel: { firstName: string; lastName: string; employeeNumber: string }
}

export function CompleteForm() {
  const [lookupNumber, setLookupNumber] = useState('')
  const [trip, setTrip] = useState<TripDetails | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [looking, setLooking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    endTime: '',
    endOdometer: '',
    endGasPercent: '',
  })

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLookupError('')
    setTrip(null)
    setLooking(true)

    const res = await fetch(`/api/trips/${lookupNumber.trim().toUpperCase()}`)
    const data = await res.json()
    setLooking(false)

    if (!res.ok) {
      setLookupError(data.error ?? 'Trip not found')
      return
    }

    setTrip(data)
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (!trip) return
    setSubmitError('')
    setSubmitting(true)

    const res = await fetch(`/api/trips/${trip.tripNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endTime: form.endTime,
        endOdometer: Number(form.endOdometer),
        endGasPercent: Number(form.endGasPercent),
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setSubmitError(data.error ?? 'Something went wrong')
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Trip Completed</CardTitle>
          <CardDescription>
            Trip {trip?.tripNumber} has been marked as completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setDone(false)
              setTrip(null)
              setLookupNumber('')
              setForm({ endTime: '', endOdometer: '', endGasPercent: '' })
            }}
          >
            Complete Another Trip
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete a Trip</CardTitle>
          <CardDescription>Enter your trip number to look up the trip.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-2">
            <Input
              placeholder="e.g. TRP-00001"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              required
            />
            <Button type="submit" disabled={looking}>
              {looking ? 'Looking up...' : 'Look Up'}
            </Button>
          </form>
          {lookupError && <p className="text-sm text-destructive mt-2">{lookupError}</p>}
        </CardContent>
      </Card>

      {trip && (
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Trip Number</span>
              <span className="font-medium">{trip.tripNumber}</span>
              <span className="text-muted-foreground">Vehicle</span>
              <span>{trip.vehicle.name} ({trip.vehicle.plateNumber})</span>
              <span className="text-muted-foreground">Driver</span>
              <span>{trip.personnel.firstName} {trip.personnel.lastName}</span>
              <span className="text-muted-foreground">Departure</span>
              <span>{new Date(trip.startTime).toLocaleString()}</span>
              <span className="text-muted-foreground">Start Odometer</span>
              <span>{trip.startOdometer} km</span>
              <span className="text-muted-foreground">Start Fuel</span>
              <span>{trip.startGasPercent}%</span>
            </div>

            <Separator />

            <form onSubmit={handleComplete} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="endTime">Arrival Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endOdometer">End Odometer (km)</Label>
                <Input
                  id="endOdometer"
                  type="number"
                  min={trip.startOdometer}
                  step={0.1}
                  placeholder={`≥ ${trip.startOdometer}`}
                  value={form.endOdometer}
                  onChange={(e) => setForm({ ...form, endOdometer: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endGasPercent">End Fuel Level (%)</Label>
                <Input
                  id="endGasPercent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="0 – 100"
                  value={form.endGasPercent}
                  onChange={(e) => setForm({ ...form, endGasPercent: e.target.value })}
                  required
                />
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Completing...' : 'Mark as Completed'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
