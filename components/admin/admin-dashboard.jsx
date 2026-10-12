"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Calendar,
  Clock,
  CreditCard,
  TrendingUp,
  CheckCircle,
  XCircle,
  Gamepad2,
  Table2,
  UserPlus,
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  User,
  Sparkles,
  LogOut,
  Search,
  Pause,
  Play,
  Gift,
  Trophy,
  Edit2,
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * Computes the live countdown timer for a table session.
 * When a user books 1 hour (60 mins = 3600s), it starts at 59:59 min and counts down to 00:00!
 */
function formatClockTime(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return '--:--'
  return dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function getCountdownTimer(sess, nowMs) {
  if (!sess) {
    return {
      formatted: '00:00',
      remainingSec: 0,
      totalSec: 0,
      isExpired: false,
      isLowTime: false,
      progressPct: 0,
      startTimeLabel: '--:--',
      endTimeLabel: '--:--',
    }
  }

  const totalSec = Math.max(60, Math.round(Number(sess.durationHours || 1) * 3600))
  const startMs = sess.startTime ? new Date(sess.startTime).getTime() : nowMs
  const endMs = startMs + totalSec * 1000
  const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000))

  // Start at (totalSec - 1) so 1 hour (3600s) starts at 3599s = 59:59 min and goes to 00:00
  const remainingSec = Math.max(0, totalSec - 1 - elapsedSec)
  const mins = Math.floor(remainingSec / 60)
  const secs = remainingSec % 60
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const progressPct = Math.min(
    100,
    Math.max(0, (remainingSec / Math.max(1, totalSec - 1)) * 100)
  )

  return {
    formatted,
    remainingSec,
    totalSec,
    isExpired: remainingSec <= 0,
    isLowTime: remainingSec > 0 && remainingSec <= 300, // Last 5 minutes warning
    progressPct,
    startTimeLabel: formatClockTime(new Date(startMs)),
    endTimeLabel: formatClockTime(new Date(endMs)),
  }
}

