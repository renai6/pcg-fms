import { CompleteForm } from '@/components/trip/complete-form'
import Link from 'next/link'

export default function TripCompletePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-background">
      <CompleteForm />
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        ← Back to home
      </Link>
    </main>
  )
}
