"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Menu, X, User } from 'lucide-react'
import BookingModal from '@/components/booking-modal'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/gallery', label: 'Gallery' },
    // { href: '#book-popup', label: 'Book Your Table', isBookingTrigger: true },
    { href: '/contact', label: 'Contact' },
  ]

  const accountHref = session?.user
    ? session.user.role === 'CUSTOMER'
      ? '/dashboard'
      : '/admin'
    : '/login'

  const accountLabel = session?.user
    ? session.user.name?.split(' ')[0] || 'My Portal'
    : 'Sign In'

  return (
    <header className="fixed top-3 sm:top-4 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none">
      <nav className="max-w-7xl mx-auto pointer-events-auto rounded-2xl bg-[#080A0A]/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-[68px]">
            {/* Logo */}
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-bold font-space-grotesk text-[#B6F36B] tracking-tight"
            >
              <img
                src="/images/logo.jpg"
                alt="The Cartel Club Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-black border border-white/15 p-0.5 shrink-0"
              />
              <span>THE CARTEL CLUB</span>
            </Link>

            {/* Desktop Center Navigation Pill */}
            <div className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-white/[0.03] border border-white/10">
              {navLinks.map((link) => {
                if (link.isBookingTrigger) {
                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => setIsBookingModalOpen(true)}
                      className="px-4 py-1.5 rounded-full text-sm font-medium text-[#F4F1E8] hover:text-[#B6F36B] hover:bg-white/[0.04] transition-all"
                    >
                      {link.label}
                    </button>
                  )
                }

                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#B6F36B]/15 text-[#B6F36B] border border-[#B6F36B]/30'
                        : 'text-[#F4F1E8] hover:text-[#B6F36B] hover:bg-white/[0.04]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href={accountHref}
                className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-sm font-medium text-[#F4F1E8] hover:text-[#B6F36B] hover:border-[#B6F36B]/30 transition-all flex items-center gap-1.5"
              >
                <User className="w-4 h-4 text-[#B6F36B]" />
                {accountLabel}
              </Link>

              <Button
                onClick={() => setIsBookingModalOpen(true)}
                className="rounded-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 px-5 h-10 font-semibold shadow-[0_4px_20px_rgba(182,243,107,0.25)]"
              >
                Book Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#F4F1E8] hover:text-[#B6F36B] transition-colors"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-white/10">
              <div className="flex flex-col gap-1.5">
                {navLinks.map((link) => {
                  if (link.isBookingTrigger) {
                    return (
                      <button
                        key={link.label}
                        type="button"
                        onClick={() => {
                          setIsOpen(false)
                          setIsBookingModalOpen(true)
                        }}
                        className="text-left px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#F4F1E8] hover:text-[#B6F36B] hover:bg-white/[0.04] transition-colors"
                      >
                        {link.label}
                      </button>
                    )
                  }

                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#B6F36B]/15 text-[#B6F36B] border border-[#B6F36B]/25'
                          : 'text-[#F4F1E8] hover:text-[#B6F36B] hover:bg-white/[0.04]'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                })}

                <div className="pt-2 mt-1 border-t border-white/10 flex flex-col gap-2.5">
                  <Link
                    href={accountHref}
                    className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm font-medium text-[#B6F36B] hover:bg-white/[0.06] flex items-center justify-center gap-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    {accountLabel}
                  </Link>
                  <Button
                    onClick={() => {
                      setIsBookingModalOpen(true)
                      setIsOpen(false)
                    }}
                    className="rounded-xl bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 w-full h-11 font-semibold"
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Booking Modal */}
      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
    </header>
  )
}
