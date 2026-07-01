import Link from 'next/link'
import { Navigation, CircleCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-background">
      <div className="text-center">
        <div className="h-1 w-16 bg-primary rounded-full mx-auto mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">PCG Facility Management</h1>
        <p className="text-muted-foreground mt-3 text-base">Vehicle Trip Monitoring System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card className="shadow-sm border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" aria-hidden="true" />
              Log a Trip
            </CardTitle>
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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Complete a Trip
            </CardTitle>
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
