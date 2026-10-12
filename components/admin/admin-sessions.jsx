"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Gamepad2,
  Play,
  Pause,
  Square,
  Plus,
  Clock,
  RefreshCw,
  AlertTriangle,
  User,
  Phone,
  Gift,
  CheckCircle2,
  Loader2,
  CalendarCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

function formatElapsedHMS(startTimeStr) {
  if (!startTimeStr) return '00:00:00'
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(startTimeStr).getTime()) / 1000)
  )
  const hrs = Math.floor(diffSec / 3600)
  const mins = Math.floor((diffSec % 3600) / 60)
  const secs = diffSec % 60
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function AdminSessions() {
  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [readyBookings, setReadyBookings] = useState([])
  const [customers, setCustomers] = useState([])
  const [tick, setTick] = useState(0)

  // Modal states
  const [startModalTable, setStartModalTable] = useState(null)
  const [extendModalSession, setExtendModalSession] = useState(null)
  const [stopModalSession, setStopModalSession] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Start Session Form
  const [startForm, setStartForm] = useState({
    sessionType: 'WALK_IN',
    customerId: '',
    customerName: '',
    customerPhone: '',
    expectedDurationHours: '1',
    notes: '',
  })

  // Extend Form
  const [extendForm, setExtendForm] = useState({
    additionalHours: '0.5',
    reason: 'Customer requested extra time',
  })

  // Stop / Checkout Form
  const [stopForm, setStopForm] = useState({
    overrideDurationHours: '',
    discountAmount: '0',
    discountReason: '',
    redeemBonusHours: '0',
    paymentMethod: 'CASH',
    notes: '',
  })

  const fetchSessionsData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/sessions')
      if (!res.ok) throw new Error('Failed to load sessions')
      const data = await res.json()
      setTables(data.tables || [])
      setActiveSessions(data.activeSessions || [])
      setRecentSessions(data.recentSessions || [])
      setReadyBookings(data.readyBookings || [])
      setCustomers(data.customers || [])
    } catch (err) {
      console.error('Error loading sessions board:', err)
      if (!silent) toast.error('Failed to load live sessions board')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessionsData()
    const pollInterval = setInterval(() => fetchSessionsData(true), 30000)
    const clockInterval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => {
      clearInterval(pollInterval)
      clearInterval(clockInterval)
    }
  }, [fetchSessionsData])

  // Open Start Walk-In Modal
  const openStartModal = (table) => {
    setStartModalTable(table)
    setStartForm({
      sessionType: 'WALK_IN',
      customerId: '',
      customerName: '',
      customerPhone: '',
      expectedDurationHours: '1',
      notes: '',
    })
  }

  // Start Session from Online Booking in 1 click
  const handleStartFromBooking = async (booking) => {
    try {
      setSubmitting(true)
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          tableId: booking.tableId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to start session from booking')
        return
      }
      toast.success(`Session started on ${booking.table?.name} for ${booking.customerName}`)
      fetchSessionsData(true)
    } catch (err) {
      toast.error('Failed to start session')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Start Walk-In Session
  const handleStartSubmit = async (e) => {
    e.preventDefault()
    if (!startModalTable) return

    try {
      setSubmitting(true)
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: startModalTable.id,
          sessionType: startForm.sessionType,
          customerId: startForm.customerId || null,
          customerName: startForm.customerName,
          customerPhone: startForm.customerPhone,
          expectedDurationHours: Number(startForm.expectedDurationHours || 1),
          notes: startForm.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to start session')
        return
      }
      toast.success(`Session started on ${startModalTable.name}`)
      setStartModalTable(null)
      fetchSessionsData(true)
    } catch (err) {
      toast.error('Failed to start session')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Extend Session
  const handleExtendSubmit = async (e) => {
    e.preventDefault()
    if (!extendModalSession) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/sessions/${extendModalSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend',
          additionalHours: Number(extendForm.additionalHours),
          reason: extendForm.reason,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to extend session')
        return
      }
      toast.success(`Extended session by ${extendForm.additionalHours}h`)
      setExtendModalSession(null)
      fetchSessionsData(true)
    } catch (err) {
      toast.error('Failed to extend session')
    } finally {
      setSubmitting(false)
    }
  }

  // Pause / Resume Session
  const handleTogglePause = async (sess) => {
    const nextAction = sess.status === 'ACTIVE' ? 'pause' : 'resume'
    try {
      const res = await fetch(`/api/sessions/${sess.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextAction,
          reason: `Session ${nextAction}d from live board`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || `Failed to ${nextAction} session`)
        return
      }
      toast.success(`Session ${nextAction === 'pause' ? 'paused' : 'resumed'}`)
      fetchSessionsData(true)
    } catch (err) {
      toast.error('Failed to update session status')
    }
  }

  // Open Stop / Checkout Modal
  const openStopModal = (sess) => {
    const elapsedHrs = Math.max(
      0.25,
      Number(
        ((Date.now() - new Date(sess.startTime).getTime()) / 3600000).toFixed(2)
      )
    )
    setStopModalSession(sess)
    setStopForm({
      overrideDurationHours: sess.isAbandoned
        ? String(sess.actualDuration || 1)
        : String(elapsedHrs),
      discountAmount: String(sess.discountAmount || 0),
      discountReason: sess.discountReason || '',
      redeemBonusHours: '0',
      paymentMethod: 'CASH',
      notes: '',
    })
  }

  // Submit Stop / Complete Session
  const handleStopSubmit = async (e) => {
    e.preventDefault()
    if (!stopModalSession) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/sessions/${stopModalSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          overrideDurationHours: stopForm.overrideDurationHours
            ? Number(stopForm.overrideDurationHours)
            : null,
          discountAmount: Number(stopForm.discountAmount || 0),
          discountReason: stopForm.discountReason || null,
          redeemBonusHours: Number(stopForm.redeemBonusHours || 0),
          paymentMethod: stopForm.paymentMethod,
          paymentStatus: 'PAID',
          notes: stopForm.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to complete session')
        return
      }

      toast.success(
        `Session completed! Final charge: ₹${Number(data.session.finalAmount).toFixed(0)}`
      )
      if (data.issuedRewards && data.issuedRewards.length > 0) {
        toast.success(
          `🎉 Customer unlocked ${data.issuedRewards.length} loyalty milestone reward(s)!`
        )
      }
      setStopModalSession(null)
      fetchSessionsData(true)
    } catch (err) {
      toast.error('Failed to complete session')
    } finally {
      setSubmitting(false)
    }
  }

  const abandonedSessions = activeSessions.filter((s) => s.isAbandoned)
  const availableTablesCount = tables.filter(
    (t) => !t.activeSession && t.status === 'AVAILABLE'
  ).length

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
            Live Gaming Sessions
          </h1>
          <p className="text-sm text-[#929B95] mt-1">
            Start walk-in or booking sessions, track live table timers, and automatic loyalty hours.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchSessionsData()}
          className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Board
        </Button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-[#929B95]">Active Sessions</p>
              <p className="text-3xl font-bold text-[#B6F36B] mt-1">
                {activeSessions.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#B6F36B]/15 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-[#B6F36B]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-[#929B95]">Available Tables</p>
              <p className="text-3xl font-bold text-[#F4F1E8] mt-1">
                {availableTablesCount} / {tables.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-[#929B95]">Ready Bookings Today</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">
                {readyBookings.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-[#929B95]">Abandoned (&gt;24h)</p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  abandonedSessions.length > 0 ? 'text-amber-400' : 'text-[#F4F1E8]'
                }`}
              >
                {abandonedSessions.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abandoned Sessions Alert */}
      {abandonedSessions.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>
              {abandonedSessions.length} session(s) have been open for over 24 hours without an end event. Please resolve them manually:
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {abandonedSessions.map((ab) => (
              <div
                key={ab.id}
                className="flex items-center gap-3 bg-[#080A0A] px-3.5 py-2 rounded-lg border border-amber-500/30 text-xs"
              >
                <span className="font-semibold text-[#F4F1E8]">
                  {ab.table?.name} ({ab.elapsedHours}h elapsed)
                </span>
                <Button
                  size="sm"
                  onClick={() => openStopModal(ab)}
                  className="h-7 bg-amber-500 text-[#080A0A] hover:bg-amber-400 font-semibold text-xs"
                >
                  Resolve Now
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready Online Bookings Strip */}
      {readyBookings.length > 0 && (
        <Card className="bg-[#111615] border-blue-500/30">
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              Confirmed Online Bookings Ready for Check-In
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {readyBookings.map((bk) => (
                <div
                  key={bk.id}
                  className="p-3.5 rounded-xl bg-[#080A0A] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[#F4F1E8]">
                      {bk.customerName} • {bk.table?.name}
                    </p>
                    <p className="text-xs text-[#929B95]">
                      {bk.startTime}–{bk.endTime} ({Number(bk.durationHours)}h) • {bk.phone}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={submitting}
                    onClick={() => handleStartFromBooking(bk)}
                    className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Tables & Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tables.map((table) => {
          const sess = table.activeSession
          const isOccupied = Boolean(sess)
          const elapsedStr = sess ? formatElapsedHMS(sess.startTime) : null
          const elapsedHrs = sess
            ? Math.max(
                0.25,
                (Date.now() - new Date(sess.startTime).getTime()) / 3600000
              )
            : 0
          const liveAccrued = sess
            ? sess.sessionType === 'COMPLIMENTARY'
              ? 0
              : Math.round(elapsedHrs * Number(sess.hourlyRate))
            : 0

          return (
            <Card
              key={table.id}
              className={`border transition-all ${
                isOccupied
                  ? sess.status === 'PAUSED'
                    ? 'bg-[#111615] border-amber-500/40'
                    : 'bg-[#111615] border-[#B6F36B]/50 shadow-lg shadow-[#B6F36B]/5'
                  : 'bg-[#111615] border-white/10'
              }`}
            >
              <CardContent className="p-6 flex flex-col justify-between h-full space-y-5">
                {/* Table Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-[#929B95]">
                        #{table.tableNumber}
                      </span>
                      <h3 className="text-lg font-bold text-[#F4F1E8]">{table.name}</h3>
                    </div>
                    <p className="text-xs text-[#929B95] mt-1">
                      {table.type} • ₹{Number(table.hourlyRate)}/hr
                    </p>
                  </div>

                  {isOccupied ? (
                    <Badge
                      className={
                        sess.status === 'PAUSED'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30 animate-pulse'
                      }
                    >
                      {sess.status}
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                      {table.status}
                    </Badge>
                  )}
                </div>

                {/* Body */}
                {isOccupied ? (
                  <div className="space-y-4">
                    {/* Live Timer Box */}
                    <div className="p-4 rounded-xl bg-[#080A0A] border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#929B95]">
                          Elapsed Time
                        </p>
                        <p
                          key={tick}
                          className="text-2xl font-mono font-bold text-[#B6F36B] mt-0.5"
                        >
                          {elapsedStr}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider text-[#929B95]">
                          Accrued Charge
                        </p>
                        <p className="text-xl font-bold text-[#F4F1E8] mt-0.5">
                          ₹{liveAccrued}
                        </p>
                      </div>
                    </div>

                    {/* Customer & Session Info */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#929B95]">Player</span>
                        <span className="font-semibold text-[#F4F1E8]">
                          {sess.customer?.user?.name ||
                            sess.booking?.customerName ||
                            sess.notes ||
                            'Walk-In Guest'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#929B95]">Session Type</span>
                        <span className="text-[#F4F1E8]">
                          {sess.sessionType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#929B95]">Started At</span>
                        <span className="text-[#F4F1E8]">
                          {new Date(sess.startTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {sess.customer && Number(sess.customer.rewardBalance) > 0 && (
                        <div className="flex justify-between text-[#D6B36A]">
                          <span>Available Bonus Hours</span>
                          <span className="font-semibold">
                            {Number(sess.customer.rewardBalance).toFixed(1)}h free
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExtendModalSession(sess)
                          setExtendForm({
                            additionalHours: '0.5',
                            reason: 'Extended by customer request',
                          })
                        }}
                        className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Extend
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePause(sess)}
                        className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                      >
                        {sess.status === 'ACTIVE' ? (
                          <>
                            <Pause className="w-3.5 h-3.5 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1" />
                            Resume
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => openStopModal(sess)}
                        className="bg-red-500 text-white hover:bg-red-600 font-semibold text-xs"
                      >
                        <Square className="w-3.5 h-3.5 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-24 rounded-xl bg-gradient-to-br from-[#1a472a]/50 to-[#0d2818]/50 border border-white/5 flex flex-col items-center justify-center">
                      <span className="text-2xl">🎱</span>
                      <span className="text-xs text-[#929B95] mt-1">Ready for Play</span>
                    </div>

                    <Button
                      onClick={() => openStartModal(table)}
                      disabled={table.status !== 'AVAILABLE'}
                      className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
                    >
                      <Play className="w-4 h-4 mr-1.5" />
                      Start Walk-In Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Completed Sessions */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            Recently Completed Sessions
          </h2>

          {recentSessions.length === 0 ? (
            <p className="text-sm text-[#929B95] py-8 text-center">
              No completed gaming sessions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase text-[#929B95] border-b border-white/10">
                  <tr>
                    <th className="py-3 pr-4">Table</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Final Charge</th>
                    <th className="py-3 pl-4 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentSessions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 pr-4 font-semibold text-[#F4F1E8]">
                        {s.table?.name}
                      </td>
                      <td className="py-3 px-4 text-[#929B95]">
                        {s.customer?.user?.name ||
                          s.booking?.customerName ||
                          s.notes ||
                          'Walk-In'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#929B95]">
                        {s.sessionType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-[#F4F1E8]">
                        {Number(s.actualDuration).toFixed(2)}h
                      </td>
                      <td className="py-3 px-4 text-[#929B95]">
                        {Number(s.discountAmount) > 0
                          ? `-₹${Number(s.discountAmount).toFixed(0)}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#B6F36B]">
                        ₹{Number(s.finalAmount).toFixed(0)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Badge className="bg-[#B6F36B]/15 text-[#B6F36B] border-[#B6F36B]/30">
                          {s.paymentMethod || s.paymentStatus}
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

      {/* ── Modal 1: Start Walk-In Session ────────────────────────────────── */}
      {startModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-[#111615] border-white/15">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#F4F1E8]">
                  Start Session — {startModalTable.name}
                </h3>
                <button
                  onClick={() => setStartModalTable(null)}
                  className="text-[#929B95] hover:text-[#F4F1E8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStartSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Session Type
                    </label>
                    <select
                      value={startForm.sessionType}
                      onChange={(e) =>
                        setStartForm({ ...startForm, sessionType: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                    >
                      <option value="WALK_IN">Walk-In</option>
                      <option value="PREPAID">Prepaid</option>
                      <option value="COMPLIMENTARY">Complimentary (Free)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Expected Duration (Hours)
                    </label>
                    <select
                      value={startForm.expectedDurationHours}
                      onChange={(e) =>
                        setStartForm({
                          ...startForm,
                          expectedDurationHours: e.target.value,
                        })
                      }
                      className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                    >
                      <option value="0.5">0.5 Hour (30 mins)</option>
                      <option value="1">1 Hour</option>
                      <option value="1.5">1.5 Hours</option>
                      <option value="2">2 Hours</option>
                      <option value="3">3 Hours</option>
                      <option value="4">4 Hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#929B95] mb-1">
                    Select Existing Member (Optional)
                  </label>
                  <select
                    value={startForm.customerId}
                    onChange={(e) => {
                      const cid = e.target.value
                      const found = customers.find((c) => c.id === cid)
                      setStartForm({
                        ...startForm,
                        customerId: cid,
                        customerName: found ? found.name : startForm.customerName,
                        customerPhone: found ? found.phone : startForm.customerPhone,
                      })
                    }}
                    className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                  >
                    <option value="">-- New Walk-In / Enter Name & Phone Below --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} — {c.totalPlayingHours}h played
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Customer Name
                    </label>
                    <Input
                      value={startForm.customerName}
                      onChange={(e) =>
                        setStartForm({ ...startForm, customerName: e.target.value })
                      }
                      placeholder="Walk-in player name"
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Mobile Number (Tracks Loyalty)
                    </label>
                    <Input
                      value={startForm.customerPhone}
                      maxLength={10}
                      onChange={(e) =>
                        setStartForm({
                          ...startForm,
                          customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10),
                        })
                      }
                      placeholder="10-digit phone"
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStartModalTable(null)}
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
                      'Start Table Timer'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modal 2: Extend Session ───────────────────────────────────────── */}
      {extendModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-[#111615] border-white/15">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#F4F1E8]">
                  Extend Session — {extendModalSession.table?.name}
                </h3>
                <button
                  onClick={() => setExtendModalSession(null)}
                  className="text-[#929B95] hover:text-[#F4F1E8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExtendSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#929B95] mb-1">
                    Add Hours
                  </label>
                  <select
                    value={extendForm.additionalHours}
                    onChange={(e) =>
                      setExtendForm({ ...extendForm, additionalHours: e.target.value })
                    }
                    className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                  >
                    <option value="0.5">+30 Minutes (0.5h)</option>
                    <option value="1">+1 Hour</option>
                    <option value="1.5">+1.5 Hours</option>
                    <option value="2">+2 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#929B95] mb-1">
                    Reason *
                  </label>
                  <Input
                    value={extendForm.reason}
                    onChange={(e) =>
                      setExtendForm({ ...extendForm, reason: e.target.value })
                    }
                    className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setExtendModalSession(null)}
                    className="text-[#929B95]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
                  >
                    Confirm Extension
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modal 3: Stop & Checkout Session ──────────────────────────────── */}
      {stopModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-[#111615] border-white/15">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#F4F1E8]">
                  Complete Session — {stopModalSession.table?.name}
                </h3>
                <button
                  onClick={() => setStopModalSession(null)}
                  className="text-[#929B95] hover:text-[#F4F1E8]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStopSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Billable Duration (Hours)
                    </label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={stopForm.overrideDurationHours}
                      onChange={(e) =>
                        setStopForm({
                          ...stopForm,
                          overrideDurationHours: e.target.value,
                        })
                      }
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Payment Method
                    </label>
                    <select
                      value={stopForm.paymentMethod}
                      onChange={(e) =>
                        setStopForm({ ...stopForm, paymentMethod: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="RAZORPAY">Razorpay</option>
                    </select>
                  </div>
                </div>

                {/* Loyalty Redemption Option if customer has bonus hours */}
                {stopModalSession.customer &&
                  Number(stopModalSession.customer.rewardBalance) > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#D6B36A]/10 border border-[#D6B36A]/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#D6B36A] font-semibold flex items-center gap-1.5">
                          <Gift className="w-4 h-4" />
                          Customer has {Number(stopModalSession.customer.rewardBalance).toFixed(1)}h Free Bonus Hours
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs text-[#929B95] mb-1">
                          Redeem Bonus Hours on this Session
                        </label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max={Number(stopModalSession.customer.rewardBalance)}
                          value={stopForm.redeemBonusHours}
                          onChange={(e) =>
                            setStopForm({
                              ...stopForm,
                              redeemBonusHours: e.target.value,
                            })
                          }
                          className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                        />
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Discount Amount (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={stopForm.discountAmount}
                      onChange={(e) =>
                        setStopForm({ ...stopForm, discountAmount: e.target.value })
                      }
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#929B95] mb-1">
                      Discount / Override Reason
                    </label>
                    <Input
                      value={stopForm.discountReason}
                      onChange={(e) =>
                        setStopForm({ ...stopForm, discountReason: e.target.value })
                      }
                      placeholder="Optional reason"
                      className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                    />
                  </div>
                </div>

                {/* Live Checkout Total Preview */}
                {(() => {
                  const hrs = Number(stopForm.overrideDurationHours || 0)
                  const rate =
                    stopModalSession.sessionType === 'COMPLIMENTARY'
                      ? 0
                      : Number(stopModalSession.hourlyRate || 0)
                  const gross = hrs * rate
                  const bonusDeduct = Number(stopForm.redeemBonusHours || 0) * rate
                  const disc = Number(stopForm.discountAmount || 0)
                  const net = Math.max(0, gross - bonusDeduct - disc)

                  return (
                    <div className="p-4 rounded-xl bg-[#080A0A] border border-white/10 space-y-2 text-sm">
                      <div className="flex justify-between text-[#929B95]">
                        <span>
                          Gross Charge ({hrs}h × ₹{rate}/hr)
                        </span>
                        <span>₹{gross.toFixed(0)}</span>
                      </div>
                      {bonusDeduct > 0 && (
                        <div className="flex justify-between text-[#D6B36A]">
                          <span>Loyalty Bonus Redeemed</span>
                          <span>-₹{bonusDeduct.toFixed(0)}</span>
                        </div>
                      )}
                      {disc > 0 && (
                        <div className="flex justify-between text-[#929B95]">
                          <span>Discount</span>
                          <span>-₹{disc.toFixed(0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="font-semibold text-[#F4F1E8]">Final Payable</span>
                        <span className="text-2xl font-bold text-[#B6F36B]">
                          ₹{net.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStopModalSession(null)}
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
                      'Complete & Free Table'
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

