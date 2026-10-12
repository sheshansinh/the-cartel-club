"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Calendar, Clock, Printer, LayoutDashboard, Home } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSuccess() {
  const searchParams = useSearchParams()
  const [bookingDetails, setBookingDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bookingId = searchParams.get('bookingId')
    const fallbackData = {
      bookingId,
      bookingRef: bookingId ? bookingId.slice(-8).toUpperCase() : '',
      amount: searchParams.get('amount'),
      date: searchParams.get('date'),
      time: searchParams.get('time'),
      duration: searchParams.get('duration'),
      table: searchParams.get('table'),
    }

    async function loadBooking() {
      if (!bookingId) {
        setBookingDetails(fallbackData)
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/bookings/${bookingId}`)
        if (res.ok) {
          const { booking } = await res.json()
          setBookingDetails({
            bookingId: booking.id,
            bookingRef: booking.bookingRef.slice(-8).toUpperCase(),
            amount: Number(booking.totalAmount).toFixed(0),
            date: new Date(booking.bookingDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            time: `${booking.startTime} – ${booking.endTime}`,
            duration: `${Number(booking.durationHours)} Hour(s)`,
            table: `${booking.table?.name || 'Table'} (#${booking.table?.tableNumber || ''})`,
          })
        } else {
          setBookingDetails(fallbackData)
        }
      } catch {
        setBookingDetails(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    loadBooking()
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080A0A] flex items-center justify-center">
        <div className="text-[#B6F36B]">Loading confirmation...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080A0A] flex items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-[#111615] border border-[#B6F36B]/30 shadow-2xl">
          <CardContent className="p-8">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-[#B6F36B]/20 flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-[#B6F36B]" />
              </div>
            </motion.div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8] mb-2">
                Booking Confirmed!
              </h1>
              <p className="text-[#929B95]">
                Your payment was verified and your table is reserved.
              </p>
            </div>

            {/* Booking Details */}
            <div className="bg-[#080A0A] rounded-lg p-6 mb-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-[#929B95]">Booking Reference</span>
                <span className="text-[#F4F1E8] font-mono">
                  #{bookingDetails?.bookingRef || bookingDetails?.bookingId}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#929B95] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </span>
                <span className="text-[#F4F1E8]">{bookingDetails?.date}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#929B95] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Slot
                </span>
                <span className="text-[#F4F1E8]">{bookingDetails?.time}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#929B95]">Duration</span>
                <span className="text-[#F4F1E8]">{bookingDetails?.duration}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#929B95]">Table</span>
                <span className="text-[#F4F1E8]">{bookingDetails?.table}</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-[#929B95]">Amount Paid</span>
                <span className="text-[#B6F36B] font-bold text-xl">
                  ₹{bookingDetails?.amount}
                </span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-[#D6B36A]/10 border border-[#D6B36A]/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-[#929B95]">
                <span className="text-[#D6B36A] font-semibold">Important:</span> Please arrive 10 minutes before your booking time. You can view or manage your reservation anytime in your Member Portal.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={
                  bookingDetails?.bookingId
                    ? `/bookings/${bookingDetails.bookingId}`
                    : '/dashboard'
                }
                className="flex-1"
              >
                <Button className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  View in Member Portal
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 border-[#B6F36B]/50 text-[#F4F1E8] hover:bg-[#B6F36B]/10"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
              <Link href="/">
                <Button
                  variant="ghost"
                  className="w-full text-[#929B95] hover:text-[#F4F1E8]"
                >
                  <Home className="w-4 h-4 mr-1.5" />
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
