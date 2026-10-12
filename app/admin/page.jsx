import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Admin | The Cartel Club',
}

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'RECEPTIONIST',
  'CASHIER',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
  'SUPPORT_AGENT',
]

export default async function AdminRootPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    redirect('/admin/login')
  }

  redirect('/admin/dashboard')
}
