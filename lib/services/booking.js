/**
 * Booking Engine Service Layer (Module C)
 *
 * Enforces:
 * - Server-side price calculation (table.hourlyRate * durationHours)
 * - Advance vs Full payment driven by BusinessSettings
 * - Minute-based time overlap arithmetic in JS (plus TableBlockout checks)
 * - Booking holds with automatic expiry (default 15 mins from BusinessSettings)
 * - Status transitions recorded in BookingStatusHistory
 */

import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'
import { checkAndIssueRewards, redeemCustomerRewards } from '@/lib/services/loyalty'
import {
  getTablePriceForDuration,
  parseTablePricing,
} from '@/lib/services/table-pricing'

export const ACTIVE_BOOKING_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
]

/**
 * Convert "6:00 PM" or "18:00" to "18:00" (24-hour HH:MM)
 */
export function to24Hour(timeStr) {
  if (!timeStr) return '12:00'
  const trimmed = String(timeStr).trim()
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{1}:\d{2}$/.test(trimmed)) return `0${trimmed}`

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return '12:00'

  let hours = parseInt(match[1], 10)
  const mins = match[2]
  const period = match[3].toUpperCase()

  if (period === 'AM' && hours === 12) hours = 0
  if (period === 'PM' && hours !== 12) hours += 12

  return `${String(hours).padStart(2, '0')}:${mins}`
}

/**
 * Convert "HH:MM" to minutes since midnight (0 - 1439)
 */
export function timeToMinutes(hhMM) {
  const normalized = to24Hour(hhMM)
  const [h, m] = normalized.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Convert minutes since midnight to "HH:MM"
 */
export function minutesToTime(totalMins) {
  const clamped = ((totalMins % 1440) + 1440) % 1440
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Add decimal hours to "HH:MM" -> "HH:MM"
 */
export function addHoursToTime(hhMM, durationHours) {
  const startMins = timeToMinutes(hhMM)
  const endMins = startMins + Math.round(Number(durationHours) * 60)
  return minutesToTime(endMins)
}

/**
 * Parse "1 Hour", "2 Hours", "1.5", or number -> decimal hours
 */
export function parseDurationHours(duration) {
  if (typeof duration === 'number' && duration > 0) return duration
  if (!duration) return null
  const match = String(duration).match(/^(\d+(?:\.\d+)?)/)
  if (!match) return null
  const h = parseFloat(match[1])
  return h > 0 && h <= 12 ? h : null
}

/**
 * Normalize a date string (YYYY-MM-DD) or Date to UTC midnight Date object
 */
export function normalizeBookingDate(dateInput) {
  if (!dateInput) return null
  const str = typeof dateInput === 'string' ? dateInput.split('T')[0] : dateInput.toISOString().split('T')[0]
  const [year, month, day] = str.split('-').map(Number)
  if (!year || !month || !day) {
    const d = new Date(dateInput)
    d.setHours(0, 0, 0, 0)
    return d
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

/**
 * Get date range [startOfDay, endOfDay] to match bookingDate regardless of local/UTC midnight offset
 */
export function getDayBounds(dateInput) {
  const str = typeof dateInput === 'string' ? dateInput.split('T')[0] : new Date(dateInput).toISOString().split('T')[0]
  const start = new Date(`${str}T00:00:00.000Z`)
  // Allow -6h to +18h window around UTC midnight to catch local midnight dates stored previously
  const rangeStart = new Date(start.getTime() - 6 * 60 * 60 * 1000)
  const rangeEnd = new Date(start.getTime() + 18 * 60 * 60 * 1000)
  return { normalized: start, rangeStart, rangeEnd }
}

/**
 * Fetch BusinessSettings (or return sensible defaults if none seeded yet)
 */
export async function getBusinessSettings() {
  const settings = await prisma.businessSettings.findFirst()
  return {
    businessName:
      settings?.businessName && settings.businessName !== 'CUE CLUB'
        ? settings.businessName
        : 'The Cartel Club',
    timezone: settings?.timezone ?? 'Asia/Kolkata',
    openingTime: settings?.openingTime ?? '12:00',
    closingTime: settings?.closingTime ?? '23:00',
    advanceAmount: settings?.advanceAmount ? Number(settings.advanceAmount) : 100,
    fullPaymentOnly: settings?.fullPaymentOnly ?? true,
    bookingHoldMins: settings?.bookingHoldMins ?? 15,
    maxBookingDays: settings?.maxBookingDays ?? 30,
    currency: settings?.currency ?? 'INR',
    taxRate: settings?.taxRate ? Number(settings.taxRate) : 0,
  }
}

/**
 * Expire all PENDING_PAYMENT bookings whose holdExpiresAt < now.
 * Records BookingStatusHistory for each expired hold.
 */
export async function expireOldHolds() {
  const now = new Date()
  try {
    const staleHolds = await prisma.booking.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        holdExpiresAt: { lt: now },
      },
      select: { id: true, status: true },
    })

    if (staleHolds.length === 0) return { expiredCount: 0 }

    const ids = staleHolds.map((b) => b.id)

    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { id: { in: ids }, status: 'PENDING_PAYMENT' },
        data: { status: 'EXPIRED' },
      }),
      prisma.bookingStatusHistory.createMany({
        data: staleHolds.map((b) => ({
          bookingId: b.id,
          oldStatus: b.status,
          newStatus: 'EXPIRED',
          reason: 'Booking payment hold expired automatically',
        })),
      }),
    ])

    return { expiredCount: staleHolds.length }
  } catch (err) {
    console.error('[booking.expireOldHolds] error:', err?.message)
    return { expiredCount: 0 }
  }
}

