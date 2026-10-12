/**
 * Payment Service Layer (Module D)
 *
 * Centralizes Razorpay order creation, HMAC verification, idempotent
 * payment confirmation, customer lifetimeSpending updates, notifications,
 * and audit logging.
 */

import crypto from 'crypto'
import Razorpay from 'razorpay'
import { prisma } from '@/lib/prisma'
import { getBusinessSettings } from '@/lib/services/booking'
import { logAudit } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'

let razorpayInstance = null

export function getRazorpayClient() {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder',
    })
  }
  return razorpayInstance
}

/**
 * Create a Razorpay order for a PENDING_PAYMENT booking.
 * Always computes the charge from the server-stored booking & BusinessSettings.
 */
export async function createPaymentOrderForBooking(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      table: true,
      payments: {
        where: { status: { in: ['PENDING', 'PAID'] } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!booking) {
    const err = new Error('Booking not found')
    err.status = 404
    throw err
  }

  // Reject if hold has expired
  if (booking.status === 'EXPIRED' || (booking.holdExpiresAt && booking.holdExpiresAt < new Date())) {
    if (booking.status !== 'EXPIRED') {
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'EXPIRED' },
        }),
        prisma.bookingStatusHistory.create({
          data: {
            bookingId,
            oldStatus: booking.status,
            newStatus: 'EXPIRED',
            reason: 'Booking hold expired before payment order creation',
          },
        }),
      ])
    }
    const err = new Error('Booking hold has expired. Please select your table again.')
    err.status = 410
    throw err
  }

  // Reject if already paid
  const alreadyPaid = booking.payments.some((p) => p.status === 'PAID')
  if (alreadyPaid || booking.paymentStatus === 'PAID') {
    const err = new Error('Booking is already paid')
    err.status = 409
    throw err
  }

  const settings = await getBusinessSettings()
  const totalAmountRupees = Number(booking.totalAmount)
  const advanceAmountRupees = Number(booking.advanceAmount)

  const chargeRupees = settings.fullPaymentOnly
    ? totalAmountRupees
    : advanceAmountRupees > 0
    ? advanceAmountRupees
    : totalAmountRupees

  const paymentType = settings.fullPaymentOnly ? 'BOOKING_FULL' : 'BOOKING_ADVANCE'
  const amountPaise = Math.round(chargeRupees * 100)

  const razorpay = getRazorpayClient()
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: settings.currency || 'INR',
    receipt: `bk_${booking.bookingRef.slice(-10)}`,
    notes: {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      tableNumber: booking.table?.tableNumber || '',
    },
  })

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: chargeRupees,
      currency: settings.currency || 'INR',
      status: 'PENDING',
      paymentType,
      razorpayOrderId: order.id,
    },
  })

  return {
    orderId: order.id,
    amount: order.amount, // in paise for Razorpay checkout
    amountRupees: chargeRupees,
    totalAmountRupees,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    paymentId: payment.id,
    bookingRef: booking.bookingRef,
    holdExpiresAt: booking.holdExpiresAt,
  }
}

/**
 * Verify Razorpay client checkout HMAC signature
 */
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return expectedSig === signature
}

/**
 * Verify Razorpay webhook raw body HMAC signature
 */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return expectedSig === signature
}

/**
 * Idempotently confirm a payment and its associated booking.
 * Safe to call from both `/api/payments/verify` and `/api/payments/webhook`.
 */
export async function confirmBookingPayment({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = null,
  bookingId = null,
  source = 'verify',
  userId = null,
  ipAddress = null,
  userAgent = null,
}) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId },
    include: {
      booking: {
        include: {
          table: true,
          customer: true,
        },
      },
    },
  })

  if (!payment) {
    const err = new Error('Payment record not found')
    err.status = 404
    throw err
  }

  const targetBookingId = bookingId || payment.bookingId

  // Idempotency guard: if already PAID, return existing state without duplicating side effects
  if (payment.status === 'PAID') {
    return {
      alreadyConfirmed: true,
      payment,
      booking: payment.booking,
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Re-read payment inside transaction for strict concurrency safety
    const freshPayment = await tx.payment.findUnique({
      where: { id: payment.id },
    })

    if (freshPayment.status === 'PAID') {
      const currentBooking = targetBookingId
        ? await tx.booking.findUnique({
            where: { id: targetBookingId },
            include: { table: true, customer: true },
          })
        : null
      return { alreadyConfirmed: true, payment: freshPayment, booking: currentBooking }
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        razorpayPaymentId,
        ...(razorpaySignature ? { razorpaySignature } : {}),
        paymentMethod: 'RAZORPAY',
        paidAt: new Date(),
      },
    })

    let updatedBooking = null
    if (targetBookingId) {
      const currentBooking = await tx.booking.findUnique({
        where: { id: targetBookingId },
        include: { table: true, customer: true },
      })

      if (currentBooking) {
        const oldStatus = currentBooking.status

        updatedBooking = await tx.booking.update({
          where: { id: targetBookingId },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            holdExpiresAt: null,
          },
          include: { table: true, customer: true },
        })

        if (oldStatus !== 'CONFIRMED') {
          await tx.bookingStatusHistory.create({
            data: {
              bookingId: targetBookingId,
              oldStatus,
              newStatus: 'CONFIRMED',
              changedBy: userId || currentBooking.customer?.userId || null,
              reason: `Payment confirmed via Razorpay (${source})`,
            },
          })
        }

        // Increment customer's lifetimeSpending
        if (currentBooking.customerId) {
          await tx.customerProfile.update({
            where: { id: currentBooking.customerId },
            data: {
              lifetimeSpending: {
                increment: Number(updatedPayment.amount),
              },
            },
          })
        }
      }
    }

    return {
      alreadyConfirmed: false,
      payment: updatedPayment,
      booking: updatedBooking,
    }
  })

  if (!result.alreadyConfirmed && result.booking) {
    const notifyUserId = userId || result.booking.customer?.userId
    if (notifyUserId) {
      await createNotification({
        userId: notifyUserId,
        title: 'Booking Confirmed!',
        message: `Your reservation for ${result.booking.table?.name || 'Table'} on ${new Date(
          result.booking.bookingDate
        ).toLocaleDateString('en-IN')} at ${result.booking.startTime} is confirmed.`,
        type: 'BOOKING',
        actionUrl: `/bookings/${result.booking.id}`,
      })

      await logAudit({
        userId: notifyUserId,
        action: 'PAYMENT_RECEIVED',
        module: 'PAYMENTS',
        entityId: result.payment.id,
        entityType: 'Payment',
        changes: {
          bookingId: result.booking.id,
          amount: Number(result.payment.amount),
          razorpayPaymentId,
          source,
        },
        ipAddress,
        userAgent,
      })
    }
  }

  return result
}

