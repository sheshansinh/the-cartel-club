"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  PlusCircle,
  Loader2,
  XCircle,
  ArrowRight,
  CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
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

const FILTER_TABS = [
  { id: 'ALL', label: 'All Bookings' },
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled / Expired' },
]

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [cancellingId, setCancellingId] = useState(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/bookings?limit=50')
      if (res.ok) {
        const data = await res.json()
        setBookings(data.bookings || [])
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleCancelBooking = async (bookingId) => {
    const reason = window.prompt(
      'Please enter a reason for cancelling this reservation (optional):',
      'Changed plans'
    )
    if (reason === null) return

    try {
      setCancellingId(bookingId)
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Cancelled by customer' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not cancel booking')
        return
      }
      toast.success('Booking cancelled')
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? data.booking : b))
      )
    } catch (err) {
      console.error('Cancel booking error:', err)
      toast.error('Failed to cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true
    if (activeTab === 'UPCOMING') {
      return ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(
        b.status
      )
    }
    if (activeTab === 'COMPLETED') return b.status === 'COMPLETED'
    if (activeTab === 'CANCELLED') {
      return ['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(b.status)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            My Bookings
          </h1>
          <p className="text-sm text-[#929B95] mt-1">
            View and manage all your table reservations at The Cartel Club.
          </p>
        </div>

        <Button
          onClick={() => setIsBookingModalOpen(true)}
          className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#B6F36B] text-[#080A0A]'
                : 'bg-[#111615] text-[#929B95] hover:text-[#F4F1E8] border border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-12 text-center space-y-4">
            <Calendar className="w-10 h-10 text-[#929B95] mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-[#F4F1E8]">
                No bookings found
              </h3>
              <p className="text-sm text-[#929B95] mt-1">
                Ready for a game? Reserve your preferred pool or snooker table now.
              </p>
            </div>
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
            >
              Book a Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const canCancel = ['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status)
            return (
              <Card
                key={b.id}
                className="bg-[#111615] border-white/10 hover:border-white/20 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 text-[#929B95]">
                          #{b.bookingRef.slice(-8).toUpperCase()}
                        </span>
                        <h3 className="text-lg font-bold text-[#F4F1E8]">
                          {b.table?.name || 'Table'} ({b.table?.type})
                        </h3>
                        <Badge className={STATUS_STYLES[b.status] || ''}>
                          {b.status.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-white/15 text-[#929B95] text-xs"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          {b.paymentStatus}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-sm text-[#929B95]">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#B6F36B]" />
                          {new Date(b.bookingDate).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#B6F36B]" />
                          {b.startTime} – {b.endTime} ({Number(b.durationHours)}h)
                        </span>
                        <span className="font-semibold text-[#F4F1E8]">
                          Total: <strong className="text-[#B6F36B]">₹{Number(b.totalAmount).toFixed(0)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cancellingId === b.id}
                          onClick={() => handleCancelBooking(b.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          {cancellingId === b.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1.5" />
                              Cancel
                            </>
                          )}
                        </Button>
                      )}
                      <Link href={`/bookings/${b.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
                        >
                          View Details
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false)
          fetchBookings()
        }}
      />
    </div>
  )
}

