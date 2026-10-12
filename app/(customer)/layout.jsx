import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CustomerNav from '@/components/customer/customer-nav'

export const metadata = {
  title: 'Member Portal | The Cartel Club',
}

export default async function CustomerLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#080A0A] text-[#F4F1E8] flex flex-col">
      <div className="grain-overlay" />
      <CustomerNav user={session.user} />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  )
}
