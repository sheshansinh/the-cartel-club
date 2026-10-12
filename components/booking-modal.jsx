"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession, signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Loader2,
  ShieldCheck,
  Sparkles,
  Gift,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'

export default function BookingModal({ isOpen, onClose, initialTable = null }) {
  const { data: session, status: authStatus } = useSession()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [tables, setTables] = useState([])
  const [loyaltyProfile, setLoyaltyProfile] = useState(null)
  const [loyaltyRules, setLoyaltyRules] = useState([])
  const [claimGiftReward, setClaimGiftReward] = useState(true)
  const [settings, setSettings] = useState({
    fullPaymentOnly: true,
    advanceAmount: 100,
    bookingHoldMins: 15,
    maxBookingDays: 30,
  })
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [loginEmail, setLoginEmail] = useState('sheshan@gmail.com')
  const [loginPassword, setLoginPassword] = useState('Sheshan@2004')
  const [loginLoading, setLoginLoading] = useState(false)
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    duration: '1 Hour',
    table: null,
    name: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatDurationOption = (hours) => {
    const h = Number(hours)
    return h === 1 ? '1 Hour' : `${h} Hours`
  }

  const parseHours = (durStr) => {
    const m = String(durStr || '1').match(/^(\d+(?:\.\d+)?)/)
    return m ? parseFloat(m[1]) : 1
  }

  const getTablePackagePrice = (table, hours) => {
    if (!table) return 0
    const h = Number(hours) > 0 ? Number(hours) : 1
    const tiers = Array.isArray(table.pricingTiers) ? table.pricingTiers : []
    const exact = tiers.find((t) => Math.abs(Number(t.durationHours) - h) < 0.001)
    if (exact) return Number(exact.price)
    return Number((Number(table.hourlyRate || 200) * h).toFixed(2))
  }

  // Build available duration options from selected table or union of all tables' pricingTiers
  const availableDurationHours = (() => {
    if (
      bookingData.table &&
      Array.isArray(bookingData.table.pricingTiers) &&
      bookingData.table.pricingTiers.length > 0
    ) {
      return bookingData.table.pricingTiers.map((t) => Number(t.durationHours))
    }
    const set = new Set()
    tables.forEach((t) => {
      if (Array.isArray(t.pricingTiers)) {
        t.pricingTiers.forEach((tier) => set.add(Number(tier.durationHours)))
      }
    })
    if (set.size === 0) return [0.5, 1, 1.5, 2, 3]
    return Array.from(set).sort((a, b) => a - b)
  })()

  const durations = availableDurationHours.map(formatDurationOption)

  const timeSlots = [
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
    '7:00 PM',
    '8:00 PM',
    '9:00 PM',
    '10:00 PM',
  ]

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + (settings.maxBookingDays || 30))
    return maxDate.toISOString().split('T')[0]
  }

  // Reset & prefill form when modal opens or session updates
  useEffect(() => {
    if (isOpen) {
      setBookingData((prev) => ({
        date: prev.date || getTodayDate(),
        time: prev.time || '',
        duration: prev.duration || '1 Hour',
        table: initialTable || null,
        name: session?.user?.name || prev.name || '',
        phone: session?.user?.phone || prev.phone || '',
        email: session?.user?.email || prev.email || '',
      }))
      setClaimGiftReward(true)
      setPolicyAccepted(false)
    }
  }, [isOpen, session, initialTable])

  // Fetch Loyalty & Rewards profile whenever modal opens or phone/name/email changes
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (bookingData.phone) params.set('phone', bookingData.phone)
        if (bookingData.email) params.set('email', bookingData.email)
        if (bookingData.name) params.set('name', bookingData.name)
        const res = await fetch(`/api/rewards?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setLoyaltyProfile(data.profile || null)
          setLoyaltyRules(data.rules || [])
          if (data.profile?.phone && !bookingData.phone) {
            setBookingData((prev) => ({
              ...prev,
              phone: prev.phone || data.profile.phone,
            }))
          }
        }
      } catch (err) {
        console.error('Error fetching loyalty rewards:', err)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [isOpen, session, bookingData.phone, bookingData.email, bookingData.name])

  // Fetch tables whenever date, time, or duration changes
  useEffect(() => {
    const fetchTables = async () => {
      if (!isOpen) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (bookingData.date) params.set('date', bookingData.date)
        if (bookingData.time) params.set('time', bookingData.time)
        if (bookingData.duration) {
          params.set('durationHours', String(parseHours(bookingData.duration)))
        }

        const response = await fetch(`/api/tables?${params.toString()}`)
        const data = await response.json()
        const fetchedTables = data.tables || []
        setTables(fetchedTables)
        if (data.settings) setSettings(data.settings)

        // Clear selected table if it became unavailable for the new slot
        if (bookingData.table) {
          const updatedSelected = fetchedTables.find((t) => t.id === bookingData.table.id)
          if (!updatedSelected || !updatedSelected.isAvailable) {
            setBookingData((prev) => ({ ...prev, table: null }))
          } else {
            setBookingData((prev) => ({ ...prev, table: updatedSelected }))
          }
        }
      } catch (error) {
        console.error('Error fetching tables:', error)
        toast.error('Failed to load table availability')
      } finally {
        setLoading(false)
      }
    }

    fetchTables()
  }, [isOpen, bookingData.date, bookingData.time, bookingData.duration])

  const durationHours = parseHours(bookingData.duration)
  const selectedRate = bookingData.table ? Number(bookingData.table.hourlyRate) : 0
  const baseTotalAmount = bookingData.table
    ? getTablePackagePrice(bookingData.table, durationHours)
    : 0
  const effectivePerHourRate =
    durationHours > 0 ? baseTotalAmount / durationHours : selectedRate
  const availableGiftHours = Number(loyaltyProfile?.rewardBalance || 0)
  const redeemableGiftHours =
    claimGiftReward && availableGiftHours > 0
      ? Math.min(availableGiftHours, durationHours)
      : 0
  const giftDiscountAmount = Number(
    (redeemableGiftHours * effectivePerHourRate).toFixed(2)
  )
  const totalAmount = Math.max(
    0,
    Number((baseTotalAmount - giftDiscountAmount).toFixed(2))
  )
  const payableAmount = settings.fullPaymentOnly
    ? totalAmount
    : Math.min(totalAmount, Number(settings.advanceAmount || 100))

  const getStatusColor = (table) => {
    if (!table.isAvailable) {
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    switch (table.status) {
      case 'AVAILABLE':
        return 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30'
      case 'MAINTENANCE':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'INACTIVE':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default:
        return 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30'
    }
  }

  const getStatusLabel = (table) => {
    if (!table.isAvailable) return 'Booked'
    return table.status
  }

  const validateForm = () => {
    if (!bookingData.date) {
      toast.error('Please select a date')
      return false
    }
    if (!bookingData.time) {
      toast.error('Please select a time slot')
      return false
    }
    if (!bookingData.duration) {
      toast.error('Please select duration')
      return false
    }
    if (!bookingData.table) {
      toast.error('Please select an available table')
      return false
    }
    if (!bookingData.name || bookingData.name.trim().length < 2) {
      toast.error('Please enter a valid name')
      return false
    }
    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(bookingData.phone)) {
      toast.error('Please enter a valid 10-digit phone number')
      return false
    }
    if (!policyAccepted) {
      toast.error('Please accept the booking & cancellation policy to proceed')
      return false
    }
    return true
  }

  const handlePayment = async () => {
    if (!validateForm()) return

    try {
      setPaymentLoading(true)

      // 1. Create booking (or instant ₹0 Free Gift Reward confirmation) on server
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: bookingData.table.id,
          bookingDate: bookingData.date,
          startTime: bookingData.time,
          duration: bookingData.duration,
          durationHours,
          customerName: bookingData.name,
          phone: bookingData.phone,
          email: bookingData.email,
          redeemRewardHours: redeemableGiftHours,
        }),
      })

      const bookingResData = await bookingResponse.json()
      if (!bookingResponse.ok) {
        throw new Error(bookingResData.error || 'Failed to hold table')
      }

      const bookingId = bookingResData.booking.id

      // If 100% covered by Loyalty Gift Reward (₹0 to pay), confirm immediately without Razorpay!
      if (
        bookingResData.isFreeRewardBooking ||
        Number(bookingResData.pricing?.totalAmount ?? totalAmount) === 0
      ) {
        toast.success(
          `🎁 Free Loyalty Gift Reward Redeemed! Table booked for ₹0!`
        )
        window.location.href = `/payment/success?bookingId=${bookingId}&amount=0&date=${bookingData.date}&time=${encodeURIComponent(
          bookingData.time
        )}&duration=${encodeURIComponent(
          bookingData.duration
        )}&table=${encodeURIComponent(
          bookingData.table?.name || bookingData.table?.tableNumber
        )}`
        return
      }

      // 2. Create Razorpay order (price computed strictly server-side)
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })

      const orderData = await orderResponse.json()
      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      // 3. Load Razorpay checkout script
      const openCheckout = () => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'The Cartel Club',
          description: `${bookingData.table.name} (${bookingData.duration})`,
          order_id: orderData.orderId,
          handler: async function (response) {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId,
              }),
            })

            if (verifyResponse.ok) {
              toast.success('Booking confirmed successfully!')
              window.location.href = `/payment/success?bookingId=${bookingId}&amount=${orderData.amountRupees}&date=${bookingData.date}&time=${encodeURIComponent(
                bookingData.time
              )}&duration=${encodeURIComponent(bookingData.duration)}&table=${encodeURIComponent(
                bookingData.table?.name || bookingData.table?.tableNumber
              )}`
            } else {
              toast.error('Payment verification failed')
              window.location.href = '/payment/failed?error=Payment+verification+failed'
            }
            setPaymentLoading(false)
          },
          prefill: {
            name: bookingData.name,
            email: bookingData.email,
            contact: bookingData.phone,
          },
          theme: {
            color: '#B6F36B',
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
        rzp.on('payment.failed', function () {
          toast.error('Payment failed. Please try again.')
          setPaymentLoading(false)
          window.location.href = '/payment/failed?error=Payment+failed'
        })
      }

      if (window.Razorpay) {
        openCheckout()
      } else {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.onload = openCheckout
        document.body.appendChild(script)
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Failed to process booking')
      setPaymentLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="bg-[#080A0A] border border-white/10 shadow-2xl">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold font-space-grotesk text-[#F4F1E8]">
                    Book Your Table
                  </h2>
                  <p className="text-xs text-[#929B95] mt-0.5">
                    Instant online reservation • {settings.bookingHoldMins || 15}-minute payment hold
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-[#929B95] hover:text-[#F4F1E8] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Auth Gate: Prompt Email/Password or Google Sign-In if not authenticated */}
              {authStatus === 'loading' ? (
                <div className="py-16 flex justify-center">
                  <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
                </div>
              ) : !session?.user ? (
                <div className="py-6 px-4 max-w-md mx-auto space-y-5">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-[#B6F36B]/15 border border-[#B6F36B]/30 flex items-center justify-center mx-auto">
                      <Sparkles className="w-7 h-7 text-[#B6F36B]" />
                    </div>
                    <h3 className="text-xl font-bold font-space-grotesk text-[#F4F1E8]">
                      Sign in to Reserve Your Table
                    </h3>
                    <p className="text-xs text-[#929B95]">
                      Sign in with your email &amp; password or Google to book tables and claim free loyalty hours.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      setLoginLoading(true)
                      const res = await signIn('credentials', {
                        email: loginEmail.trim().toLowerCase(),
                        password: loginPassword,
                        redirect: false,
                      })
                      setLoginLoading(false)
                      if (res?.error) {
                        toast.error('Invalid email or password')
                      } else {
                        toast.success('Signed in successfully!')
                      }
                    }}
                    className="space-y-3 text-left bg-[#111615] p-4 rounded-xl border border-white/10"
                  >
                    <div>
                      <label className="text-xs text-[#929B95] block mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                        placeholder="sheshan@gmail.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#929B95] block mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full h-10 rounded-md border border-white/15 bg-[#080A0A] px-3 text-sm text-[#F4F1E8]"
                        placeholder="Sheshan@2004"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#929B95] pt-0.5">
                      <span>
                        Demo: <strong className="text-[#F4F1E8]">sheshan@gmail.com</strong> /{' '}
                        <strong className="text-[#B6F36B]">Sheshan@2004</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail('sheshan@gmail.com')
                          setLoginPassword('Sheshan@2004')
                        }}
                        className="text-[#B6F36B] font-semibold hover:underline"
                      >
                        Fill
                      </button>
                    </div>
                    <Button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold h-10"
                    >
                      {loginLoading ? 'Signing in...' : 'Sign In with Email'}
                    </Button>
                  </form>

                  <div className="text-center">
                    <Button
                      type="button"
                      onClick={() => signIn('google', { callbackUrl: '/book' })}
                      className="w-full bg-[#F4F1E8] text-[#080A0A] hover:bg-white font-semibold h-10 text-sm"
                    >
                      Continue with Google
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {/* Date & Time Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#929B95] mb-2">
                          <Calendar className="inline w-4 h-4 mr-2" />
                          Select Date *
                        </label>
                        <input
                          type="date"
                          value={bookingData.date}
                          onChange={(e) =>
                            setBookingData({ ...bookingData, date: e.target.value })
                          }
                          min={getTodayDate()}
                          max={getMaxDate()}
                          className="w-full h-10 rounded-md border border-input bg-[#080A0A] px-3 py-2 text-sm text-[#F4F1E8]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#929B95] mb-2">
                          <Clock className="inline w-4 h-4 mr-2" />
                          Time Slot *
                        </label>
                        <select
                          value={bookingData.time}
                          onChange={(e) =>
                            setBookingData({ ...bookingData, time: e.target.value })
                          }
                          className="w-full h-10 rounded-md border border-input bg-[#080A0A] px-3 py-2 text-sm text-[#F4F1E8]"
                          required
                        >
                          <option value="">Select time</option>
                          {timeSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-[#929B95] mb-2">
                        Duration *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {durations.map((duration) => {
                          const h = parseHours(duration)
                          const tierPrice = bookingData.table
                            ? getTablePackagePrice(bookingData.table, h)
                            : null
                          return (
                            <button
                              key={duration}
                              type="button"
                              onClick={() =>
                                setBookingData({ ...bookingData, duration })
                              }
                              className={`p-2.5 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center ${
                                bookingData.duration === duration
                                  ? 'border-[#B6F36B] bg-[#B6F36B]/20 text-[#B6F36B]'
                                  : 'border-white/10 bg-[#080A0A] text-[#929B95] hover:border-white/20'
                              }`}
                            >
                              <span>{duration}</span>
                              {tierPrice !== null && (
                                <span className="text-[11px] font-bold text-[#F4F1E8] mt-0.5">
                                  ₹{tierPrice}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Table Selection */}
                    <div>
                      <label className="block text-sm font-medium text-[#929B95] mb-2">
                        Select Table *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {loading ? (
                          <div className="col-span-3 flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-[#B6F36B] animate-spin" />
                          </div>
                        ) : (
                          tables.map((table) => {
                            const pkgPrice = getTablePackagePrice(
                              table,
                              durationHours
                            )
                            return (
                              <Card
                                key={table.id}
                                className={`bg-[#080A0A] border-white/10 cursor-pointer transition-all hover:border-[#B6F36B]/50 ${
                                  bookingData.table?.id === table.id
                                    ? 'border-[#B6F36B] ring-1 ring-[#B6F36B]'
                                    : ''
                                } ${
                                  !table.isAvailable
                                    ? 'opacity-50 cursor-not-allowed'
                                    : ''
                                }`}
                                onClick={() =>
                                  table.isAvailable &&
                                  setBookingData({ ...bookingData, table })
                                }
                              >
                                <CardContent className="p-3.5">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-semibold text-[#F4F1E8] text-sm">
                                        {table.name}
                                      </h3>
                                      <p className="text-xs text-[#929B95]">
                                        {table.type}
                                      </p>
                                      <p className="text-xs text-[#B6F36B] mt-1 font-medium">
                                        ₹{pkgPrice} for {durationHours}h{' '}
                                        <span className="text-[10px] text-[#929B95]">
                                          (₹{Number(table.hourlyRate)}/hr)
                                        </span>
                                      </p>
                                    </div>
                                    <Badge className={getStatusColor(table)}>
                                      {getStatusLabel(table)}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })
                        )}
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#929B95] mb-2">
                          <User className="inline w-4 h-4 mr-2" />
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={bookingData.name}
                          onChange={(e) =>
                            setBookingData({ ...bookingData, name: e.target.value })
                          }
                          className="w-full h-10 rounded-md border border-input bg-[#080A0A] px-3 py-2 text-sm text-[#F4F1E8]"
                          placeholder="Enter your name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#929B95] mb-2">
                          <Phone className="inline w-4 h-4 mr-2" />
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={bookingData.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            setBookingData({ ...bookingData, phone: value })
                          }}
                          maxLength={10}
                          className="w-full h-10 rounded-md border border-input bg-[#080A0A] px-3 py-2 text-sm text-[#F4F1E8]"
                          placeholder="10-digit mobile number"
                          required
                        />
                      </div>
                    </div>

                    {/* ── UNIQUE LOYALTY GIFT REWARD VOUCHER / PROGRESS ── */}
                    {availableGiftHours > 0 ? (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#B6F36B]/20 via-[#D6B36A]/15 to-[#111615] border-2 border-[#B6F36B] shadow-lg shadow-[#B6F36B]/10 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-[#B6F36B] text-[#080A0A] flex items-center justify-center font-bold shadow">
                              <Gift className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-[#B6F36B] tracking-wide">
                                  🎁 VIP LOYALTY GIFT REWARD UNLOCKED!
                                </span>
                                {loyaltyProfile?.giftVoucherCode && (
                                  <span className="px-2 py-0.5 rounded bg-[#080A0A] border border-[#B6F36B]/40 font-mono text-[10px] font-bold text-[#B6F36B]">
                                    {loyaltyProfile.giftVoucherCode}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#F4F1E8] mt-0.5">
                                You played{' '}
                                <strong>
                                  {loyaltyProfile?.totalPlayingHours || 0} hours
                                </strong>{' '}
                                &amp; hit our milestone limit! You have{' '}
                                <strong className="text-[#B6F36B]">
                                  {availableGiftHours} Free Hour(s)
                                </strong>{' '}
                                ready to claim.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setClaimGiftReward(!claimGiftReward)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                              claimGiftReward
                                ? 'bg-[#B6F36B] text-[#080A0A] shadow-md'
                                : 'bg-[#080A0A] text-[#F4F1E8] border border-white/20 hover:border-[#B6F36B]'
                            }`}
                          >
                            {claimGiftReward
                              ? `✓ Gift Applied (-${
                                  redeemableGiftHours || availableGiftHours
                                }h FREE)`
                              : '🎁 Click to Claim Free Hour'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      loyaltyProfile && (
                        <div className="p-3 rounded-xl bg-[#111615] border border-white/10 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-[#929B95]">
                            <Trophy className="w-4 h-4 text-[#D6B36A]" />
                            <span>
                              Loyalty Progress:{' '}
                              <strong className="text-[#F4F1E8]">
                                {loyaltyProfile.totalPlayingHours}h /{' '}
                                {loyaltyProfile.nextMilestone?.hoursRequired ||
                                  5}
                                h
                              </strong>{' '}
                              played
                            </span>
                          </div>
                          <span className="text-[#B6F36B] font-medium">
                            Play{' '}
                            {loyaltyProfile.nextMilestone?.hoursRemaining || 5}h
                            more → Get +
                            {loyaltyProfile.nextMilestone?.bonusHours || 1}h
                            FREE Gift!
                          </span>
                        </div>
                      )
                    )}

                    {/* Price Summary & Policy Acceptance */}
                    {bookingData.table && (
                      <div className="p-4 rounded-xl bg-[#111615] border border-white/10 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#929B95]">
                            {bookingData.table.name} × {durationHours} hr(s) @ ₹{selectedRate}/hr
                          </span>
                          <span
                            className={
                              redeemableGiftHours > 0
                                ? 'text-[#929B95] line-through'
                                : 'text-[#F4F1E8] font-medium'
                            }
                          >
                            ₹{baseTotalAmount.toFixed(0)}
                          </span>
                        </div>

                        {redeemableGiftHours > 0 && (
                          <div className="flex justify-between text-sm text-[#B6F36B] font-semibold">
                            <span>
                              🎁 Loyalty Gift Reward ({redeemableGiftHours} hr Free)
                            </span>
                            <span>-₹{giftDiscountAmount.toFixed(0)}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                          <span className="text-sm font-medium text-[#F4F1E8]">
                            {payableAmount === 0
                              ? 'Total Payable Now (100% Free Gift Reward)'
                              : settings.fullPaymentOnly
                              ? 'Total Payable Now'
                              : 'Advance Payable Now'}
                          </span>
                          <span className="text-xl font-bold text-[#B6F36B]">
                            ₹{payableAmount.toFixed(0)}
                            {payableAmount === 0 && ' (FREE)'}
                          </span>
                        </div>
                      </div>
                    )}

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#929B95]">
                      <input
                        type="checkbox"
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-white/20 bg-[#080A0A] text-[#B6F36B]"
                      />
                      <span>
                        I agree to The Cartel Club booking policy. Please arrive 10 minutes prior to your reserved slot. Selected slots are held for {settings.bookingHoldMins || 15} minutes pending payment.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-6">
                    <Button
                      onClick={handlePayment}
                      disabled={paymentLoading || !bookingData.table}
                      className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 py-6 text-lg font-semibold disabled:opacity-50"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing Reservation...
                        </>
                      ) : bookingData.table ? (
                        payableAmount === 0 && redeemableGiftHours > 0 ? (
                          `🎁 Claim Free Gift & Book Table (₹0 to Pay)`
                        ) : (
                          `Confirm & Pay ₹${payableAmount.toFixed(0)}`
                        )
                      ) : (
                        'Select a Table to Continue'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
