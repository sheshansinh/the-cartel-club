"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, CalendarDays, Calendar,
  Table2, Users, CreditCard, ShoppingCart,
  Package, Truck, BarChart3, FileText,
  Settings, LogOut, Gift,
  DollarSign, UserCog, Wrench, HeadphonesIcon,
  ClipboardList, Bell, Shield, ChevronRight,
} from 'lucide-react'

// ── Menu definition ──────────────────────────────────────────────────────────
// roles: which staff roles can see this item. Empty = all staff.
const menuSections = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard',  label: 'Dashboard',       icon: LayoutDashboard, href: '/admin/dashboard' },
      { id: 'bookings',   label: 'Bookings',         icon: CalendarDays,    href: '/admin/bookings' },
      { id: 'calendar',   label: 'Calendar',         icon: Calendar,        href: '/admin/calendar' },
      { id: 'tables',     label: 'Tables',           icon: Table2,          href: '/admin/tables' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { id: 'customers',  label: 'Customers',         icon: Users, href: '/admin/customers' },
      { id: 'loyalty',    label: 'Loyalty & Rewards', icon: Gift,  href: '/admin/loyalty' },
    ],
  },
  {
    label: 'Sales & Inventory',
    items: [
      { id: 'pos',        label: 'Point of Sale',    icon: ShoppingCart, href: '/admin/pos' },
      { id: 'inventory',  label: 'Products & Stock', icon: Package,      href: '/admin/inventory' },
      { id: 'suppliers',  label: 'Suppliers & POs',  icon: Truck,        href: '/admin/suppliers' },
      { id: 'payments',   label: 'Payments',         icon: CreditCard,   href: '/admin/payments' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'expenses',   label: 'Expenses',          icon: DollarSign, href: '/admin/expenses',
        roles: ['SUPER_ADMIN','BUSINESS_OWNER','MANAGER','ACCOUNTANT'] },
      { id: 'finance',    label: 'Financial Reports', icon: BarChart3,  href: '/admin/finance',
        roles: ['SUPER_ADMIN','BUSINESS_OWNER','MANAGER','ACCOUNTANT'] },
      { id: 'analytics',  label: 'Analytics',         icon: FileText,      href: '/admin/analytics' },
      { id: 'reports',    label: 'Reports',           icon: ClipboardList, href: '/admin/reports' },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'employees',  label: 'Employees',           icon: UserCog, href: '/admin/employees',
        roles: ['SUPER_ADMIN','BUSINESS_OWNER','MANAGER'] },
      { id: 'assets',     label: 'Assets & Warranties', icon: Wrench,  href: '/admin/assets',
        roles: ['SUPER_ADMIN','BUSINESS_OWNER','MANAGER'] },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell,     href: '/admin/notifications' },
      { id: 'settings',      label: 'Settings',      icon: Settings, href: '/admin/settings',
        roles: ['SUPER_ADMIN','BUSINESS_OWNER'] },
      { id: 'audit',         label: 'Audit Logs',    icon: Shield,   href: '/admin/audit',
        roles: ['SUPER_ADMIN','BUSINESS_OWNER'] },
    ],
  },
]

export default function AdminSidebar({ activeTab, setActiveTab }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  const canSee = (item) => {
    if (!item.roles) return true
    return item.roles.includes(role)
  }

  return (
    <aside className="w-64 h-screen sticky top-0 shrink-0 bg-[#111615] border-r border-white/10 flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10 shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <img
            src="/images/logo.jpg"
            alt="The Cartel Club Logo"
            className="w-10 h-10 rounded-xl object-contain bg-black border border-white/15 p-0.5 shrink-0"
          />
          <div>
            <h1 className="text-lg font-bold font-space-grotesk text-[#B6F36B] tracking-wide leading-tight">
              CARTEL CLUB
            </h1>
            <p className="text-[11px] text-[#929B95]">Business Management</p>
          </div>
        </Link>
      </div>

      {/* User badge */}
      {session?.user && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-lg bg-white/5 border border-white/10 shrink-0">
          <p className="text-xs font-medium text-[#F4F1E8] truncate">
            {session.user.name || session.user.email}
          </p>
          <p className="text-xs text-[#929B95] mt-0.5">
            {role.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      {/* Scrollable Nav */}
      <nav className="flex-1 min-h-0 overflow-y-scroll px-3 py-4 space-y-5 sidebar-scrollbar">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter(canSee)
          if (!visibleItems.length) return null

          return (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-[#929B95]/60 uppercase tracking-widest px-3 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    pathname === item.href || activeTab === item.id
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setActiveTab && setActiveTab(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                        transition-all duration-150 group
                        ${isActive
                          ? 'bg-[#B6F36B]/15 text-[#B6F36B] font-medium'
                          : 'text-[#929B95] hover:bg-white/5 hover:text-[#F4F1E8]'}
                      `}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10 shrink-0 bg-[#111615]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
            text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
