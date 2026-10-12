import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/admin-shell'

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

const VALID_SECTIONS = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  calendar: 'Calendar',
  tables: 'Tables',
  customers: 'Customers',
  loyalty: 'Loyalty & Rewards',
  tickets: 'Support Tickets',
  pos: 'Point of Sale',
  inventory: 'Products & Stock',
  suppliers: 'Suppliers & POs',
  payments: 'Payments',
  expenses: 'Expenses',
  finance: 'Financial Reports',
  analytics: 'Analytics',
  reports: 'Reports',
  employees: 'Employees',
  assets: 'Assets & Warranties',
  notifications: 'Notifications',
  settings: 'Settings',
  audit: 'Audit Logs',
  automation: 'Automation',
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const section = String(resolvedParams?.section || 'dashboard').toLowerCase()
  const title = VALID_SECTIONS[section] || 'Dashboard'
  return {
    title: `${title} — Admin | The Cartel Club`,
  }
}

export default async function AdminSectionPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    redirect('/admin/login')
  }

  const resolvedParams = await params
  const section = String(resolvedParams?.section || 'dashboard').toLowerCase()

  if (!VALID_SECTIONS[section]) {
    redirect('/admin/dashboard')
  }

  return <AdminShell user={session.user} initialSection={section} />
}

