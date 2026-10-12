'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BookingModal from '@/components/booking-modal'
import {
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Gift,
  Trophy,
  Radio,
  UserCheck,
  History,
  LayoutDashboard,
} from 'lucide-react'

const STATUS_BADGE = {
  CONFIRMED: {
    label: 'Upcoming • Confirmed',
    bg: 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30',
    dot: 'bg-[#00FF88]',
  },
  CHECKED_IN: {
    label: 'Live Now • Checked In',
    bg: 'bg-[#FFB800]/15 text-[#FFB800] border-[#FFB800]/30',
    dot: 'bg-[#FFB800]',
  },
  PENDING: {
    label: 'Pending Confirmation',
    bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  COMPLETED: {
    label: 'Completed Session',
    bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-red-500/15 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
}

function formatBookingDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function MemberActivityBanner() {
  const { data: session, status } = useSession()
  const [bookings, setBookings] = useState([])
  const [rewardData, setRewardData] = useState(null)
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)

  const openBookingPopup = (table = null) => {
    setSelectedTable(table)
    setIsBookingModalOpen(true)
  }

  useEffect(() => {
    let active = true

    async function loadActivity() {
      try {
        const tablesPromise = fetch('/api/tables', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : { tables: [] }))
          .catch(() => ({ tables: [] }))

        if (status === 'authenticated') {
          const [tData, bData, rData] = await Promise.all([
            tablesPromise,
            fetch('/api/bookings?limit=4', { cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : { bookings: [] }))
              .catch(() => ({ bookings: [] })),
            fetch('/api/rewards', { cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
          ])
          if (!active) return
          setTables(Array.isArray(tData?.tables) ? tData.tables : [])
          setBookings(Array.isArray(bData?.bookings) ? bData.bookings : [])
          setRewardData(rData)
          setLoading(false)
        } else if (status === 'unauthenticated') {
          const tData = await tablesPromise
          if (!active) return
          setTables(Array.isArray(tData?.tables) ? tData.tables : [])
          setLoading(false)
        }
      } catch {
        if (active) setLoading(false)
      }
    }

    loadActivity()
    return () => {
      active = false
    }
  }, [status, isBookingModalOpen])

  const upcomingBookings = bookings.filter((b) =>
    ['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(b.status)
  )
  const featuredBooking = upcomingBookings[0] || bookings[0] || null
  const secondaryBookings = bookings
    .filter((b) => b.id !== featuredBooking?.id)
    .slice(0, 3)

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE')
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED')

  const profile = rewardData?.profile
  const minHours = rewardData?.rules?.minHoursForReward || 5
  const currentCycleHours = Number(profile?.totalPlayingHours || 0)
  const cyclePct = Math.min(100, Math.round((currentCycleHours / minHours) * 100))

  return (
    <section className="relative z-20 -mt-6 sm:-mt-10 pb-10 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#121614]/95 via-[#0E1110]/95 to-[#0B0D0C]/95 backdrop-blur-xl p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden"
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#00FF88]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#FFB800]/10 blur-3xl" />

          {/* Top Header Strip */}
          <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF88]" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#00FF88]">
                {status === 'authenticated'
                  ? 'Your Live Activity & Schedule'
                  : 'Live Club Activity & Instant Booking'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tables.length > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/75">
                  <Radio className="w-3.5 h-3.5 text-[#00FF88]" />
                  <span>
                    <strong className="text-white">{availableTables.length}</strong> of{' '}
                    {tables.length} Tables Available Now
                  </span>
                  {occupiedTables.length > 0 && (
                    <span className="text-[#FFB800] font-semibold">
                      • {occupiedTables.length} Playing Live
                    </span>
                  )}
                </div>
              )}

              {status === 'authenticated' ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00FF88]/15 border border-[#00FF88]/30 text-[#00FF88] text-xs font-bold hover:bg-[#00FF88]/25 transition-all"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Member Portal
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-[#00FF88] hover:border-[#00FF88]/30 text-xs font-semibold transition-all"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#00FF88]" />
                  Member Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Authenticated Member View */}
          {status === 'authenticated' && (
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Primary Booking / Schedule Spotlight (8 cols) */}
              <div className="lg:col-span-8 flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                {featuredBooking ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            STATUS_BADGE[featuredBooking.status]?.bg ||
                            'bg-white/10 text-white/70 border-white/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              STATUS_BADGE[featuredBooking.status]?.dot || 'bg-white'
                            }`}
                          />
                          {STATUS_BADGE[featuredBooking.status]?.label ||
                            featuredBooking.status}
                        </span>
                        <span className="text-xs font-mono text-white/40">
                          #{featuredBooking.bookingRef}
                        </span>
                      </div>

                      <Link
                        href="/bookings"
                        className="text-xs font-semibold text-[#00FF88] hover:underline inline-flex items-center gap-1"
                      >
                        View All Bookings <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Main callout message */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#00FF88]/[0.08] via-white/[0.02] to-transparent border border-[#00FF88]/20 rounded-2xl p-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/15 border border-[#00FF88]/30 flex items-center justify-center shrink-0">
                          <Calendar className="w-6 h-6 text-[#00FF88]" />
                        </div>
                        <div>
                          <p className="text-xs text-white/55 font-medium">
                            {['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(
                              featuredBooking.status
                            )
                              ? `Hey ${session?.user?.name?.split(' ')[0] || 'Player'}, you have a reservation booked!`
                              : `Hey ${session?.user?.name?.split(' ')[0] || 'Player'}, here is your recent table session:`}
                          </p>
                          <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                            {featuredBooking.table?.name ||
                              `Table #${featuredBooking.table?.tableNumber || ''}`}{' '}
                            <span className="text-[#00FF88]">
                              • {formatBookingDate(featuredBooking.bookingDate)}
                            </span>
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs sm:text-sm text-white/75">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                              <Clock className="w-3.5 h-3.5 text-[#00FF88]" />
                              {featuredBooking.startTime} – {featuredBooking.endTime}
                            </span>
                            <span className="text-white/50">
                              Duration:{' '}
                              <strong className="text-white/85">
                                {featuredBooking.duration ?? featuredBooking.durationHours}h
                              </strong>
                            </span>
                            <span className="text-[#00FF88] font-bold">
                              ₹{Number(featuredBooking.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                        <button
                          type="button"
                          onClick={() => openBookingPopup(null)}
                          className="px-4 py-2 rounded-xl bg-[#00FF88] text-[#0B0D0C] font-bold text-xs hover:bg-[#00cc6a] transition-all whitespace-nowrap"
                        >
                          Book Another Slot
                        </button>
                        <Link
                          href="/bookings"
                          className="text-[11px] text-white/55 hover:text-white transition-colors"
                        >
                          Manage Booking →
                        </Link>
                      </div>
                    </div>

                    {/* Other recent bookings pills */}
                    {secondaryBookings.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2.5">
                          <History className="w-3.5 h-3.5 text-white/40" />
                          Recent Activity
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {secondaryBookings.map((b) => (
                            <Link
                              key={b.id}
                              href="/bookings"
                              className="group flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 px-3 py-2.5 transition-all"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate group-hover:text-[#00FF88] transition-colors">
                                  {b.table?.name || `Table #${b.table?.tableNumber}`}
                                </div>
                                <div className="text-[11px] text-white/50 truncate">
                                  {formatBookingDate(b.bookingDate)} • {b.startTime}
                                </div>
                              </div>
                              <span className="text-xs font-bold text-white/80 shrink-0">
                                ₹{b.totalAmount}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/15 border border-[#00FF88]/30 flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-[#00FF88]" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white">
                          Welcome back, {session?.user?.name || 'Player'}!
                        </h3>
                        <p className="text-xs sm:text-sm text-white/55 mt-0.5">
                          You have no active table reservations right now. Pick a table below and lock in your slot!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openBookingPopup(null)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00FF88] text-[#0B0D0C] font-bold text-xs sm:text-sm hover:bg-[#00cc6a] transition-all shrink-0"
                    >
                      Reserve Your Table <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Loyalty & Free Hour Progress (4 cols) */}
              <div className="lg:col-span-4 rounded-2xl border border-[#FFB800]/25 bg-gradient-to-br from-[#FFB800]/[0.08] via-white/[0.02] to-transparent p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFB800]">
                      <Trophy className="w-4 h-4" />
                      VIP Loyalty Status
                    </span>
                    <Link
                      href="/rewards"
                      className="text-xs font-semibold text-white/60 hover:text-[#FFB800] transition-colors"
                    >
                      Details →
                    </Link>
                  </div>

                  {Number(profile?.rewardBalance) > 0 ? (
                    <div className="rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/30 p-3.5 mb-3">
                      <div className="flex items-center gap-2 text-[#00FF88] font-bold text-sm">
                        <Gift className="w-4 h-4 shrink-0" />
                        {profile.rewardBalance} Free Hour(s) Ready!
                      </div>
                      <p className="text-xs text-white/65 mt-1">
                        {profile.giftVoucherCode
                          ? `Use voucher code ${profile.giftVoucherCode} at checkout.`
                          : 'Redeemable on your next table booking.'}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs text-white/60">Current Reward Cycle</span>
                        <span className="text-sm font-bold text-[#FFB800]">
                          {currentCycleHours}h / {minHours}h
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00FF88] to-[#FFB800] transition-all duration-700"
                          style={{ width: `${cyclePct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-white/50 mt-2">
                        Play{' '}
                        <strong className="text-white">
                          {Math.max(0, +(minHours - currentCycleHours).toFixed(1))}h
                        </strong>{' '}
                        more to unlock your next <strong className="text-[#00FF88]">FREE hour</strong>!
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/50">
                    Lifetime Played:{' '}
                    <strong className="text-white">
                      {profile?.lifetimeTotalHours ?? currentCycleHours}h
                    </strong>
                  </span>
                  <Link
                    href="/dashboard"
                    className="font-bold text-[#FFB800] hover:underline inline-flex items-center gap-1"
                  >
                    Open VIP Card <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Live Floor Tables Strip */}
          {tables.length > 0 && (
            <div
              className={`${
                status === 'authenticated' ? 'mt-5 pt-4 border-t border-white/10' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-white/55">
                  Live Arena Floor — Tap any table to reserve your slot
                </span>
                <button
                  type="button"
                  onClick={() => openBookingPopup(null)}
                  className="text-xs font-bold text-[#00FF88] hover:underline inline-flex items-center gap-1"
                >
                  Book Table Now <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {tables.map((t) => {
                  const isAvailable = t.status === 'AVAILABLE'
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openBookingPopup(t)}
                      className="text-left group flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#00FF88]/40 p-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isAvailable
                              ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30'
                              : 'bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/30'
                          }`}
                        >
                          #{t.tableNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate group-hover:text-[#00FF88] transition-colors">
                            {t.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                isAvailable ? 'bg-[#00FF88]' : 'bg-[#FFB800]'
                              }`}
                            />
                            <span
                              className={
                                isAvailable ? 'text-[#00FF88]' : 'text-[#FFB800]'
                              }
                            >
                              {isAvailable ? 'Available Now' : 'In Session'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-white">
                          ₹{t.hourlyRate}
                        </div>
                        <div className="text-[10px] text-white/45">per hour</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        initialTable={selectedTable}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  )
}
