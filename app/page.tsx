import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-muted/30">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold tracking-tight shadow-sm">
          PCG
        </div>
        <h1 className="text-3xl font-bold tracking-tight">PCG Facility Management</h1>
        <p className="text-muted-foreground mt-2">Vehicle Trip Monitoring System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Log a Trip</CardTitle>
            <CardDescription>
              Starting a trip? Enter your details to log your departure and receive a trip number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/trip/log">Start Trip Log</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complete a Trip</CardTitle>
            <CardDescription>
              Returning from a trip? Enter your trip number to update the status to completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/trip/complete">Complete Trip</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Book a Room</CardTitle>
            <CardDescription>
              Reserve a room and see the day&apos;s schedule of who is using which room.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/rooms">Room Schedule</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Admin?{' '}
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          Sign in here
        </Link>
      </p>
    </main>
  )
}
