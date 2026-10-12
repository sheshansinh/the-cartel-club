"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  Trophy,
  Wallet,
  PlusCircle,
  ArrowRight,
  Phone,
  Sparkles,
  Loader2,
  CheckCircle2,
  Home,
  Gift,
} from 'lucide-react'
import BookingModal from '@/components/booking-modal'

const STATUS_STYLES = {
  PENDING_PAYMENT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CONFIRMED: 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30',
  CHECKED_IN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  NO_SHOW: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export default function CustomerDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState(null)
  const [bookings, setBookings] = useState([])
  const [rewardsData, setRewardsData] = useState(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const [profRes, bookRes, rewRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/bookings?limit=5'),
        fetch('/api/rewards'),
      ])

      if (profRes.ok) {
        setProfileData(await profRes.json())
      }
      if (bookRes.ok) {
        const bData = await bookRes.json()
        setBookings(bData.bookings || [])
      }
      if (rewRes.ok) {
        setRewardsData(await rewRes.json())
      }
    } catch (err) {
      console.error('Error loading customer dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
      </div>
    )
  }

  const user = profileData?.user
  const profile = profileData?.profile
  const stats = profileData?.stats || {}
  const cycleHours = Number(
    rewardsData?.profile?.totalPlayingHours ?? profile?.totalPlayingHours ?? 0
  )
  const lifetimeHours = Number(
    rewardsData?.profile?.lifetimeTotalHours ?? profile?.totalPlayingHours ?? 0
  )
  const rewardBalance = Number(
    rewardsData?.profile?.rewardBalance ?? profile?.rewardBalance ?? 0
  )
  const lifetimeSpending = Number(profile?.lifetimeSpending || 0)

  const upcomingBookings = bookings.filter((b) =>
    ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(
      b.status
    )
  )
  const nextBooking = upcomingBookings[0] || null

  const rules = rewardsData?.rules?.length
    ? rewardsData.rules
    : [
        { name: '5-Hour Milestone', hoursRequired: 5, bonusHours: 1 },
        { name: '31-Hour Milestone', hoursRequired: 31, bonusHours: 5 },
      ]
  const nextRule =
    rules.find((r) => cycleHours < Number(r.hoursRequired)) ||
    rules[rules.length - 1]
  const targetHours = Number(nextRule?.hoursRequired || 5)
  const progressPct =
    rewardBalance > 0
      ? 100
      : Math.min(100, Math.round((cycleHours / Math.max(1, targetHours)) * 100))

  return (
    <div className="space-y-6">
      {/* Luxury VIP Member Card Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
        {/* Background Image + Gradient Overlay */}
        <img
          src="/api/media/arena-6-tables-lounge.jpg"
          alt="The Cartel Club VIP Lounge"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#080A0A]/95 via-[#111615]/90 to-[#1a472a]/50" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || 'Member'}
                className="w-16 h-16 shrink-0 rounded-2xl border-2 border-[#B6F36B] object-cover shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-[#B6F36B] to-[#8bcf3b] text-[#080A0A] flex items-center justify-center text-2xl font-extrabold font-space-grotesk shadow-lg shadow-[#B6F36B]/20">
                {(user?.name || 'M')[0].toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-[#D6B36A]/20 text-[#D6B36A] border-[#D6B36A]/40 text-[10px] font-bold tracking-wider uppercase">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {profile?.membershipTier || 'GOLD'} VIP MEMBER
                </Badge>
                {rewardBalance > 0 && (
                  <Badge className="bg-[#B6F36B] text-[#080A0A] text-[10px] font-extrabold">
                    🎁 {rewardBalance}h FREE REWARD UNLOCKED
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-space-grotesk text-[#F4F1E8] mt-1.5 truncate">
                Welcome back, {user?.name?.split(' ')[0] || 'Player'}!
              </h1>
              <p className="text-xs sm:text-sm text-[#929B95] truncate">
                {user?.email}
                {profile?.phone ? ` • +91 ${profile.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/" className="flex-1 sm:flex-initial">
              <Button
                variant="outline"
                className="w-full border-white/20 bg-black/50 backdrop-blur-md text-[#F4F1E8] hover:bg-white/10 rounded-xl h-11"
              >
                <Home className="w-4 h-4 mr-2 text-[#B6F36B]" />
                Back to Home
              </Button>
            </Link>
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="flex-1 sm:flex-initial bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold rounded-xl h-11 shadow-lg shadow-[#B6F36B]/20"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Book a Table Now
            </Button>
          </div>
        </div>
      </div>

      {/* Missing Phone Prompt */}
      {!profile?.phone && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#D6B36A]/10 border border-[#D6B36A]/30">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-[#D6B36A] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#F4F1E8]">
                Add your phone number for faster table check-in
              </p>
              <p className="text-xs text-[#929B95]">
                Your phone number links walk-in sessions and loyalty hours automatically.
              </p>
            </div>
          </div>
          <Link href="/profile">
            <Button
              size="sm"
              variant="outline"
              className="border-[#D6B36A]/40 text-[#D6B36A] hover:bg-[#D6B36A]/10 rounded-xl"
            >
              Add Phone Number
            </Button>
          </Link>
        </div>
      )}

      {/* 2x2 Bento Grid on Mobile, 4 Columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card className="bg-[#111615] border-white/10 rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#929B95]">
                Active Bookings
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-space-grotesk text-[#F4F1E8] mt-1">
                {stats.upcomingBookings ?? upcomingBookings.length}
              </p>
              <p className="text-[11px] text-[#929B95] mt-1">
                {stats.totalBookings ?? bookings.length} total booked
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-[#B6F36B]/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#B6F36B]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10 rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#929B95]">
                Cycle Hours
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-space-grotesk text-[#F4F1E8] mt-1">
                {cycleHours.toFixed(1)}h
              </p>
              <p className="text-[11px] text-[#B6F36B] mt-1">
                {rewardBalance > 0
                  ? '🎁 Gift Ready!'
                  : `${Math.max(0, targetHours - cycleHours).toFixed(1)}h to free hour`}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10 rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#929B95]">
                Reward Balance
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-space-grotesk text-[#D6B36A] mt-1">
                {rewardBalance.toFixed(1)}h
              </p>
              <p className="text-[11px] text-[#929B95] mt-1">
                Free bonus hours
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-[#D6B36A]/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#D6B36A]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10 rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#929B95]">
                Lifetime Spend
              </p>
              <p className="text-2xl sm:text-3xl font-bold font-space-grotesk text-[#F4F1E8] mt-1">
                ₹{lifetimeSpending.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-[#929B95] mt-1">
                {lifetimeHours.toFixed(1)}h all-time played
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Reservation & Loyalty Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Upcoming Booking */}
        <Card className="bg-[#111615] border-white/10 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8]">
                Next Reservation
              </h2>
              <Link
                href="/bookings"
                className="text-xs text-[#B6F36B] hover:underline flex items-center gap-1"
              >
                All Bookings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {nextBooking ? (
              <div className="p-4 rounded-2xl bg-[#080A0A] border border-[#B6F36B]/30 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-[#929B95]">
                      #{nextBooking.bookingRef.slice(-8).toUpperCase()}
                    </p>
                    <h3 className="text-lg font-bold text-[#F4F1E8] mt-0.5">
                      {nextBooking.table?.name || 'Table'} (
                      {nextBooking.table?.type})
                    </h3>
                  </div>
                  <Badge className={STATUS_STYLES[nextBooking.status] || ''}>
                    {nextBooking.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm pt-2 border-t border-white/10">
                  <div>
                    <p className="text-xs text-[#929B95]">Date</p>
                    <p className="font-medium text-[#F4F1E8]">
                      {new Date(nextBooking.bookingDate).toLocaleDateString(
                        'en-IN',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#929B95]">Time</p>
                    <p className="font-medium text-[#F4F1E8]">
                      {nextBooking.startTime} – {nextBooking.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#929B95]">Total</p>
                    <p className="font-semibold text-[#B6F36B]">
                      ₹{Number(nextBooking.totalAmount).toFixed(0)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link href={`/bookings/${nextBooking.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-[#F4F1E8] hover:bg-white/10 rounded-xl"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#080A0A] border border-white/5 text-center space-y-3">
                <Calendar className="w-8 h-8 text-[#929B95] mx-auto" />
                <p className="text-sm text-[#929B95]">
                  You have no upcoming table reservations right now.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsBookingModalOpen(true)}
                  className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold rounded-xl"
                >
                  Reserve a Table
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loyalty Milestone Progress */}
        <Card className="bg-[#111615] border-white/10 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8]">
                The Cartel Club Rewards Progress
              </h2>
              <Link
                href="/rewards"
                className="text-xs text-[#D6B36A] hover:underline flex items-center gap-1"
              >
                View Rewards <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-[#080A0A] border border-white/10 space-y-4">
              {rewardBalance > 0 && (
                <div className="p-3 rounded-xl bg-[#B6F36B]/15 border border-[#B6F36B]/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-[#F4F1E8]">
                    <Gift className="w-4 h-4 text-[#B6F36B] shrink-0" />
                    <span>
                      You have <strong className="text-[#B6F36B]">{rewardBalance} Free Hour(s)</strong> ready to redeem!
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsBookingModalOpen(true)}
                    className="h-7 px-2.5 text-[11px] bg-[#B6F36B] text-[#080A0A] font-bold"
                  >
                    Claim Free Hour
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-[#929B95]">
                  Milestone:{' '}
                  <strong className="text-[#F4F1E8]">{nextRule?.name}</strong>
                </span>
                <span className="text-[#B6F36B] font-semibold">
                  {cycleHours.toFixed(1)} / {targetHours} hrs
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#B6F36B] to-[#D6B36A] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {rules.map((rule) => {
                  const unlocked =
                    rewardBalance > 0 ||
                    cycleHours >= Number(rule.hoursRequired)
                  return (
                    <div
                      key={rule.id || rule.name}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        unlocked
                          ? 'bg-[#B6F36B]/10 border-[#B6F36B]/30'
                          : 'bg-[#111615] border-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#F4F1E8]">
                          {rule.name}
                        </p>
                        <p className="text-xs text-[#929B95]">
                          Play {rule.hoursRequired}h → +{rule.bonusHours}h free
                        </p>
                      </div>
                      {unlocked ? (
                        <CheckCircle2 className="w-5 h-5 text-[#B6F36B]" />
                      ) : (
                        <span className="text-xs text-[#929B95]">
                          {Math.max(
                            0,
                            Number(rule.hoursRequired) - cycleHours
                          ).toFixed(1)}
                          h left
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings Table */}
      <Card className="bg-[#111615] border-white/10 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8]">
              Recent Bookings
            </h2>
            <Link
              href="/bookings"
              className="text-xs text-[#B6F36B] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <p className="text-sm text-[#929B95] py-6 text-center">
              No bookings recorded yet. Book your first table online!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-[#929B95] border-b border-white/10">
                  <tr>
                    <th className="py-3 pr-4">Ref</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Date &amp; Slot</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 pr-4 font-mono text-xs text-[#929B95]">
                        #{b.bookingRef.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#F4F1E8]">
                        {b.table?.name}
                      </td>
                      <td className="py-3.5 px-4 text-[#929B95]">
                        {new Date(b.bookingDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        • {b.startTime}–{b.endTime}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#B6F36B]">
                        ₹{Number(b.totalAmount).toFixed(0)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge className={STATUS_STYLES[b.status] || ''}>
                          {b.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Link
                          href={`/bookings/${b.id}`}
                          className="text-xs text-[#B6F36B] hover:underline"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false)
          loadDashboard()
        }}
      />
    </div>
  )
}
