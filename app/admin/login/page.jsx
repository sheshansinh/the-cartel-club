import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminLoginForm from '@/components/admin/admin-login-form'

export const metadata = {
  title: 'Admin Login | The Cartel Club',
}

export default async function AdminLoginPage() {
  // If already logged in as staff, skip the login page
  const session = await getServerSession(authOptions)
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
  if (session && STAFF_ROLES.includes(session.user?.role)) {
    redirect('/admin/dashboard')
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080A0A]" />}>
      <AdminLoginForm />
    </Suspense>
  )
}
