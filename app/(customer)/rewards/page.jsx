"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Clock, Sparkles, CheckCircle2, Gift, Loader2 } from 'lucide-react'

const REWARD_STATUS_STYLES = {
  EARNED: 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30',
  REDEEMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  REVOKED: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function CustomerRewardsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRewards() {
      try {
        setLoading(true)
        const res = await fetch('/api/rewards')
        if (res.ok) {
          setData(await res.json())
        }
      } catch (err) {
        console.error('Error loading rewards:', err)
      } finally {
        setLoading(false)
      }
    }
    loadRewards()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
      </div>
    )
  }

  const profile = data?.profile || {
    totalPlayingHours: 0,
    rewardBalance: 0,
    membershipTier: 'BRONZE',
  }
  const rules = data?.rules || []
  const ledger = data?.ledger || []
  const totalHours = Number(profile.totalPlayingHours || 0)
  const rewardBalance = Number(profile.rewardBalance || 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
          Loyalty & Rewards
        </h1>
        <p className="text-sm text-[#929B95] mt-1">
          Play more at The Cartel Club to automatically unlock free bonus playing hours.
        </p>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#111615] border-[#D6B36A]/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#929B95]">
                Available Bonus Hours
              </p>
              <p className="text-4xl font-bold font-space-grotesk text-[#D6B36A] mt-1">
                {rewardBalance.toFixed(1)} hrs
              </p>
              <p className="text-xs text-[#929B95] mt-1">
                Redeemable at the reception desk
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#D6B36A]/15 flex items-center justify-center">
              <Gift className="w-7 h-7 text-[#D6B36A]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#929B95]">
                Total Playing Hours
              </p>
              <p className="text-4xl font-bold font-space-grotesk text-[#B6F36B] mt-1">
                {totalHours.toFixed(1)} hrs
              </p>
              <p className="text-xs text-[#929B95] mt-1">
                Tracked across completed sessions
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#B6F36B]/15 flex items-center justify-center">
              <Clock className="w-7 h-7 text-[#B6F36B]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#929B95]">
                Membership Tier
              </p>
              <p className="text-3xl font-bold font-space-grotesk text-[#F4F1E8] mt-1">
                {profile.membershipTier}
              </p>
              <p className="text-xs text-[#929B95] mt-1">The Cartel Club Member</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress Cards */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold font-space-grotesk text-[#F4F1E8] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#D6B36A]" />
              Reward Milestones
            </h2>
            <p className="text-xs text-[#929B95] mt-1">
              Bonus hours are automatically credited to your account when your completed playing hours cross each threshold.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => {
              const unlocked = totalHours >= rule.hoursRequired
              const pct = Math.min(
                100,
                Math.round((totalHours / rule.hoursRequired) * 100)
              )
              return (
                <div
                  key={rule.id}
                  className={`p-5 rounded-xl border space-y-4 ${
                    unlocked
                      ? 'bg-[#B6F36B]/10 border-[#B6F36B]/40'
                      : 'bg-[#080A0A] border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#F4F1E8]">{rule.name}</h3>
                      <p className="text-sm text-[#929B95]">
                        Complete <strong>{rule.hoursRequired} hours</strong> → Get{' '}
                        <strong className="text-[#B6F36A]">
                          +{rule.bonusHours} Free Bonus Hour(s)
                        </strong>
                      </p>
                    </div>
                    {unlocked ? (
                      <Badge className="bg-[#B6F36B] text-[#080A0A]">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Unlocked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/20 text-[#929B95]">
                        {pct}%
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#B6F36B] to-[#D6B36A] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#929B95]">
                      <span>{totalHours.toFixed(1)}h played</span>
                      <span>
                        {unlocked
                          ? 'Milestone achieved'
                          : `${(rule.hoursRequired - totalHours).toFixed(1)}h remaining`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reward Ledger History */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            Reward History
          </h2>

          {ledger.length === 0 ? (
            <p className="text-sm text-[#929B95] py-8 text-center">
              No reward transactions yet. Keep playing to unlock your first bonus hour at 5 hours played!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-[#929B95] border-b border-white/10">
                  <tr>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Earned</th>
                    <th className="py-3 px-4">Redeemed</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ledger.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3.5 pr-4 text-[#929B95]">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#F4F1E8]">
                        {item.reason || 'Loyalty Milestone Bonus'}
                      </td>
                      <td className="py-3.5 px-4 text-[#B6F36B] font-semibold">
                        +{item.hoursEarned}h
                      </td>
                      <td className="py-3.5 px-4 text-[#929B95]">
                        {item.hoursRedeemed > 0 ? `-${item.hoursRedeemed}h` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#929B95]">
                        {item.validUntil
                          ? new Date(item.validUntil).toLocaleDateString('en-IN')
                          : 'No expiry'}
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Badge className={REWARD_STATUS_STYLES[item.status] || ''}>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

