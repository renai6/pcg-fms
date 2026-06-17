import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { Sidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('fms_session')?.value
  const session = token ? await verifyToken(token) : null

  if (!session) redirect('/login')

  const userName = `${session.firstName} ${session.lastName}`

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={userName} />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  )
}
