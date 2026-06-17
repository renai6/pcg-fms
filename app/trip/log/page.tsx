import { LogForm } from '@/components/trip/log-form'
import Link from 'next/link'

export default function TripLogPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background">
      <LogForm />
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        ← Back to home
      </Link>
    </main>
  )
}