function StatCard({ title, value, sub, icon: Icon, accent = false, loading }) {
  return (
    <Card className="bg-[#111615] border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[#929B95]">
          {title}
        </CardTitle>
        <Icon className={`w-4 h-4 ${accent ? 'text-[#D6B36A]' : 'text-[#B6F36B]'}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 bg-white/5 rounded animate-pulse" />
        ) : (
          <>
            <div className="text-2xl font-bold text-[#F4F1E8]">{value}</div>
            {sub && <p className="text-xs text-[#929B95] mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

const STATUS_COLORS = {
  CONFIRMED: 'bg-green-500/20 text-green-400',
  PENDING_PAYMENT: 'bg-yellow-500/20 text-yellow-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  CHECKED_IN: 'bg-[#B6F36B]/20 text-[#B6F36B]',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-400',
  EXPIRED: 'bg-gray-500/20 text-gray-400',
  NO_SHOW: 'bg-orange-500/20 text-orange-400',
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTableId, setSelectedTableId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Walk-in start form inside Table modal
  const [walkInName, setWalkInName] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [walkInEmail, setWalkInEmail] = useState('')
  const [walkInDuration, setWalkInDuration] = useState('1')
  const [walkInPrice, setWalkInPrice] = useState('')
  const [walkInType, setWalkInType] = useState('WALK_IN') // 'WALK_IN' (Pending) | 'ONLINE_PAID' (Paid)
  const [applyFreeReward, setApplyFreeReward] = useState(true)

  // Inline editor for modifying an active session's Duration & Table Price
  const [editingActiveSession, setEditingActiveSession] = useState(false)
  const [editSessionDuration, setEditSessionDuration] = useState('1')
  const [editSessionPrice, setEditSessionPrice] = useState('200')

  // Loyalty & Rewards Engine inline rule editor state on Dashboard
  const [editingRule, setEditingRule] = useState(null)
  const [ruleForm, setRuleForm] = useState({
    id: '',
    name: '5-Hour Milestone',
    hoursRequired: '5',
    bonusHours: '1',
    validForDays: '90',
    isActive: true,
  })

  // POS Tab state inside Table modal
  const [posCategory, setPosCategory] = useState('ALL')
  const [posSearch, setPosSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/admin/dashboard')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load dashboard')
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const timerInterval = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    const pollInterval = setInterval(() => {
      fetchDashboard(true)
    }, 20000)
    return () => {
      clearInterval(timerInterval)
      clearInterval(pollInterval)
    }
  }, [fetchDashboard])

  const stats = data?.stats ?? {}
  const recent = data?.recentBookings ?? []
  const tables = data?.tables ?? []
  const products = data?.products ?? []
  const categories = data?.categories ?? []
  const savedClients = data?.savedClients ?? []
  const loyaltyRules = data?.loyaltyRules ?? []

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null
  const activeSession = selectedTable?.activeSession || null

  // Match typed phone, email, or name against savedClients (Walk-in & Online clients)
  const rawTypedDigits = walkInPhone ? String(walkInPhone).replace(/\D/g, '') : ''
  const cleanTypedPhone =
    rawTypedDigits.length >= 10
      ? rawTypedDigits.slice(-10)
      : rawTypedDigits.length >= 6
      ? rawTypedDigits
      : ''
  const cleanTypedEmail = walkInEmail ? walkInEmail.trim().toLowerCase() : ''
  const cleanTypedName = walkInName ? walkInName.trim().toLowerCase() : ''

  const matchedClientByPhone =
    (cleanTypedPhone
      ? savedClients.find(
          (c) =>
            c.phone &&
            (c.phone === cleanTypedPhone || c.phone.endsWith(cleanTypedPhone))
        )
      : null) ||
    (cleanTypedEmail
      ? savedClients.find(
          (c) => c.email && c.email.toLowerCase() === cleanTypedEmail
        )
      : null) ||
    (cleanTypedName
      ? savedClients.find(
          (c) => c.name && c.name.trim().toLowerCase() === cleanTypedName
        )
      : null) ||
    null

  const availableRewardHours = Number(matchedClientByPhone?.rewardBalance || 0)
  const plannedWalkInHours = Math.max(0.1, Number(walkInDuration || 1))
  const redeemableHoursNow =
    applyFreeReward && availableRewardHours > 0
      ? Math.min(availableRewardHours, plannedWalkInHours)
      : 0

  const handleSelectSavedClient = (client) => {
    if (!client) return
    setWalkInName(client.name || '')
    setWalkInPhone(client.phone || '')
    setWalkInEmail(client.email || '')
    setApplyFreeReward(true)
  }

  const handlePhoneInputChange = (val) => {
    setWalkInPhone(val)
    const digits = String(val).replace(/\D/g, '')
    const clean = digits.length >= 10 ? digits.slice(-10) : digits
    if (clean.length >= 10) {
      const found = savedClients.find(
        (c) => c.phone && (c.phone === clean || c.phone.endsWith(clean))
      )
      if (found) {
        if (!walkInName.trim()) setWalkInName(found.name)
        if (!walkInEmail.trim() && found.email) setWalkInEmail(found.email)
        setApplyFreeReward(true)
      }
    }
  }

  const handleEmailInputChange = (val) => {
    setWalkInEmail(val)
    const clean = String(val).trim().toLowerCase()
    if (clean.includes('@')) {
      const found = savedClients.find(
        (c) => c.email && c.email.toLowerCase() === clean
      )
      if (found) {
        if (!walkInName.trim()) setWalkInName(found.name)
        if (!walkInPhone.trim() && found.phone) setWalkInPhone(found.phone)
        setApplyFreeReward(true)
      }
    }
  }

  const handleDurationChange = (newDurStr, tableObj = selectedTable) => {
    setWalkInDuration(newDurStr)
    const numDur = Number(newDurStr)
    if (!Number.isNaN(numDur) && numDur > 0) {
      const tiers = Array.isArray(tableObj?.pricingTiers)
        ? tableObj.pricingTiers
        : []
      const matchedTier = tiers.find(
        (t) => Math.abs(Number(t.durationHours) - numDur) < 0.001
      )
      if (matchedTier) {
        setWalkInPrice(String(matchedTier.price))
      } else {
        setWalkInPrice(
          String(Math.round(numDur * Number(tableObj?.hourlyRate || 200)))
        )
      }
    }
  }

  const openTableModal = (table) => {
    setSelectedTableId(table.id)
    setWalkInName('')
    setWalkInPhone('')
    setWalkInEmail('')
    const tiers = Array.isArray(table?.pricingTiers) ? table.pricingTiers : []
    const defaultTier =
      tiers.find((t) => Number(t.durationHours) === 1) || tiers[0]
    setWalkInDuration(String(defaultTier?.durationHours ?? 1))
    setWalkInPrice(String(defaultTier?.price ?? Number(table.hourlyRate || 200)))
    setWalkInType('WALK_IN')
    setApplyFreeReward(true)
    setEditingActiveSession(false)
    if (table.activeSession) {
      setEditSessionDuration(String(table.activeSession.durationHours || 1))
      setEditSessionPrice(String(table.activeSession.tableCharge ?? table.hourlyRate ?? 200))
    }
    setPosCategory('ALL')
    setPosSearch('')
  }

  const handleSaveTableRate = async (newHourlyRate) => {
    if (!selectedTable || !newHourlyRate || Number(newHourlyRate) <= 0) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_TABLE_RATE',
          tableId: selectedTable.id,
          hourlyRate: Number(newHourlyRate),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update table rate')
      toast.success(
        `Updated ${selectedTable.name} default rate to ₹${Number(newHourlyRate)}/hr!`
      )
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateActiveSessionDurationPrice = async (e) => {
    if (e) e.preventDefault()
    if (!activeSession) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SESSION_DURATION_PRICE',
          sessionId: activeSession.id,
          durationHours: Number(editSessionDuration || 1),
          tablePrice: Number(editSessionPrice || 0),
        }),
      })
      const json = await res.json()
      if (!res.ok)
        throw new Error(json.error || 'Failed to update duration & price')
      toast.success(
        `Updated session to ${editSessionDuration}h (₹${editSessionPrice})!`
      )
      setEditingActiveSession(false)
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveLoyaltyRule = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_LOYALTY_RULE',
          id: ruleForm.id || undefined,
          name: ruleForm.name,
          hoursRequired: Number(ruleForm.hoursRequired),
          bonusHours: Number(ruleForm.bonusHours),
          validForDays: Number(ruleForm.validForDays || 90),
          isActive: ruleForm.isActive,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save milestone rule')
      toast.success(
        `Milestone rule saved: Play ${ruleForm.hoursRequired}h → +${ruleForm.bonusHours}h Free Reward!`
      )
      setEditingRule(null)
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickGrantReward = async (client, hours = 1) => {
    if (!client?.id) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GRANT_LOYALTY_REWARD',
          customerId: client.id,
          actionType: 'GRANT',
          hours,
          reason: `Quick +${hours}h Bonus Reward granted on Dashboard`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to grant reward')
      toast.success(`🎁 Granted +${hours} Free Reward Hour to ${client.name}!`)
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartWalkInOrOnline = async (bookingId = null) => {
    if (!selectedTable) return
    if (!bookingId && !walkInName.trim()) {
      toast.error('Please enter player name (e.g. Sheshan)')
      return
    }
    try {
      setSubmitting(true)
      const parsedCustomPrice =
        walkInPrice !== '' && !Number.isNaN(Number(walkInPrice))
          ? Number(walkInPrice)
          : Number(walkInDuration || 1) * selectedTable.hourlyRate

      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_TABLE_SESSION',
          tableId: selectedTable.id,
          bookingId: bookingId || null,
          customerId: matchedClientByPhone?.id || null,
          playerName: walkInName.trim(),
          playerPhone: walkInPhone.trim(),
          playerEmail: walkInEmail.trim(),
          durationHours: Number(walkInDuration || 1),
          customTablePrice: parsedCustomPrice,
          redeemRewardHours: redeemableHoursNow,
          isPrepaid: walkInType === 'ONLINE_PAID',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start table')

      if (bookingId) {
        toast.success(`Online booking checked in on ${selectedTable.name}`)
      } else if (json.redeemedReward) {
        toast.success(
          `🎁 ${redeemableHoursNow}h Loyalty Reward Applied for ${walkInName.trim()} — ₹0 Table Fee!`
        )
      } else if (json.isExistingClient) {
        toast.success(
          `Re-entry linked to saved client ${walkInName.trim()} — Loyalty & Hours updated!`
        )
      } else {
        toast.success(
          `Saved new client ${walkInName.trim()} in User DB & started ${selectedTable.name}!`
        )
      }
      setNowMs(Date.now())
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExtendTable = async (
    additionalHours,
    sessionIdOverride = null,
    tableNameOverride = null,
    e = null
  ) => {
    if (e) e.stopPropagation()
    const targetSessionId = sessionIdOverride || activeSession?.id
    const targetTableName = tableNameOverride || selectedTable?.name || 'Table'
    if (!targetSessionId) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXTEND_TABLE_SESSION',
          sessionId: targetSessionId,
          additionalHours,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to extend time')

      toast.success(`Added +${additionalHours}h to ${targetTableName}`)
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePauseSession = async (sessionId, currentStatus, e = null) => {
    if (e) e.stopPropagation()
    if (!sessionId) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_PAUSE_SESSION',
          sessionId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to pause/resume session')

      toast.success(
        currentStatus === 'PAUSED' ? 'Session resumed' : 'Session paused'
      )
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddPosProductToTable = async (product) => {
    if (!activeSession) return
    if (product.currentStock <= 0) {
      toast.error(`"${product.name}" is out of stock`)
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_TABLE_POS_ITEM',
          sessionId: activeSession.id,
          productId: product.id,
          quantity: 1,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add POS item')

      toast.success(
        `Added ${product.name} (₹${product.sellingPrice} Pending) to ${activeSession.playerName}'s tab`
      )
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemovePosItem = async (posSaleId, itemName) => {
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REMOVE_TABLE_POS_ITEM',
          posSaleId,
        }),
      })
      if (!res.ok) throw new Error('Failed to remove item')
      toast.success(`Removed ${itemName} from player tab`)
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkPaid = async ({
    scope = 'ALL',
    posSaleId = null,
    endSession = false,
  }) => {
    if (!activeSession) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_PAID',
          sessionId: activeSession.id,
          scope,
          posSaleId,
          paymentMethod,
          endSession,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to mark paid')

      if (endSession) {
        toast.success(
          `All dues settled & ${selectedTable?.name} is now Available to Play!`
        )
        setSelectedTableId(null)
      } else {
        toast.success('Marked as PAID!')
      }
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEndSessionOnly = async () => {
    if (!activeSession) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'END_TABLE_SESSION',
          sessionId: activeSession.id,
          paymentMethod,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to finish session')

      toast.success(`${selectedTable?.name} freed and ready for next player!`)
      setSelectedTableId(null)
      await fetchDashboard(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPosProducts = products.filter((p) => {
    const matchesCat = posCategory === 'ALL' || p.categoryId === posCategory
    const matchesSearch =
      p.name?.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(posSearch.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Live Floor &amp; Club Dashboard
          </h1>
          <p className="text-[#929B95] mt-1">
            Click any table to view the active player, manage their POS tab, or mark dues paid
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchDashboard()}
          className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Floor
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          Failed to load dashboard data: {error}
        </div>
      )}

      {/* ── MAIN FEATURE: Interactive Live Floor Tables (All 6+ Tables) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-[#B6F36B]" />
            <h2 className="text-xl font-bold font-space-grotesk text-[#F4F1E8]">
              Live Club Tables ({tables.length})
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#929B95]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B6F36B]" />
              Available to Play ({tables.filter((t) => !t.activeSession).length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Playing Now ({tables.filter((t) => Boolean(t.activeSession)).length})
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-52 bg-[#111615] border border-white/10 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tables.map((table) => {
              const sess = table.activeSession
              const isPlaying = Boolean(sess)
              const timer = isPlaying ? getCountdownTimer(sess, nowMs) : null

              return (
                <div
                  key={table.id}
                  onClick={() => openTableModal(table)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between min-h-[245px] ${
                    isPlaying
                      ? 'bg-gradient-to-br from-[#161D1B] to-[#0D1211] border-[#D6B36A]/50 hover:border-[#D6B36A] shadow-lg shadow-black/40'
                      : 'bg-[#111615] border-white/10 hover:border-[#B6F36B]/60 hover:bg-[#141B19]'
                  }`}
                >
                  {/* Top Bar: Table Name + Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#929B95]">
                          Table #{table.tableNumber} &bull; {table.type}
                        </span>
                        <h3 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] mt-0.5">
                          {table.name}
                        </h3>
                      </div>

                      {isPlaying ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                            sess.status === 'PAUSED'
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                              : timer?.isExpired
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              sess.status === 'PAUSED'
                                ? 'bg-yellow-400'
                                : timer?.isExpired
                                ? 'bg-red-400 animate-ping'
                                : 'bg-amber-400 animate-ping'
                            }`}
                          />
                          {sess.status === 'PAUSED'
                            ? 'PAUSED'
                            : timer?.isExpired
                            ? 'TIME UP (00:00)'
                            : 'PLAYING'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#B6F36B]/20 text-[#B6F36B] border border-[#B6F36B]/30">
                          AVAILABLE TO PLAY
                        </span>
                      )}
                    </div>

                    {/* Middle Body: Active Player + Live Countdown Timer + Session Controls OR Available Prompt */}
                    {isPlaying ? (
                      <div className="mt-3.5 p-3.5 rounded-xl bg-[#080A0A]/90 border border-white/10 space-y-2.5">
                        {/* Player Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#B6F36B]/20 text-[#B6F36B] flex items-center justify-center font-bold text-xs">
                              {sess.playerName?.[0]?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#F4F1E8]">
                                {sess.playerName}
                              </p>
                              <p className="text-[11px] text-[#929B95]">
                                {sess.isOnlineBooking ? 'Online Booking' : 'Walk-in Customer'}{' '}
                                &bull; {sess.durationHours}h Booked
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sess.isOnlineBooking
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {sess.isOnlineBooking ? 'ONLINE' : 'WALK-IN'}
                          </span>
                        </div>

                        {/* Live Session Countdown Timer (Starts from 59:59 min -> 00:00) */}
                        <div className="p-2.5 rounded-lg bg-[#111615] border border-white/10 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#929B95] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#B6F36B]" />
                              Time Remaining:
                            </span>
                            <span
                              className={`font-mono text-base font-bold tracking-wider ${
                                timer?.isExpired
                                  ? 'text-red-400'
                                  : timer?.isLowTime
                                  ? 'text-amber-400'
                                  : 'text-[#B6F36B]'
                              }`}
                            >
                              {timer?.formatted} min
                            </span>
                          </div>

                          {/* Start Time & End Time row */}
                          <div className="flex items-center justify-between text-[11px] text-[#929B95] bg-[#080A0A]/80 px-2 py-1 rounded border border-white/5">
                            <span>
                              Start:{' '}
                              <strong className="text-[#F4F1E8] font-mono">
                                {timer?.startTimeLabel}
                              </strong>
                            </span>
                            <span className="text-white/20">→</span>
                            <span>
                              End:{' '}
                              <strong className="text-[#D6B36A] font-mono">
                                {timer?.endTimeLabel}
                              </strong>
                            </span>
                          </div>

                          {/* Depleting Countdown Progress Bar */}
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                timer?.isExpired
                                  ? 'bg-red-500'
                                  : timer?.isLowTime
                                  ? 'bg-amber-400'
                                  : 'bg-[#B6F36B]'
                              }`}
                              style={{ width: `${timer?.progressPct ?? 0}%` }}
                            />
                          </div>

                          {/* Quick Inline Live Session Controls on the Pool Table Card */}
                          <div className="flex items-center justify-between pt-1 gap-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={(e) =>
                                  handleExtendTable(0.5, sess.id, table.name, e)
                                }
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#B6F36B]/20 text-[10px] font-semibold text-[#F4F1E8] hover:text-[#B6F36B] border border-white/10 transition-colors"
                              >
                                +30m
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={(e) =>
                                  handleExtendTable(1, sess.id, table.name, e)
                                }
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#B6F36B]/20 text-[10px] font-semibold text-[#F4F1E8] hover:text-[#B6F36B] border border-white/10 transition-colors"
                              >
                                +1h
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={(e) =>
                                  handleTogglePauseSession(sess.id, sess.status, e)
                                }
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[10px] font-semibold text-[#929B95] hover:text-[#F4F1E8] border border-white/10 transition-colors flex items-center gap-1"
                              >
                                {sess.status === 'PAUSED' ? (
                                  <>
                                    <Play className="w-2.5 h-2.5" /> Resume
                                  </>
                                ) : (
                                  <>
                                    <Pause className="w-2.5 h-2.5" /> Pause
                                  </>
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-[#D6B36A] font-medium">
                              Tap for POS →
                            </span>
                          </div>
                        </div>

                        {/* Itemized Mini Summary: Table Fee + POS Tab */}
                        <div className="space-y-1 pt-1.5 border-t border-white/10 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#929B95]">
                              Table ({sess.durationHours}h):
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#F4F1E8]">
                                ₹{sess.tableCharge}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  sess.tablePaymentStatus === 'PAID'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {sess.tablePaymentStatus === 'PAID'
                                  ? 'PAID'
                                  : 'PENDING'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[#929B95]">
                              POS Tab ({sess.posItems.length} items):
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#F4F1E8]">
                                ₹{sess.posPendingTotal + sess.posPaidTotal}
                              </span>
                              {sess.posItems.length > 0 && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    sess.posPendingTotal === 0
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}
                                >
                                  {sess.posPendingTotal === 0
                                    ? 'PAID'
                                    : `₹${sess.posPendingTotal} PENDING`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 rounded-xl bg-[#080A0A]/60 border border-dashed border-white/15 flex flex-col items-center justify-center text-center min-h-[125px]">
                        <UserPlus className="w-5 h-5 text-[#B6F36B] mb-1.5 group-hover:scale-110 transition-transform" />
                        <p className="text-sm font-semibold text-[#F4F1E8]">
                          Available to Play / Add Player
                        </p>
                        <p className="text-xs text-[#929B95] mt-0.5">
                          ₹{table.hourlyRate}/hr &bull; Click to start Walk-in or Online Booking
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    {isPlaying ? (
                      <>
                        <div>
                          <span className="text-[#929B95]">Paid: </span>
                          <span className="font-bold text-emerald-400">
                            ₹{sess.totalPaid}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#929B95]">Pending Due: </span>
                          <span
                            className={`text-sm font-bold ${
                              sess.totalPending > 0
                                ? 'text-amber-400'
                                : 'text-[#B6F36B]'
                            }`}
                          >
                            ₹{sess.totalPending}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[#929B95]">
                          Rate: <strong className="text-[#F4F1E8]">₹{table.hourlyRate}/hr</strong>
                        </span>
                        <span className="text-[#B6F36B] font-semibold group-hover:underline">
                          Start Session + POS →
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── LOYALTY & REWARDS ENGINE (Directly on Dashboard) ── */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D6B36A]" />
                Loyalty &amp; Rewards Engine
              </h2>
              <p className="text-xs text-[#929B95] mt-0.5">
                Configure automatic playing-hour milestones and manage customer bonus hours. When a player hits the milestone limit, their next booking automatically shows ₹0 to pay!
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const firstRule = loyaltyRules[0]
                if (editingRule) {
                  setEditingRule(null)
                } else if (firstRule) {
                  setRuleForm({
                    id: firstRule.id,
                    name: firstRule.name,
                    hoursRequired: String(firstRule.hoursRequired),
                    bonusHours: String(firstRule.bonusHours),
                    validForDays: String(firstRule.validForDays || 90),
                    isActive: firstRule.isActive,
                  })
                  setEditingRule(true)
                } else {
                  setRuleForm({
                    id: '',
                    name: '5-Hour Milestone',
                    hoursRequired: '5',
                    bonusHours: '1',
                    validForDays: '90',
                    isActive: true,
                  })
                  setEditingRule(true)
                }
              }}
              className="border-[#B6F36B]/40 text-[#B6F36B] hover:bg-[#B6F36B]/10 text-xs"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              {editingRule ? 'Close Rule Editor' : 'Configure Milestone Limit'}
            </Button>
          </div>

          {/* Inline Milestone Rule Configurator */}
          {editingRule && (
            <form
              onSubmit={handleSaveLoyaltyRule}
              className="p-4 rounded-xl bg-[#080A0A] border border-[#B6F36B]/30 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="text-[11px] text-[#929B95] mb-1 block">
                  Milestone Name
                </label>
                <Input
                  value={ruleForm.name}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, name: e.target.value })
                  }
                  placeholder="e.g. 5-Hour Milestone"
                  className="h-9 bg-[#111615] border-white/20 text-xs text-[#F4F1E8]"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-[#929B95] mb-1 block">
                  Hours Played Limit (e.g. 5)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={ruleForm.hoursRequired}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, hoursRequired: e.target.value })
                  }
                  className="h-9 bg-[#111615] border-white/20 text-xs text-[#F4F1E8]"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-[#929B95] mb-1 block">
                  Free Reward Hours (e.g. 1)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={ruleForm.bonusHours}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, bonusHours: e.target.value })
                  }
                  className="h-9 bg-[#111615] border-white/20 text-xs text-[#F4F1E8]"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold text-xs"
              >
                Save Milestone Rule
              </Button>
            </form>
          )}

          {/* Active Milestone Rules + Client Progress Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 5 Cols: Active Milestone Rules */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="text-xs font-semibold text-[#929B95] uppercase tracking-wider">
                Active Milestone Rules ({loyaltyRules.length})
              </div>
              <div className="space-y-2">
                {loyaltyRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3.5 rounded-xl bg-[#080A0A] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F4F1E8]">
                          {rule.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B6F36B]/20 text-[#B6F36B]">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-[#929B95] mt-1">
                        Play{' '}
                        <strong className="text-[#F4F1E8]">
                          {rule.hoursRequired} Hours
                        </strong>{' '}
                        → Get{' '}
                        <strong className="text-[#B6F36B]">
                          +{rule.bonusHours} Hour(s) FREE
                        </strong>{' '}
                        (₹0 to Pay)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRuleForm({
                          id: rule.id,
                          name: rule.name,
                          hoursRequired: String(rule.hoursRequired),
                          bonusHours: String(rule.bonusHours),
                          validForDays: String(rule.validForDays || 90),
                          isActive: rule.isActive,
                        })
                        setEditingRule(true)
                      }}
                      className="h-8 px-2.5 text-xs text-[#929B95] hover:text-[#F4F1E8]"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 7 Cols: Client Loyalty & Unlocked Free Hours */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#929B95] uppercase tracking-wider">
                  Client Milestone Progress &amp; Free Bonus Hours (
                  {savedClients.length})
                </span>
                <span className="text-[#B6F36B]">
                  Auto-fetched when booking Walk-in or Online
                </span>
              </div>

              {savedClients.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#080A0A] border border-white/10 text-xs text-[#929B95]">
                  No saved clients yet. Start a table session to track client playing hours automatically.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {savedClients.slice(0, 8).map((c) => {
                    const targetHours = Number(
                      loyaltyRules[0]?.hoursRequired || 5
                    )
                    const cycleHours = Number(
                      c.milestoneCycleHours ?? c.totalPlayingHours ?? 0
                    )
                    const progress = Math.min(
                      100,
                      Math.round(
                        ((cycleHours % targetHours) /
                          Math.max(1, targetHours)) *
                          100
                      )
                    )
                    const hasReward = Number(c.rewardBalance || 0) > 0
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                          hasReward
                            ? 'bg-gradient-to-br from-[#B6F36B]/15 to-[#080A0A] border-[#B6F36B]/50'
                            : 'bg-[#080A0A] border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-[#F4F1E8] flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {hasReward && (
                                <span className="px-1.5 py-0.5 rounded bg-[#B6F36B] text-[#080A0A] text-[10px] font-extrabold">
                                  🎁 {c.rewardBalance}h FREE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-[#929B95]">
                              {c.phone || c.email || 'Saved Client'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submitting}
                            onClick={() => handleQuickGrantReward(c, 1)}
                            className="h-6 px-2 text-[10px] border-white/15 text-[#B6F36B] hover:bg-[#B6F36B]/15"
                          >
                            +1h Gift
                          </Button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-[#929B95]">
                            <span>
                              Cycle Hours: <strong className="text-[#F4F1E8]">{cycleHours}h / {targetHours}h</strong>
                            </span>
                            <span>
                              {hasReward
                                ? '🎁 Next 1h Booking = ₹0 FREE'
                                : `Goal: ${targetHours}h`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-[#B6F36B]"
                              style={{
                                width: `${hasReward ? 100 : progress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Today's Revenue"
          value={`₹${(stats.todayRevenue ?? 0).toLocaleString('en-IN')}`}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(stats.totalRevenue ?? 0).toLocaleString('en-IN')}`}
          icon={CreditCard}
          loading={loading}
          accent
        />
        <StatCard
          title="Today's Bookings"
          value={stats.todayBookings ?? '—'}
          sub={`${stats.totalBookings ?? 0} all time`}
          icon={Calendar}
          loading={loading}
        />
        <StatCard
          title="Active Sessions"
          value={stats.activeSessions ?? '—'}
          sub="Tables in use right now"
          icon={Gamepad2}
          loading={loading}
          accent
        />
      </div>

      {/* Recent Bookings */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8] text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#B6F36B]" />
            Recent Online Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-[#929B95] text-sm">No bookings yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recent.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-[#080A0A] rounded-lg border border-white/5"
                >
                  <div>
                    <p className="font-medium text-[#F4F1E8] text-sm">
                      {b.customerName}
                    </p>
                    <p className="text-xs text-[#929B95]">
                      {b.table?.name} &bull; {b.startTime} —{' '}
                      {new Date(b.bookingDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#F4F1E8] text-sm font-medium">
                      ₹{Number(b.totalAmount ?? 0).toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[b.status] ?? 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── INTERACTIVE TABLE COMMAND CENTER MODAL (Player + POS Tab + One-Click Paid) ── */}
      <Dialog
        open={Boolean(selectedTable)}
        onOpenChange={(open) => !open && setSelectedTableId(null)}
      >
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center justify-between gap-2 text-xl font-space-grotesk">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-[#B6F36B]/15 text-[#B6F36B] font-mono text-sm">
                  #{selectedTable?.tableNumber}
                </span>
                <span>{selectedTable?.name}</span>
                <span className="text-sm font-normal text-[#929B95]">
                  (₹{selectedTable?.hourlyRate}/hr)
                </span>
              </div>

              {activeSession ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PLAYER ACTIVE: {activeSession.playerName.toUpperCase()}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#B6F36B]/20 text-[#B6F36B]">
                  AVAILABLE TO PLAY
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTable && !activeSession && (
            /* ── STATE 1: TABLE IS AVAILABLE -> ADD WALK-IN PLAYER ── */
            <div className="pt-2">
              <div className="p-5 rounded-xl bg-[#080A0A] border border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#B6F36B]" />
                  <h3 className="font-bold text-[#F4F1E8] text-base">
                    Add Player to {selectedTable.name}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Player Name * with Inline Ghost Autocomplete + Smart Search */}
                  <div className="relative">
                    <label className="text-xs text-[#929B95] mb-1 block">
                      Player Name *
                    </label>
                    {(() => {
                      const typedName = walkInName
                      const qName = typedName.trim().toLowerCase()
                      const prefixMatch =
                        qName.length > 0
                          ? savedClients.find(
                              (c) =>
                                c.name &&
                                c.name.toLowerCase().startsWith(qName) &&
                                c.name.toLowerCase() !== qName
                            )
                          : null
                      const ghostSuffix = prefixMatch
                        ? prefixMatch.name.slice(typedName.length)
                        : ''
                      const nameMatches =
                        qName.length > 0
                          ? savedClients
                              .filter(
                                (c) =>
                                  c.name &&
                                  c.name.toLowerCase().includes(qName) &&
                                  !(
                                    c.name.toLowerCase() === qName &&
                                    (!c.phone || c.phone === walkInPhone)
                                  )
                              )
                              .slice(0, 4)
                          : []

                      return (
                        <>
                          <div className="relative flex items-center">
                            {ghostSuffix && (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm font-normal overflow-hidden whitespace-pre"
                              >
                                <span className="text-transparent">
                                  {typedName}
                                </span>
                                <span className="text-[#929B95]/50">
                                  {ghostSuffix}
                                </span>
                                {prefixMatch?.phone && (
                                  <span className="ml-2 text-[11px] text-[#B6F36B]/60 font-mono">
                                    • {prefixMatch.phone} (Tab ↹)
                                  </span>
                                )}
                              </div>
                            )}
                            <Input
                              value={walkInName}
                              onChange={(e) => setWalkInName(e.target.value)}
                              onKeyDown={(e) => {
                                if (
                                  (e.key === 'Tab' ||
                                    e.key === 'ArrowRight' ||
                                    e.key === 'Enter') &&
                                  (prefixMatch || nameMatches[0])
                                ) {
                                  const target = prefixMatch || nameMatches[0]
                                  if (
                                    target &&
                                    target.name.toLowerCase() !== qName
                                  ) {
                                    e.preventDefault()
                                    handleSelectSavedClient(target)
                                  }
                                }
                              }}
                              placeholder="e.g. Sheshan"
                              className="bg-[#111615] border-white/20 text-[#F4F1E8] relative z-10 bg-transparent"
                            />
                          </div>

                          {/* Smart Search Dropdown under Player Name */}
                          {nameMatches.length > 0 && (
                            <div className="mt-1 rounded-lg bg-[#111615] border border-white/15 shadow-xl overflow-hidden z-20">
                              {nameMatches.map((c) => {
                                const idx = c.name
                                  .toLowerCase()
                                  .indexOf(qName)
                                const before =
                                  idx >= 0 ? c.name.slice(0, idx) : ''
                                const matchPart =
                                  idx >= 0
                                    ? c.name.slice(idx, idx + qName.length)
                                    : c.name
                                const after =
                                  idx >= 0
                                    ? c.name.slice(idx + qName.length)
                                    : ''
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleSelectSavedClient(c)}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-[#B6F36B]/15 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors"
                                  >
                                    <div>
                                      <span className="text-[#929B95]">
                                        {before}
                                      </span>
                                      <span className="text-[#F4F1E8] font-bold">
                                        {matchPart}
                                      </span>
                                      <span className="text-[#B6F36B] font-semibold">
                                        {after}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono text-[11px]">
                                      {c.phone && (
                                        <span className="text-[#F4F1E8]">
                                          {c.phone}
                                        </span>
                                      )}
                                      <span className="text-[#D6B36A] text-[10px]">
                                        {c.totalPlayingHours}h
                                      </span>
                                      {Number(c.rewardBalance) > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#B6F36B] text-[#080A0A] text-[10px] font-bold">
                                          🎁 {c.rewardBalance}h FREE
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  <div>
                    <label className="text-xs text-[#929B95] mb-1 flex items-center justify-between">
                      <span>Duration (Hours)</span>
                      <span className="text-[10px] text-[#B6F36B]">
                        Select preset or type custom hrs
                      </span>
                    </label>
                    {(() => {
                      const tableTiers =
                        Array.isArray(selectedTable.pricingTiers) &&
                        selectedTable.pricingTiers.length > 0
                          ? selectedTable.pricingTiers
                          : [
                              { durationHours: 0.5, price: Math.round(selectedTable.hourlyRate * 0.5) },
                              { durationHours: 1, price: selectedTable.hourlyRate },
                              { durationHours: 1.5, price: Math.round(selectedTable.hourlyRate * 1.5) },
                              { durationHours: 2, price: selectedTable.hourlyRate * 2 },
                              { durationHours: 3, price: selectedTable.hourlyRate * 3 },
                            ]
                      const hasMatchingPreset = tableTiers.some(
                        (t) =>
                          Math.abs(
                            Number(t.durationHours) - Number(walkInDuration)
                          ) < 0.001
                      )
                      return (
                        <div className="flex items-center gap-2">
                          <select
                            value={
                              hasMatchingPreset ? String(walkInDuration) : 'custom'
                            }
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                handleDurationChange(
                                  e.target.value,
                                  selectedTable
                                )
                              }
                            }}
                            className="flex-1 h-10 rounded-md bg-[#111615] border border-white/20 px-2.5 text-sm text-[#F4F1E8]"
                          >
                            {tableTiers.map((tier) => (
                              <option
                                key={tier.durationHours}
                                value={String(tier.durationHours)}
                              >
                                {Number(tier.durationHours) === 1
                                  ? '1 Hour'
                                  : `${tier.durationHours} Hours`}{' '}
                                (₹{tier.price})
                              </option>
                            ))}
                            <option value="custom">Custom Duration...</option>
                          </select>
                          <div className="relative w-24">
                            <Input
                              type="number"
                              step="0.25"
                              min="0.25"
                              value={walkInDuration}
                              onChange={(e) =>
                                handleDurationChange(
                                  e.target.value,
                                  selectedTable
                                )
                              }
                              className="h-10 pr-7 bg-[#111615] border-white/20 text-sm font-bold text-[#B6F36B]"
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#929B95]">
                              hr
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Phone (Optional) with Inline Remaining-Digits Ghost Autocomplete (e.g. 63514579 -> 58) */}
                  <div className="relative">
                    <label className="text-xs text-[#929B95] mb-1 block">
                      Phone (Optional)
                    </label>
                    {(() => {
                      const qPhone = walkInPhone.trim()
                      const phonePrefixMatch =
                        qPhone.length > 0
                          ? savedClients.find(
                              (c) =>
                                c.phone &&
                                c.phone.startsWith(qPhone) &&
                                c.phone !== qPhone
                            )
                          : null
                      const phoneGhostSuffix = phonePrefixMatch
                        ? phonePrefixMatch.phone.slice(qPhone.length)
                        : ''
                      const phoneMatches =
                        qPhone.length > 0
                          ? savedClients
                              .filter(
                                (c) =>
                                  c.phone &&
                                  c.phone.includes(qPhone) &&
                                  !(
                                    c.phone === qPhone &&
                                    c.name.toLowerCase() ===
                                      walkInName.trim().toLowerCase()
                                  )
                              )
                              .slice(0, 4)
                          : []

                      return (
                        <>
                          <div className="relative flex items-center">
                            {phoneGhostSuffix && (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 flex items-center px-3 text-sm font-normal overflow-hidden whitespace-pre"
                              >
                                <span className="text-transparent">
                                  {walkInPhone}
                                </span>
                                <span className="text-[#B6F36B]/70 font-semibold">
                                  {phoneGhostSuffix}
                                </span>
                                {phonePrefixMatch?.name && (
                                  <span className="ml-2 text-[11px] text-[#929B95]">
                                    • {phonePrefixMatch.name} (Tab ↹)
                                  </span>
                                )}
                              </div>
                            )}
                            <Input
                              value={walkInPhone}
                              onChange={(e) =>
                                handlePhoneInputChange(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (
                                  (e.key === 'Tab' ||
                                    e.key === 'ArrowRight' ||
                                    e.key === 'Enter') &&
                                  (phonePrefixMatch || phoneMatches[0])
                                ) {
                                  const target =
                                    phonePrefixMatch || phoneMatches[0]
                                  if (target && target.phone !== qPhone) {
                                    e.preventDefault()
                                    handleSelectSavedClient(target)
                                  }
                                }
                              }}
                              placeholder="e.g. 6351457958"
                              className="bg-[#111615] border-white/20 text-[#F4F1E8] relative z-10 bg-transparent"
                            />
                          </div>

                          {/* Smart Search Dropdown under Phone */}
                          {phoneMatches.length > 0 && (
                            <div className="mt-1 rounded-lg bg-[#111615] border border-white/15 shadow-xl overflow-hidden z-20">
                              {phoneMatches.map((c) => {
                                const idx = c.phone.indexOf(qPhone)
                                const before =
                                  idx >= 0 ? c.phone.slice(0, idx) : ''
                                const matchPart =
                                  idx >= 0
                                    ? c.phone.slice(idx, idx + qPhone.length)
                                    : c.phone
                                const after =
                                  idx >= 0
                                    ? c.phone.slice(idx + qPhone.length)
                                    : ''
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleSelectSavedClient(c)}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-[#B6F36B]/15 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors"
                                  >
                                    <div className="font-mono">
                                      <span className="text-[#929B95]">
                                        {before}
                                      </span>
                                      <span className="text-[#F4F1E8] font-bold">
                                        {matchPart}
                                      </span>
                                      <span className="text-[#B6F36B] font-bold">
                                        {after}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-[#F4F1E8] font-medium">
                                        {c.name}
                                      </span>
                                      <span className="text-[#D6B36A] text-[10px]">
                                        {c.totalPlayingHours}h
                                      </span>
                                      {Number(c.rewardBalance) > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#B6F36B] text-[#080A0A] text-[10px] font-bold">
                                          🎁 {c.rewardBalance}h FREE
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  <div>
                    <label className="text-xs text-[#929B95] mb-1 block">
                      Email (Optional)
                    </label>
                    <Input
                      type="email"
                      value={walkInEmail}
                      onChange={(e) => handleEmailInputChange(e.target.value)}
                      placeholder="e.g. sheshan@gmail.com"
                      className="bg-[#111615] border-white/20 text-[#F4F1E8]"
                    />
                  </div>
                </div>

                {/* Automatic Loyalty Reward Unlocked Banner when Client Hits Milestone Limit */}
                {matchedClientByPhone && availableRewardHours > 0 && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#B6F36B]/20 via-[#B6F36B]/10 to-[#111615] border border-[#B6F36B]/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#B6F36B] text-[#080A0A] flex items-center justify-center font-bold">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#B6F36B]">
                          🎁 Loyalty Milestone Reached! ({matchedClientByPhone.totalPlayingHours}h Played)
                        </div>
                        <div className="text-[11px] text-[#F4F1E8]">
                          {matchedClientByPhone.name} has{' '}
                          <strong>{availableRewardHours} Free Reward Hour(s)</strong>{' '}
                          unlocked!
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#B6F36B]">
                      <input
                        type="checkbox"
                        checked={applyFreeReward}
                        onChange={(e) => setApplyFreeReward(e.target.checked)}
                        className="rounded border-[#B6F36B] bg-[#080A0A] text-[#B6F36B]"
                      />
                      Auto-Apply Free Hour
                    </label>
                  </div>
                )}

                {(() => {
                  const defaultCalculatedFee = Math.round(
                    Number(walkInDuration || 1) * selectedTable.hourlyRate
                  )
                  const baseFee =
                    walkInPrice !== '' && !Number.isNaN(Number(walkInPrice))
                      ? Math.max(0, Number(walkInPrice))
                      : defaultCalculatedFee
                  const effectiveHourlyRate =
                    Number(walkInDuration || 1) > 0
                      ? Math.round(baseFee / Number(walkInDuration || 1))
                      : selectedTable.hourlyRate
                  const rewardDiscount = Math.min(
                    baseFee,
                    Math.round(redeemableHoursNow * effectiveHourlyRate)
                  )
                  const netFee = Math.max(0, baseFee - rewardDiscount)
                  const rateChangedFromDefault =
                    effectiveHourlyRate > 0 &&
                    effectiveHourlyRate !== Number(selectedTable.hourlyRate)

                  return (
                    <>
                      <div className="p-3 rounded-lg bg-[#111615] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[#929B95]">
                            Walk-in Table Fee (Editable Price):
                          </span>
                          {rateChangedFromDefault && (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() =>
                                handleSaveTableRate(effectiveHourlyRate)
                              }
                              className="px-2 py-0.5 rounded bg-[#B6F36B]/15 border border-[#B6F36B]/40 text-[#B6F36B] text-[10px] font-semibold hover:bg-[#B6F36B]/25 transition-colors"
                            >
                              Save ₹{effectiveHourlyRate}/hr as Table Rate
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="relative w-28">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#929B95]">
                              ₹
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="10"
                              value={walkInPrice}
                              onChange={(e) => setWalkInPrice(e.target.value)}
                              className="h-8 pl-6 pr-2 bg-[#080A0A] border-white/25 text-sm font-bold text-amber-400"
                            />
                          </div>

                          {redeemableHoursNow > 0 ? (
                            <span className="font-bold text-[#B6F36B] text-xs">
                              → ₹{netFee}{' '}
                              {netFee === 0
                                ? `(FREE • 🎁 ${redeemableHoursNow}h Reward)`
                                : `PENDING (-₹${rewardDiscount} Reward)`}
                            </span>
                          ) : (
                            <span className="font-bold text-amber-400 text-xs">
                              — PENDING
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        disabled={submitting}
                        onClick={() => handleStartWalkInOrOnline(null)}
                        className="w-full h-11 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold"
                      >
                        {submitting
                          ? 'Starting Table...'
                          : redeemableHoursNow > 0 && netFee === 0
                          ? `🎁 Start FREE Reward Table for ${
                              walkInName.trim() || 'Player'
                            } (₹0 to Pay)`
                          : `Start Table for ${
                              walkInName.trim() || 'Player'
                            } (${walkInDuration}h • ₹${netFee})`}
                      </Button>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {selectedTable && activeSession && (
            /* ── STATE 2: PLAYER IS PLAYING -> SHOW PLAYER BILL + POINT OF SALE (POS) TAB ── */
            <div className="space-y-6 pt-2">
              {/* Top Player & Settlement Banner */}
              <div className="p-4 rounded-xl bg-[#080A0A] border border-white/15 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#B6F36B]/20 border border-[#B6F36B]/40 flex items-center justify-center text-lg font-bold text-[#B6F36B]">
                    {activeSession.playerName?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-[#F4F1E8]">
                        {activeSession.playerName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          activeSession.isOnlineBooking
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {activeSession.isOnlineBooking
                          ? 'ONLINE BOOKING'
                          : 'WALK-IN'}
                      </span>
                    </div>
                    {(() => {
                      const modalTimer = getCountdownTimer(activeSession, nowMs)
                      return (
                        <>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-[#929B95]">
                              Booked {activeSession.durationHours}h &bull; Left:
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#B6F36B]/15 text-[#B6F36B] font-mono text-xs font-bold">
                              {modalTimer.formatted} min
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] bg-[#111615] border border-white/10 px-2.5 py-1 rounded-md w-fit">
                            <Clock className="w-3 h-3 text-[#B6F36B] shrink-0" />
                            <span className="text-[#929B95]">
                              Start:{' '}
                              <strong className="text-[#F4F1E8] font-mono">
                                {modalTimer.startTimeLabel}
                              </strong>
                            </span>
                            <span className="text-white/30">&bull;</span>
                            <span className="text-[#929B95]">
                              End:{' '}
                              <strong className="text-[#D6B36A] font-mono">
                                {modalTimer.endTimeLabel}
                              </strong>
                            </span>
                          </div>
                        </>
                      )
                    })()}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => handleExtendTable(0.5)}
                        className="h-6 px-2 text-[11px] border-white/20 text-[#F4F1E8]"
                      >
                        +30m
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => handleExtendTable(1)}
                        className="h-6 px-2 text-[11px] border-white/20 text-[#F4F1E8]"
                      >
                        +1 Hour
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => {
                          setEditSessionDuration(
                            String(activeSession.durationHours || 1)
                          )
                          setEditSessionPrice(
                            String(activeSession.tableCharge ?? 200)
                          )
                          setEditingActiveSession(!editingActiveSession)
                        }}
                        className="h-6 px-2 text-[11px] border-[#B6F36B]/40 text-[#B6F36B] hover:bg-[#B6F36B]/15"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit Duration &amp; Price
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() =>
                          handleTogglePauseSession(
                            activeSession.id,
                            activeSession.status
                          )
                        }
                        className="h-6 px-2 text-[11px] border-white/20 text-[#929B95] hover:text-[#F4F1E8]"
                      >
                        {activeSession.status === 'PAUSED' ? 'Resume' : 'Pause'}
                      </Button>
                    </div>

                    {editingActiveSession && (
                      <form
                        onSubmit={handleUpdateActiveSessionDurationPrice}
                        className="mt-2.5 p-2.5 rounded-lg bg-[#111615] border border-[#B6F36B]/40 flex flex-wrap items-end gap-2"
                      >
                        <div>
                          <label className="text-[10px] text-[#929B95] block mb-0.5">
                            Duration (Hrs)
                          </label>
                          <Input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={editSessionDuration}
                            onChange={(e) => {
                              const d = e.target.value
                              setEditSessionDuration(d)
                              if (!Number.isNaN(Number(d)) && Number(d) > 0) {
                                setEditSessionPrice(
                                  String(
                                    Math.round(
                                      Number(d) *
                                        Number(selectedTable.hourlyRate || 200)
                                    )
                                  )
                                )
                              }
                            }}
                            className="h-7 w-20 bg-[#080A0A] border-white/20 text-xs text-[#F4F1E8]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#929B95] block mb-0.5">
                            Table Price (₹)
                          </label>
                          <Input
                            type="number"
                            step="10"
                            min="0"
                            value={editSessionPrice}
                            onChange={(e) =>
                              setEditSessionPrice(e.target.value)
                            }
                            className="h-7 w-24 bg-[#080A0A] border-white/20 text-xs text-amber-400 font-bold"
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={submitting}
                          className="h-7 px-2.5 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 text-[11px] font-bold"
                        >
                          Save
                        </Button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Middle: Paid vs Pending Totals */}
                <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#111615] border border-emerald-500/25">
                    <span className="text-[11px] uppercase text-[#929B95] block">
                      Already Paid
                    </span>
                    <span className="text-xl font-bold text-emerald-400">
                      ₹{activeSession.totalPaid}
                    </span>
                    <span className="text-[11px] text-[#929B95] block mt-0.5">
                      {activeSession.tablePaymentStatus === 'PAID'
                        ? `Includes ₹${activeSession.tableCharge} Table`
                        : ' POS Paid only'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#111615] border border-amber-500/35">
                    <span className="text-[11px] uppercase text-[#929B95] block">
                      Pending to Pay
                    </span>
                    <span className="text-xl font-bold text-amber-400">
                      ₹{activeSession.totalPending}
                    </span>
                    <span className="text-[11px] text-[#929B95] block mt-0.5">
                      {activeSession.tablePaymentStatus !== 'PAID'
                        ? `₹${activeSession.tableCharge} Table + ₹${activeSession.posPendingTotal} POS`
                        : `₹${activeSession.posPendingTotal} POS Tab`}
                    </span>
                  </div>
                </div>

                {/* Right: One-Click Paid & Checkout Controls */}
                <div className="lg:col-span-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-9 rounded-md bg-[#111615] border border-white/20 px-2.5 text-xs text-[#F4F1E8]"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="CARD">CARD</option>
                    </select>

                    {activeSession.totalPending > 0 ? (
                      <Button
                        disabled={submitting}
                        onClick={() =>
                          handleMarkPaid({ scope: 'ALL', endSession: false })
                        }
                        className="flex-1 h-9 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold text-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Paid (₹{activeSession.totalPending})
                      </Button>
                    ) : (
                      <span className="flex-1 text-center py-1.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                        ✓ All Dues Paid
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    disabled={submitting}
                    onClick={() =>
                      activeSession.totalPending > 0
                        ? handleMarkPaid({ scope: 'ALL', endSession: true })
                        : handleEndSessionOnly()
                    }
                    className="w-full h-9 border-[#D6B36A]/50 text-[#D6B36A] hover:bg-[#D6B36A]/10 text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    {activeSession.totalPending > 0
                      ? `Collect ₹${activeSession.totalPending} & Free Table`
                      : 'Finish Session & Free Table'}
                  </Button>
                </div>
              </div>

              {/* ── UNDER PLAYER: POINT OF SALE (POS) & PLAYER ITEMIZED BILL ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 7 Cols: Point of Sale (POS) Quick Add Catalog */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-[#080A0A] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-[#B6F36B]" />
                      <h4 className="font-bold text-sm text-[#F4F1E8]">
                        Point of Sale (POS) — Tap to Add to {activeSession.playerName}&apos;s Tab
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#929B95]">
                      Isolated from table booking cost
                    </span>
                  </div>

                  {/* Search & Category Pills */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-[#929B95] absolute left-2.5 top-2.5" />
                      <Input
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        placeholder="Search Coca-Cola, Red Bull, snacks..."
                        className="h-8 pl-8 bg-[#111615] border-white/15 text-xs"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant={posCategory === 'ALL' ? 'default' : 'outline'}
                        onClick={() => setPosCategory('ALL')}
                        className={`h-8 px-2.5 text-xs ${
                          posCategory === 'ALL'
                            ? 'bg-[#B6F36B] text-[#080A0A]'
                            : 'border-white/15 text-[#929B95]'
                        }`}
                      >
                        All
                      </Button>
                      {categories.map((cat) => (
                        <Button
                          key={cat.id}
                          size="sm"
                          variant={posCategory === cat.id ? 'default' : 'outline'}
                          onClick={() => setPosCategory(cat.id)}
                          className={`h-8 px-2.5 text-xs ${
                            posCategory === cat.id
                              ? 'bg-[#B6F36B] text-[#080A0A]'
                              : 'border-white/15 text-[#929B95]'
                          }`}
                        >
                          {cat.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {filteredPosProducts.map((prod) => {
                      const outOfStock = prod.currentStock <= 0
                      return (
                        <button
                          key={prod.id}
                          disabled={outOfStock || submitting}
                          onClick={() => handleAddPosProductToTable(prod)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            outOfStock
                              ? 'bg-[#111615]/40 border-white/5 opacity-40 cursor-not-allowed'
                              : 'bg-[#111615] border-white/10 hover:border-[#B6F36B] hover:bg-[#161F1C]'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#F4F1E8] line-clamp-1">
                              {prod.name}
                            </div>
                            <div className="text-[10px] text-[#929B95] mt-0.5">
                              {prod.currentStock} {prod.unit} in stock
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                            <span className="text-sm font-bold text-[#B6F36B]">
                              +₹{prod.sellingPrice}
                            </span>
                            <span className="w-6 h-6 rounded bg-[#B6F36B]/15 text-[#B6F36B] flex items-center justify-center">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Right 5 Cols: Itemized Player Account (Table Fee + POS Tab Items) */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-[#080A0A] border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-[#F4F1E8] flex items-center justify-between">
                      <span>{activeSession.playerName}&apos;s Account Breakdown</span>
                      <span className="text-xs font-normal text-[#929B95]">
                        {activeSession.posItems.length + 1} line(s)
                      </span>
                    </h4>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {/* 1. Table Fee Row */}
                      <div className="p-3 rounded-lg bg-[#111615] border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#F4F1E8]">
                            {selectedTable.name} ({activeSession.durationHours} hr)
                          </div>
                          <div className="text-[11px] text-[#929B95]">
                            {activeSession.isOnlineBooking
                              ? 'Online Table Reservation'
                              : 'Walk-in Table Charge'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#F4F1E8]">
                            ₹{activeSession.tableCharge}
                          </span>
                          {activeSession.tablePaymentStatus === 'PAID' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              PAID
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              disabled={submitting}
                              onClick={() =>
                                handleMarkPaid({
                                  scope: 'TABLE_ONLY',
                                  endSession: false,
                                })
                              }
                              className="h-6 px-2 bg-amber-500/20 text-amber-300 hover:bg--[#B6F36B] hover:text-[#080A0A] border border-amber-500/40 text-[10px] font-bold"
                            >
                              PENDING • Click Paid
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 2. POS Tab Rows */}
                      {activeSession.posItems.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#929B95] border border-dashed border-white/10 rounded-lg">
                          No POS drinks or snacks added yet. Tap any item on the left to add to {activeSession.playerName}&apos;s tab.
                        </div>
                      ) : (
                        activeSession.posItems.map((item) => {
                          const isPaid = item.paymentStatus === 'PAID'
                          return (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-lg bg-[#111615] border border-white/10 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-[#F4F1E8] truncate">
                                  {item.productName} ×{item.quantity}
                                </div>
                                <div className="text-[10px] text-[#929B95]">
                                  POS Tab Item (Not in booking cost)
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#F4F1E8]">
                                  ₹{item.totalPrice}
                                </span>
                                {isPaid ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                    PAID
                                  </span>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      disabled={submitting}
                                      onClick={() =>
                                        handleMarkPaid({
                                          scope: 'SINGLE_POS',
                                          posSaleId: item.posSaleId,
                                          endSession: false,
                                        })
                                      }
                                      className="h-6 px-2 bg-amber-500/20 text-amber-300 hover:bg-[#B6F36B] hover:text-[#080A0A] border border-amber-500/40 text-[10px] font-bold"
                                    >
                                      PENDING • Paid
                                    </Button>
                                    <button
                                      type="button"
                                      disabled={submitting}
                                      onClick={() =>
                                        handleRemovePosItem(
                                          item.posSaleId,
                                          item.productName
                                        )
                                      }
                                      className="p-1 text-red-400 hover:text-red-300"
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Bottom Summary Box */}
                  <div className="p-3 rounded-lg bg-[#111615] border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#929B95]">
                      <span>Table Charge ({activeSession.tablePaymentStatus})</span>
                      <span>₹{activeSession.tableCharge}</span>
                    </div>
                    <div className="flex justify-between text-[#929B95]">
                      <span>POS Tab Total</span>
                      <span>
                        ₹{activeSession.posPaidTotal + activeSession.posPendingTotal}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-white/10">
                      <span>Paid Amount</span>
                      <span>₹{activeSession.totalPaid}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-amber-400">
                      <span>Pending to Collect</span>
                      <span>₹{activeSession.totalPending}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