/**
 * Check if two time intervals [startA, endA) and [startB, endB) overlap in minutes.
 * Handles intervals that might wrap past midnight.
 */
export function intervalsOverlap(startTimeA, endTimeA, startTimeB, endTimeB) {
  const sA = timeToMinutes(startTimeA)
  let eA = timeToMinutes(endTimeA)
  if (eA <= sA) eA += 1440

  const sB = timeToMinutes(startTimeB)
  let eB = timeToMinutes(endTimeB)
  if (eB <= sB) eB += 1440

  // Overlap condition: existingStart < requestedEnd AND existingEnd > requestedStart
  return sA < eB && eA > sB
}

/**
 * Check whether a specific table is available for (bookingDate, startTime, durationHours).
 * Optionally exclude a specific bookingId (when renewing an existing hold).
 */
export async function checkTableAvailability({
  tableId,
  bookingDate,
  startTime,
  durationHours,
  excludeBookingId = null,
}) {
  await expireOldHolds()

  const startHHMM = to24Hour(startTime)
  const endHHMM = addHoursToTime(startHHMM, durationHours)
  const { rangeStart, rangeEnd } = getDayBounds(bookingDate)

  const existingBookings = await prisma.booking.findMany({
    where: {
      tableId,
      bookingDate: { gte: rangeStart, lte: rangeEnd },
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  })

  const conflictingBooking = existingBookings.find((b) =>
    intervalsOverlap(b.startTime, b.endTime, startHHMM, endHHMM)
  )

  if (conflictingBooking) {
    return {
      available: false,
      reason: 'Table is already reserved or held for this time slot',
      conflictingBookingId: conflictingBooking.id,
    }
  }

  // Also check if an active walk-in/live GamingSession on this table overlaps the requested time today
  const now = new Date()
  if (now >= rangeStart && now <= rangeEnd) {
    const activeSession = await prisma.gamingSession.findFirst({
      where: {
        tableId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      select: {
        id: true,
        startTime: true,
        expectedEndTime: true,
        actualDuration: true,
      },
    })

    if (activeSession) {
      const sStart = new Date(activeSession.startTime)
      const sEnd = activeSession.expectedEndTime
        ? new Date(activeSession.expectedEndTime)
        : new Date(
            sStart.getTime() +
              Number(activeSession.actualDuration || 1) * 3600000
          )
      const sessStartHHMM = `${String(sStart.getHours()).padStart(2, '0')}:${String(
        sStart.getMinutes()
      ).padStart(2, '0')}`
      const sessEndHHMM = `${String(sEnd.getHours()).padStart(2, '0')}:${String(
        sEnd.getMinutes()
      ).padStart(2, '0')}`

      if (intervalsOverlap(sessStartHHMM, sessEndHHMM, startHHMM, endHHMM)) {
        return {
          available: false,
          reason: `Table is currently occupied by an active player until ${sessEndHHMM}`,
        }
      }
    }
  }

  return {
    available: true,
    startHHMM,
    endHHMM,
  }
}

/**
 * Calculate server-side pricing for a table and duration.
 * Never trusts client-submitted prices.
 */
export async function calculateBookingPrice(table, durationHours) {
  const settings = await getBusinessSettings()
  const { effectiveHourlyRate } = parseTablePricing(table)
  const totalAmount = getTablePriceForDuration(table, durationHours)

  const advanceAmount = settings.fullPaymentOnly
    ? totalAmount
    : Math.min(totalAmount, Number(settings.advanceAmount))

  return {
    hourlyRate: effectiveHourlyRate || Number(table.hourlyRate),
    durationHours: Number(durationHours),
    totalAmount,
    advanceAmount: Number(advanceAmount.toFixed(2)),
    fullPaymentOnly: settings.fullPaymentOnly,
    bookingHoldMins: settings.bookingHoldMins,
    currency: settings.currency,
  }
}

/**
 * Create a new booking with a PENDING_PAYMENT hold.
 * Links to CustomerProfile if session user is authenticated.
 */
export async function createBookingHold({
  tableId,
  bookingDate,
  startTime,
  duration,
  durationHours: rawDurationHours,
  customerName,
  phone,
  email,
  notes,
  customerId = null,
  redeemRewardHours = 0,
  userId = null,
  ipAddress = null,
  userAgent = null,
}) {
  const durationHours = parseDurationHours(rawDurationHours ?? duration)
  if (!durationHours) {
    const err = new Error('Invalid booking duration')
    err.status = 400
    throw err
  }

  const table = await prisma.table.findUnique({ where: { id: tableId } })
  if (!table || !table.isActive || table.status === 'INACTIVE' || table.status === 'MAINTENANCE') {
    const err = new Error('Selected table is not available for booking')
    err.status = 400
    throw err
  }

  // Check overlap in JS with minute arithmetic
  const availability = await checkTableAvailability({
    tableId,
    bookingDate,
    startTime,
    durationHours,
  })

  if (!availability.available) {
    const err = new Error(availability.reason || 'Table already booked for this time slot')
    err.status = 409
    throw err
  }

  const pricing = await calculateBookingPrice(table, durationHours)
  const { normalized: bookingDateObj } = getDayBounds(bookingDate)

  // If customer signed in and provided a phone number, update their profile phone if empty
  if (customerId && phone) {
    prisma.customerProfile
      .updateMany({
        where: { id: customerId, phone: null },
        data: { phone: String(phone).trim() },
      })
      .catch(() => {})
  }

  // Check if customer wants to redeem free loyalty reward hours
  let rewardHoursRedeemed = 0
  let rewardDiscount = 0

  if (customerId) {
    await checkAndIssueRewards(customerId)
    if (Number(redeemRewardHours) > 0) {
      const custProfile = await prisma.customerProfile.findUnique({
        where: { id: customerId },
        select: { rewardBalance: true },
      })
      const availBalance = Number(custProfile?.rewardBalance || 0)
      rewardHoursRedeemed = Math.min(
        Number(redeemRewardHours),
        availBalance,
        pricing.durationHours
      )
      if (rewardHoursRedeemed > 0) {
        rewardDiscount = Number((rewardHoursRedeemed * pricing.hourlyRate).toFixed(2))
        pricing.originalTotalAmount = pricing.totalAmount
        pricing.rewardHoursRedeemed = rewardHoursRedeemed
        pricing.rewardDiscount = rewardDiscount
        pricing.totalAmount = Math.max(
          0,
          Number((pricing.totalAmount - rewardDiscount).toFixed(2))
        )
        pricing.advanceAmount = pricing.fullPaymentOnly
          ? pricing.totalAmount
          : Math.min(pricing.totalAmount, pricing.advanceAmount)
      }
    }
  }

  const isFreeRewardBooking = pricing.totalAmount === 0 && rewardHoursRedeemed > 0
  const holdExpiresAt = isFreeRewardBooking
    ? null
    : new Date(Date.now() + pricing.bookingHoldMins * 60 * 1000)

  const combinedNotes = [
    notes ? String(notes).trim() : null,
    rewardHoursRedeemed > 0 ? `[FREE_REWARD:${rewardHoursRedeemed}h]` : null,
  ]
    .filter(Boolean)
    .join(' — ') || null

  const booking = await prisma.$transaction(async (tx) => {
    // Re-check inside transaction to prevent concurrent race conditions
    const { rangeStart, rangeEnd } = getDayBounds(bookingDate)
    const activeForTable = await tx.booking.findMany({
      where: {
        tableId,
        bookingDate: { gte: rangeStart, lte: rangeEnd },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      select: { id: true, startTime: true, endTime: true },
    })

    const hasConflict = activeForTable.some((b) =>
      intervalsOverlap(b.startTime, b.endTime, availability.startHHMM, availability.endHHMM)
    )

    if (hasConflict) {
      const conflictErr = new Error('This time slot was just taken by another customer')
      conflictErr.status = 409
      throw conflictErr
    }

    const created = await tx.booking.create({
      data: {
        customerId: customerId || null,
        customerName: String(customerName).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        tableId,
        bookingDate: bookingDateObj,
        startTime: availability.startHHMM,
        endTime: availability.endHHMM,
        durationHours: pricing.durationHours,
        status: isFreeRewardBooking ? 'CONFIRMED' : 'PENDING_PAYMENT',
        paymentStatus: isFreeRewardBooking ? 'PAID' : 'UNPAID',
        totalAmount: pricing.totalAmount,
        advanceAmount: pricing.advanceAmount,
        holdExpiresAt,
        notes: combinedNotes,
      },
      include: { table: true },
    })

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: created.id,
        oldStatus: isFreeRewardBooking ? 'CONFIRMED' : 'PENDING_PAYMENT',
        newStatus: isFreeRewardBooking ? 'CONFIRMED' : 'PENDING_PAYMENT',
        changedBy: userId || null,
        reason: isFreeRewardBooking
          ? `Confirmed FREE (₹0) via ${rewardHoursRedeemed}h Loyalty Gift Reward`
          : `Booking hold created (expires at ${holdExpiresAt.toISOString()})`,
      },
    })

    return created
  })

  if (customerId && rewardHoursRedeemed > 0) {
    await redeemCustomerRewards({
      customerId,
      hoursToRedeem: rewardHoursRedeemed,
      staffUserId: userId || null,
      reason: `Redeemed ${rewardHoursRedeemed}h Free Gift Reward on Online Booking #${booking.bookingRef
        .slice(-8)
        .toUpperCase()}`,
    })
  }

  if (userId) {
    await logAudit({
      userId,
      action: 'BOOKING_CREATED',
      module: 'BOOKINGS',
      entityId: booking.id,
      entityType: 'Booking',
      changes: {
        bookingRef: booking.bookingRef,
        tableId,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalAmount: Number(booking.totalAmount),
        rewardHoursRedeemed,
      },
      ipAddress,
      userAgent,
    })
  }

  return { booking, pricing, isFreeRewardBooking }
}

