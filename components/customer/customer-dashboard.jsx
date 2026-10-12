"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar, Clock, CreditCard, Gift,
  ArrowRight, ChevronRight, Gamepad2,
} from 'lucide-react'

const STATUS_COLORS = {
  CONFIRMED:       'bg-green-500/20 text-green-400',
  PENDING_PAYMENT: 'bg-yellow-500/20 text-yellow-400',
  CANCELLED:       'bg-red-500/20 text-red-400',
  COMPLETED:       'bg-blue-500/20 text-blue-400',
  CHECKED_IN:      'bg-[#B6F36B]/20 text-[#B6F36B]',
  IN_PROGRESS:     'bg-purple-500/20 text-purple-400',
  EXPIRED:         'bg-gray-500/20 text-gray-400',
}

function StatCard({ icon: Icon, label, value, accent, href }) {
  const card = (
    <Card className="bg-[#111615] border-white/10 hover:border-white/20 transition-colors">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent ? 'bg-[#D6B36A]/15' : 'bg-[#B6F36B]/15'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-[#D6B36A]' : 'text-[#B6F36B]'}`} />
        </div>
        <div>
          <p className="text-xs text-[#929B95]">{label}</p>
          <p className="text-xl font-bold text-[#F4F1E8] mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

export default function CustomerDashboardClient({ user, profile, upcomingCount }) {
  const recentBookings = profile?.bookings ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
          Welcome back, {user?.name?.split(' ')[0] ?? 'Player'} 👋
        </h1>
        <p className="text-[#929B95] mt-1">Here&apos;s your The Cartel Club overview.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar}  label="Upcoming"       value={upcomingCount}                             href="/dashboard/bookings" />
        <StatCard icon={Gamepad2}  label="Hours Played"   value={`${profile?.totalPlayingHours ?? 0}h`}     />
        <StatCard icon={CreditCard} label="Total Spent"   value={`₹${(profile?.lifetimeSpending ?? 0).toLocaleString('en-IN')}`} accent />
        <StatCard icon={Gift}       label="Reward Balance" value={`${profile?.rewardBalance ?? 0}h`}        href="/dashboard/rewards" accent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[#F4F1E8] text-base">Recent Bookings</CardTitle>
            <Link href="/dashboard/bookings">
              <Button variant="ghost" size="sm" className="text-[#929B95] hover:text-[#B6F36B] text-xs gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-[#929B95]/40 mx-auto mb-3" />
                <p className="text-[#929B95] text-sm">No bookings yet.</p>
                <Link href="/book">
                  <Button size="sm" className="mt-3 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90">
                    Book a Table
                  </Button>
                </Link>
              </div>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-[#080A0A] rounded-lg">
                  <div>
                    <p className="text-[#F4F1E8] text-sm font-medium">{b.table?.name}</p>
                    <p className="text-xs text-[#929B95]">
                      {new Date(b.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}{b.startTime}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick actions + loyalty teaser */}
        <div className="space-y-4">
          {/* Book now CTA */}
          <Card className="bg-gradient-to-br from-[#B6F36B]/10 to-[#B6F36B]/5 border-[#B6F36B]/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[#F4F1E8] font-semibold">Ready to play?</p>
                <p className="text-[#929B95] text-sm mt-0.5">Book a table in 30 seconds.</p>
              </div>
              <Link href="/book">
                <Button className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 gap-1.5">
                  Book Now <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Loyalty progress */}
          <Card className="bg-[#111615] border-white/10">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-[#F4F1E8] text-base flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#D6B36A]" /> Loyalty Progress
              </CardTitle>
              <Link href="/dashboard/rewards">
                <Button variant="ghost" size="sm" className="text-[#929B95] hover:text-[#B6F36B] text-xs gap-1">
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* 5-hour milestone */}
              <MilestoneBar
                label="5-Hour Milestone"
                reward="1 bonus hour"
                current={profile?.totalPlayingHours ?? 0}
                target={5}
              />
              {/* 31-hour milestone */}
              <MilestoneBar
                label="31-Hour Milestone"
                reward="5 bonus hours"
                current={profile?.totalPlayingHours ?? 0}
                target={31}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MilestoneBar({ label, reward, current, target }) {
  const pct     = Math.min(100, Math.round((current / target) * 100))
  const reached = current >= target

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-[#929B95]">{label}</span>
        <span className={`text-xs font-medium ${reached ? 'text-[#B6F36B]' : 'text-[#929B95]'}`}>
          {reached ? `✓ Earned: ${reward}` : `${current}h / ${target}h`}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#B6F36B] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
