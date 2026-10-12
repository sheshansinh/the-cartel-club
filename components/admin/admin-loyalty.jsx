"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Gift,
  Trophy,
  Plus,
  Edit2,
  Sparkles,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

const REWARD_STATUS_STYLES = {
  EARNED: 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30',
  REDEEMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  REVOKED: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function AdminLoyalty() {
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState([])
  const [ledger, setLedger] = useState([])
  const [customers, setCustomers] = useState([])

  // Modals
  const [ruleModal, setRuleModal] = useState(null)
  const [adjustModal, setAdjustModal] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [ruleForm, setRuleForm] = useState({
    id: '',
    name: '',
    hoursRequired: '',
    bonusHours: '',
    validForDays: '90',
    isActive: true,
  })

  const [adjustForm, setAdjustForm] = useState({
    customerId: '',
    actionType: 'GRANT',
    hours: '1',
    reason: '',
    validForDays: '90',
  })

  const fetchLoyaltyData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/loyalty')
      if (!res.ok) throw new Error('Failed to load loyalty data')
      const data = await res.json()
      setRules(data.rules || [])
      setLedger(data.ledger || [])
      setCustomers(data.customers || [])
    } catch (err) {
      console.error('Error loading admin loyalty:', err)
      toast.error('Failed to load loyalty data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLoyaltyData()
  }, [fetchLoyaltyData])

  const openEditRule = (rule = null) => {
    if (rule) {
      setRuleForm({
        id: rule.id,
        name: rule.name,
        hoursRequired: String(rule.hoursRequired),
        bonusHours: String(rule.bonusHours),
        validForDays: String(rule.validForDays || 90),
        isActive: rule.isActive,
      })
    } else {
      setRuleForm({
        id: '',
        name: '',
        hoursRequired: '',
        bonusHours: '',
        validForDays: '90',
        isActive: true,
      })
    }
    setRuleModal(true)
  }

  const handleSaveRule = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/loyalty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ruleForm.id || undefined,
          name: ruleForm.name,
          hoursRequired: Number(ruleForm.hoursRequired),
          bonusHours: Number(ruleForm.bonusHours),
          validForDays: Number(ruleForm.validForDays || 90),
          isActive: ruleForm.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to save rule')
        return
      }
      toast.success(ruleForm.id ? 'Milestone rule updated' : 'Milestone rule created')
      setRuleModal(null)
      fetchLoyaltyData()
    } catch (err) {
      toast.error('Failed to save milestone rule')
    } finally {
      setSubmitting(false)
    }
  }

  const openAdjustModal = (customer = null, defaultAction = 'GRANT') => {
    setAdjustForm({
      customerId: customer?.id || (customers[0]?.id ?? ''),
      actionType: defaultAction,
      hours: '1',
      reason: '',
      validForDays: '90',
    })
    setAdjustModal(true)
  }

  const handleAdjustSubmit = async (e) => {
    e.preventDefault()
    if (!adjustForm.customerId || !adjustForm.reason.trim()) {
      toast.error('Please select a customer and enter a reason')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: adjustForm.customerId,
          actionType: adjustForm.actionType,
          hours: Number(adjustForm.hours),
          reason: adjustForm.reason,
          validForDays: Number(adjustForm.validForDays || 90),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to adjust rewards')
        return
      }
      toast.success(`Successfully processed ${adjustForm.actionType} of ${adjustForm.hours}h`)
      setAdjustModal(null)
      fetchLoyaltyData()
    } catch (err) {
      toast.error('Failed to adjust customer rewards')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Loyalty & Rewards Engine
          </h1>
          <p className="text-sm text-[#929B95] mt-1">
            Configure automatic playing-hour milestones and manage customer bonus hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => openEditRule(null)}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Milestone Rule
          </Button>
          <Button
            onClick={() => openAdjustModal(null, 'GRANT')}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <Gift className="w-4 h-4 mr-1.5" />
            Grant / Redeem Hours
          </Button>
        </div>
      </div>

      {/* Active Milestone Rules */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#D6B36A]" />
              Automatic Milestone Rules
            </h2>
            <span className="text-xs text-[#929B95]">
              Issued automatically once per threshold crossing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-[#080A0A] border border-white/10 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#F4F1E8]">{rule.name}</h3>
                    <Badge
                      className={
                        rule.isActive
                          ? 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }
                    >
                      {rule.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#929B95] mt-2">
                    Play <strong className="text-[#F4F1E8]">{rule.hoursRequired} hours</strong> →
                    Earn{' '}
                    <strong className="text-[#D6B36A]">
                      +{rule.bonusHours} Free Hour(s)
                    </strong>
                  </p>
                  <p className="text-xs text-[#929B95] mt-1">
                    Validity: {rule.validForDays ? `${rule.validForDays} days` : 'No expiry'}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditRule(rule)}
                    className="text-xs text-[#B6F36B] hover:bg-[#B6F36B]/10"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit Rule
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer Loyalty Balances */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            Customer Playing Hours & Bonus Balances
          </h2>

          {customers.length === 0 ? (
            <p className="text-sm text-[#929B95] py-6 text-center">
              No customer profiles found yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-[#929B95] border-b border-white/10">
                  <tr>
                    <th className="py-3 pr-4">Customer</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Hours Played</th>
                    <th className="py-3 px-4">Bonus Balance</th>
                    <th className="py-3 px-4">Lifetime Spend</th>
                    <th className="py-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-[#F4F1E8]">{c.name}</p>
                        <p className="text-xs text-[#929B95]">
                          {c.phone || c.email}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-[#D6B36A]/20 text-[#D6B36A] border-[#D6B36A]/30">
                          {c.membershipTier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F4F1E8]">
                        {c.totalPlayingHours.toFixed(1)}h
                      </td>
                      <td className="py-3 px-4 font-bold text-[#B6F36B]">
                        {c.rewardBalance.toFixed(1)}h
                      </td>
                      <td className="py-3 px-4 text-[#929B95]">
                        ₹{c.lifetimeSpending.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 pl-4 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjustModal(c, 'GRANT')}
                          className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                        >
                          Adjust Hours
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward Ledger History */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            Recent Reward Ledger Transactions
          </h2>

          {ledger.length === 0 ? (
            <p className="text-sm text-[#929B95] py-6 text-center">
              No reward ledger transactions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-[#929B95] border-b border-white/10">
                  <tr>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Earned</th>
                    <th className="py-3 px-4">Redeemed</th>
                    <th className="py-3 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 pr-4 text-xs text-[#929B95]">
                        {new Date(entry.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#F4F1E8]">
                        {entry.customerName}
                      </td>
                      <td className="py-3 px-4 text-[#929B95]">{entry.reason}</td>
                      <td className="py-3 px-4 font-semibold text-[#B6F36B]">
                        +{entry.hoursEarned}h
                      </td>
                      <td className="py-3 px-4 text-[#929B95]">
                        {entry.hoursRedeemed > 0 ? `-${entry.hoursRedeemed}h` : '—'}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Badge className={REWARD_STATUS_STYLES[entry.status] || ''}>
                          {entry.status}
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

      {/* ── Modal: Create/Edit Milestone Rule ─────────────────────────────── */}
      {ruleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-[#111615] border-white/15">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#F4F1E8]">
                  {ruleForm.id ? 'Edit Milestone Rule' : 'New Milestone Rule'}
                </h3>
                <button
                  onClick={() => setRuleModal(null)}
                  className="text-[#929B95] hover:text-[#F4F1E8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#929B95] mb-1">
                    Rule Name *
                  </label>
                  <Input
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    placeholder="e.g. 50-Hour VIP Milestone"
                    className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Hours Required *
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      value={ruleForm.hoursRequired}
                      onChange={(e) =>
                        setRuleForm({ ...ruleForm, hoursRequired: e.target.value })
                      }
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Bonus Hours Awarded *
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={ruleForm.bonusHours}
                      onChange={(e) =>
                        setRuleForm({ ...ruleForm, bonusHours: e.target.value })
                      }
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#929B95] mb-1">
                    Valid For (Days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={ruleForm.validForDays}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, validForDays: e.target.value })
                    }
                    className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-[#F4F1E8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleForm.isActive}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, isActive: e.target.checked })
                    }
                  />
                  <span>Rule is active</span>
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRuleModal(null)}
                    className="text-[#929B95]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
                  >
                    Save Rule
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modal: Manual Grant / Redeem / Revoke ─────────────────────────── */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-[#111615] border-white/15">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#F4F1E8]">
                  Adjust Customer Bonus Hours
                </h3>
                <button
                  onClick={() => setAdjustModal(null)}
                  className="text-[#929B95] hover:text-[#F4F1E8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#929B95] mb-1">
                    Customer *
                  </label>
                  <select
                    value={adjustForm.customerId}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, customerId: e.target.value })
                    }
                    className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.rewardBalance}h available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Action *
                    </label>
                    <select
                      value={adjustForm.actionType}
                      onChange={(e) =>
                        setAdjustForm({ ...adjustForm, actionType: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                    >
                      <option value="GRANT">Grant Bonus Hours (+)</option>
                      <option value="REDEEM">Redeem Hours (-)</option>
                      <option value="REVOKE">Revoke Hours (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Hours *
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={adjustForm.hours}
                      onChange={(e) =>
                        setAdjustForm({ ...adjustForm, hours: e.target.value })
                      }
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#929B95] mb-1">
                    Mandatory Reason *
                  </label>
                  <Input
                    value={adjustForm.reason}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, reason: e.target.value })
                    }
                    placeholder="e.g. Tournament winner prize / Customer goodwill"
                    className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAdjustModal(null)}
                    className="text-[#929B95]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Apply Adjustment'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

