"use client"

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import AdminSidebar from '@/components/admin/admin-sidebar'
import AdminDashboard from '@/components/admin/admin-dashboard'
import AdminBookings from '@/components/admin/admin-bookings'
import AdminCalendar from '@/components/admin/admin-calendar'
import AdminTables from '@/components/admin/admin-tables'
import AdminCustomers from '@/components/admin/admin-customers'
import AdminPayments from '@/components/admin/admin-payments'
import AdminInventory from '@/components/admin/admin-inventory'
import AdminAnalytics from '@/components/admin/admin-analytics'
import AdminReports from '@/components/admin/admin-reports'
import AdminSettings from '@/components/admin/admin-settings'
import AdminAutomation from '@/components/admin/admin-automation'
import AdminLoyalty from '@/components/admin/admin-loyalty'
import AdminPOS from '@/components/admin/admin-pos'
import AdminSuppliers from '@/components/admin/admin-suppliers'
import AdminExpenses from '@/components/admin/admin-expenses'
import AdminFinance from '@/components/admin/admin-finance'
import AdminEmployees from '@/components/admin/admin-employees'
import AdminAssets from '@/components/admin/admin-assets'
import AdminTickets from '@/components/admin/admin-tickets'
import ComingSoon from '@/components/admin/coming-soon'

export default function AdminShell({ user, initialSection = 'dashboard' }) {
  const pathname = usePathname()
  const router = useRouter()

  const sectionFromPath = (() => {
    const parts = String(pathname || '').split('/').filter(Boolean)
    // e.g. ['admin', 'bookings'] -> 'bookings'
    if (parts[0] === 'admin' && parts[1] && parts[1] !== 'login') {
      return parts[1].toLowerCase()
    }
    return initialSection || 'dashboard'
  })()

  const [activeTab, setActiveTab] = useState(sectionFromPath)

  useEffect(() => {
    setActiveTab(sectionFromPath)
  }, [sectionFromPath])

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab)
    const targetPath = `/admin/${nextTab}`
    if (pathname !== targetPath) {
      router.push(targetPath)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080A0A]">
      <AdminSidebar activeTab={activeTab} setActiveTab={handleTabChange} />

      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsContent value="dashboard" className="mt-0"><AdminDashboard /></TabsContent>
            <TabsContent value="bookings" className="mt-0"><AdminBookings /></TabsContent>
            <TabsContent value="calendar" className="mt-0"><AdminCalendar /></TabsContent>
            <TabsContent value="tables" className="mt-0"><AdminTables /></TabsContent>
            <TabsContent value="customers" className="mt-0"><AdminCustomers /></TabsContent>
            <TabsContent value="payments" className="mt-0"><AdminPayments /></TabsContent>
            <TabsContent value="inventory" className="mt-0"><AdminInventory /></TabsContent>
            <TabsContent value="analytics" className="mt-0"><AdminAnalytics /></TabsContent>
            <TabsContent value="reports" className="mt-0"><AdminReports /></TabsContent>
            <TabsContent value="settings" className="mt-0"><AdminSettings /></TabsContent>
            <TabsContent value="automation" className="mt-0"><AdminAutomation /></TabsContent>
            <TabsContent value="loyalty" className="mt-0"><AdminLoyalty /></TabsContent>
            <TabsContent value="pos" className="mt-0"><AdminPOS /></TabsContent>
            <TabsContent value="suppliers" className="mt-0"><AdminSuppliers /></TabsContent>
            <TabsContent value="expenses" className="mt-0"><AdminExpenses /></TabsContent>
            <TabsContent value="finance" className="mt-0"><AdminFinance /></TabsContent>
            <TabsContent value="employees" className="mt-0"><AdminEmployees /></TabsContent>
            <TabsContent value="assets" className="mt-0"><AdminAssets /></TabsContent>
            <TabsContent value="tickets" className="mt-0"><AdminTickets /></TabsContent>
            <TabsContent value="notifications" className="mt-0"><ComingSoon title="Notifications" phase={7} /></TabsContent>
            <TabsContent value="audit" className="mt-0"><ComingSoon title="Audit Logs" phase={7} /></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