/**
 * Renew an existing PENDING_PAYMENT booking hold if the slot is still free.
 */
export async function renewBookingHold(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { table: true },
  })

  if (!booking) {
    const err = new Error('Booking not found')
    err.status = 404
    throw err
  }

  if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'EXPIRED') {
    const err = new Error(`Cannot renew hold for booking in status ${booking.status}`)
    err.status = 400
    throw err
  }

  const availability = await checkTableAvailability({
    tableId: booking.tableId,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    durationHours: Number(booking.durationHours),
    excludeBookingId: booking.id,
  })

  if (!availability.available) {
    const err = new Error('Slot is no longer available')
    err.status = 409
    throw err
  }

  const settings = await getBusinessSettings()
  const holdExpiresAt = new Date(Date.now() + settings.bookingHoldMins * 60 * 1000)

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'PENDING_PAYMENT',
      holdExpiresAt,
    },
    include: { table: true },
  })

  return updated
}

/**
 * Cancel a booking and record status history + notification.
 */
export async function cancelBooking({
  bookingId,
  userId = null,
  customerProfileId = null,
  isStaff = false,
  reason = 'Cancelled by customer',
  ipAddress = null,
  userAgent = null,
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { table: true, customer: true },
  })

  if (!booking) {
    const err = new Error('Booking not found')
    err.status = 404
    throw err
  }

  // Customer isolation check
  if (!isStaff) {
    if (!customerProfileId || booking.customerId !== customerProfileId) {
      const err = new Error('Forbidden: You can only cancel your own bookings')
      err.status = 403
      throw err
    }

    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
      const err = new Error(`Booking with status ${booking.status} cannot be cancelled online`)
      err.status = 400
      throw err
    }
  }

  if (booking.status === 'CANCELLED') {
    return booking
  }

  const oldStatus = booking.status

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
        holdExpiresAt: null,
      },
      include: {
        table: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    })

    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        oldStatus,
        newStatus: 'CANCELLED',
        changedBy: userId || null,
        reason,
      },
    })

    return b
  })

  if (userId) {
    await logAudit({
      userId,
      action: 'BOOKING_CANCELLED',
      module: 'BOOKINGS',
      entityId: bookingId,
      entityType: 'Booking',
      changes: { oldStatus, newStatus: 'CANCELLED', reason },
      ipAddress,
      userAgent,
    })
  }

  if (booking.customer?.userId) {
    await createNotification({
      userId: booking.customer.userId,
      title: 'Booking Cancelled',
      message: `Your booking #${booking.bookingRef.slice(-8).toUpperCase()} for ${booking.table?.name} has been cancelled.`,
      type: 'BOOKING',
      actionUrl: `/bookings/${booking.id}`,
    })
  }

  return updated
}
