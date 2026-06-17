'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Vehicle {
  id: number
  name: string
  plateNumber: string
}

interface TripFiltersProps {
  vehicles: Vehicle[]
}

export function TripFilters({ vehicles }: TripFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1">
        <Label>Vehicle</Label>
        <Select
          value={searchParams.get('vehicleId') ?? 'all'}
          onValueChange={(v) => updateParam('vehicleId', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vehicles</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name} ({v.plateNumber})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Status</Label>
        <Select
          value={searchParams.get('status') ?? 'all'}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ONGOING">Ongoing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Date</Label>
        <Input
          type="date"
          className="w-44"
          value={searchParams.get('date') ?? ''}
          onChange={(e) => updateParam('date', e.target.value)}
        />
      </div>

      <Button
        variant="outline"
        onClick={() => router.push(pathname)}
      >
        Clear Filters
      </Button>
    </div>
  )
}
