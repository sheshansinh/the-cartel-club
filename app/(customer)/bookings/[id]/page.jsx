"use client"

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Loader2,
  XCircle,
  History,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'

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

export default function CustomerBookingDetailPage({ params }) {
  const resolvedParams = use(params)
  const bookingId = resolvedParams.id

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true)
        const res = await fetch(`/api/bookings/${bookingId}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Booking not found')
          return
        }
        setBooking(data.booking)
      } catch (err) {
        console.error('Error loading booking detail:', err)
        setError('Failed to load booking details')
      } finally {
        setLoading(false)
      }
    }
    if (bookingId) loadBooking()
  }, [bookingId])

  const handleCancel = async () => {
    const reason = window.prompt(
      'Reason for cancelling this booking (optional):',
      'Changed plans'
    )
    if (reason === null) return

    try {
      setCancelling(true)
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Cancelled by customer' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to cancel booking')
        return
      }
      setBooking(data.booking)
      toast.success('Booking cancelled successfully')
    } catch (err) {
      toast.error('Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#F4F1E8]">{error || 'Booking Not Found'}</h2>
        <p className="text-sm text-[#929B95]">
          You may not have permission to view this booking or it does not exist.
        </p>
        <Link href="/bookings" className="inline-block">
          <Button variant="outline" className="border-white/20 text-[#F4F1E8]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Bookings
          </Button>
        </Link>
      </div>
    )
  }

  const canCancel = ['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/bookings">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#929B95] hover:text-[#F4F1E8]"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-space-grotesk text-[#F4F1E8]">
                Booking #{booking.bookingRef.slice(-8).toUpperCase()}
              </h1>
              <Badge className={STATUS_STYLES[booking.status] || ''}>
                {booking.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-[#929B95] mt-0.5">
              Booked on {new Date(booking.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Receipt
          </Button>
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              disabled={cancelling}
              onClick={handleCancel}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {cancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Cancel Booking
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#B6F36B]" />
              Reservation Summary
            </h2>

            <div className="space-y-3 text-sm pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <span className="text-[#929B95]">Table</span>
                <span className="font-semibold text-[#F4F1E8]">
                  {booking.table?.name} (#{booking.table?.tableNumber} • {booking.table?.type})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#929B95]">Date</span>
                <span className="font-medium text-[#F4F1E8]">
                  {new Date(booking.bookingDate).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#929B95]">Time Slot</span>
                <span className="font-medium text-[#F4F1E8]">
                  {booking.startTime} – {booking.endTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#929B95]">Duration</span>
                <span className="font-medium text-[#F4F1E8]">
                  {Number(booking.durationHours)} Hour(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#929B95]">Customer Name</span>
                <span className="font-medium text-[#F4F1E8]">{booking.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#929B95]">Phone</span>
                <span className="font-medium text-[#F4F1E8]">{booking.phone}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/10">
                <span className="text-[#929B95] font-medium">Total Amount</span>
                <span className="text-xl font-bold text-[#B6F36B]">
                  ₹{Number(booking.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#B6F36B]" />
              Payment Details
            </h2>

            {booking.payments && booking.payments.length > 0 ? (
              <div className="space-y-4 pt-2 border-t border-white/10">
                {booking.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-[#080A0A] border border-white/10 space-y-2 text-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#F4F1E8]">
                        ₹{Number(p.amount).toFixed(2)}
                      </span>
                      <Badge
                        className={
                          p.status === 'PAID'
                            ? 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                    {p.razorpayPaymentId && (
                      <div className="flex justify-between text-xs text-[#929B95]">
                        <span>Payment ID</span>
                        <span className="font-mono text-[#F4F1E8]">{p.razorpayPaymentId}</span>
                      </div>
                    )}
                    {p.razorpayOrderId && (
                      <div className="flex justify-between text-xs text-[#929B95]">
                        <span>Order ID</span>
                        <span className="font-mono text-[#F4F1E8]">{p.razorpayOrderId}</span>
                      </div>
                    )}
                    {p.paidAt && (
                      <div className="flex justify-between text-xs text-[#929B95]">
                        <span>Paid At</span>
                        <span>{new Date(p.paidAt).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#929B95] pt-2 border-t border-white/10">
                No completed payment records found for this booking.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status History Timeline */}
      {booking.statusHistory && booking.statusHistory.length > 0 && (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold font-space-grotesk text-[#F4F1E8] flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-[#B6F36B]" />
              Status History
            </h2>

            <div className="space-y-3">
              {booking.statusHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[#080A0A] border border-white/5 text-sm"
                >
                  <div>
                    <p className="font-medium text-[#F4F1E8]">
                      {h.oldStatus === h.newStatus
                        ? h.newStatus.replace('_', ' ')
                        : `${h.oldStatus.replace('_', ' ')} → ${h.newStatus.replace('_', ' ')}`}
                    </p>
                    {h.reason && (
                      <p className="text-xs text-[#929B95] mt-0.5">{h.reason}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#929B95] whitespace-nowrap">
                    {new Date(h.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

