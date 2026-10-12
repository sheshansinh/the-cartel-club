import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRazorpayClient } from '@/lib/services/payment'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER']

export async function POST(request) {
  try {
    // Auth guard — only managers and above
    const session = await getServerSession(authOptions)
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId, amount, reason } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where:   { id: paymentId },
      include: { booking: { select: { id: true, status: true } } },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    if (payment.status !== 'PAID') {
      return NextResponse.json({ error: 'Only PAID payments can be refunded' }, { status: 400 })
    }
    if (!payment.razorpayPaymentId) {
      return NextResponse.json({ error: 'No Razorpay payment ID on record' }, { status: 400 })
    }

    const refundAmountRupees = amount ? Number(amount) : Number(payment.amount)
    const refundAmountPaise  = Math.round(refundAmountRupees * 100)

    // Issue refund via Razorpay
    const razorpay = getRazorpayClient()
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: refundAmountPaise,
      notes:  { reason: reason ?? 'Admin initiated refund' },
    })

    const isFullRefund = refundAmountRupees >= Number(payment.amount)

    // Update payment + booking atomically
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status:       isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundId:     refund.id,
          refundAmount: refundAmountRupees,
          refundedAt:   new Date(),
        },
      })

      if (payment.booking && isFullRefund) {
        await tx.booking.update({
          where: { id: payment.booking.id },
          data: { status: 'CANCELLED', paymentStatus: 'REFUNDED', cancelledAt: new Date() },
        })

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: payment.booking.id,
            oldStatus: payment.booking.status,
            newStatus: 'CANCELLED',
            changedBy: session.user.id,
            reason:    `Refund issued: ${reason ?? 'Admin initiated'}`,
          },
        })
      }
    })

    return NextResponse.json({
      success:  true,
      refundId: refund.id,
      amount:   refundAmountRupees,
    })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
