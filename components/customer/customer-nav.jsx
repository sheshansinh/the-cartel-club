"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import BookingModal from '@/components/booking-modal'
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  User,
  PlusCircle,
  LogOut,
  Home,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/bookings', label: 'My Bookings', icon: Calendar },
  { href: '/rewards', label: 'Rewards', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
]

export default function CustomerNav({ user }) {
  const pathname = usePathname()
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-[#080A0A]/95 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Back to Home + Brand */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#B6F36B]/15 border border-white/10 hover:border-[#B6F36B]/40 text-xs font-semibold text-[#F4F1E8] hover:text-[#B6F36B] transition-all"
              title="Back to Home Page"
            >
              <Home className="w-3.5 h-3.5 text-[#B6F36B]" />
              <span>Home</span>
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base sm:text-lg font-bold font-space-grotesk text-[#B6F36B] tracking-tight"
            >
              <img
                src="/images/logo.jpg"
                alt="The Cartel Club Logo"
                className="w-8 h-8 rounded-lg object-contain bg-black border border-white/15 p-0.5 shrink-0"
              />
              <span className="hidden xs:inline sm:inline">CARTEL CLUB</span>
            </Link>

            <span className="hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-[#B6F36B]/15 text-[#B6F36B] border border-[#B6F36B]/30 font-semibold">
              VIP Portal
            </span>
          </div>

          {/* Center: Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#111615] p-1 rounded-xl border border-white/10">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#B6F36B] text-[#080A0A] shadow-sm'
                      : 'text-[#929B95] hover:text-[#F4F1E8] hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold text-xs h-9 px-3.5 rounded-xl shadow-md shadow-[#B6F36B]/10"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Book Table
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="h-9 px-2.5 rounded-xl text-[#929B95] hover:text-red-400 hover:bg-red-500/10"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5 text-xs">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Secondary Pill Nav (4 equal tabs, no ugly scrollbar) */}
        <div className="grid grid-cols-4 gap-1.5 py-2 border-t border-white/5 md:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-[#B6F36B] text-[#080A0A] shadow-sm'
                    : 'bg-[#111615] text-[#929B95] hover:text-[#F4F1E8] border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </header>
  )
}
