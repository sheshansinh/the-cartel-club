import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, confirmBookingPayment } from '@/lib/services/payment'

// Razorpay sends raw body — must NOT use request.json() before HMAC verification
export async function POST(request) {
  let rawBody = ''
  let webhookRecordId = null

  try {
    rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const headerEventId = request.headers.get('x-razorpay-event-id')
    const entityId =
      event.payload?.payment?.entity?.id ||
      event.payload?.refund?.entity?.id ||
      null
    const eventId = headerEventId || (entityId ? `${event.event}:${entityId}` : null)

    // ── Idempotency check via WebhookEvent.eventId ────────────────────────
    if (eventId) {
      const existing = await prisma.webhookEvent.findUnique({ where: { eventId } })
      if (existing?.processed) {
        return NextResponse.json({ received: true, skipped: 'already processed' })
      }
      if (existing) {
        webhookRecordId = existing.id
      }
    }

    if (!webhookRecordId) {
      const webhookRecord = await prisma.webhookEvent.create({
        data: {
          provider: 'razorpay',
          eventType: event.event,
          eventId,
          payload: rawBody,
          processed: false,
        },
      })
      webhookRecordId = webhookRecord.id
    }

    // ── Handle payment.captured ───────────────────────────────────────────
    if (event.event === 'payment.captured') {
      const entity = event.payload?.payment?.entity
      const orderId = entity?.order_id
      const paymentId = entity?.id

      if (orderId && paymentId) {
        await confirmBookingPayment({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          source: 'webhook:payment.captured',
        }).catch((err) => {
          console.warn('[webhook] confirmBookingPayment notice:', err.message)
        })
      }
    }

    // ── Handle payment.failed ─────────────────────────────────────────────
    if (event.event === 'payment.failed') {
      const entity = event.payload?.payment?.entity
      const orderId = entity?.order_id

      if (orderId) {
        const payment = await prisma.payment.findUnique({
          where: { razorpayOrderId: orderId },
          include: { booking: { select: { id: true, status: true } } },
        })

        if (payment && payment.status === 'PENDING') {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'FAILED',
                failureReason: entity?.error?.description || 'Payment failed',
              },
            })

            if (payment.bookingId && payment.booking?.status === 'PENDING_PAYMENT') {
              await tx.booking.update({
                where: { id: payment.bookingId },
                data: {
                  status: 'CANCELLED',
                  paymentStatus: 'FAILED',
                  cancelledAt: new Date(),
                  cancelReason: 'Payment failed via Razorpay webhook',
                },
              })

              await tx.bookingStatusHistory.create({
                data: {
                  bookingId: payment.bookingId,
                  oldStatus: payment.booking.status,
                  newStatus: 'CANCELLED',
                  reason: 'Payment failed (webhook)',
                },
              })
            }
          })
        }
      }
    }

    // ── Handle refund.processed ───────────────────────────────────────────
    if (event.event === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity
      const paymentId = refundEntity?.payment_id
      if (paymentId) {
        const payment = await prisma.payment.findUnique({
          where: { razorpayPaymentId: paymentId },
        })
        if (payment && payment.status !== 'REFUNDED') {
          const refundRupees = Number((Number(refundEntity.amount || 0) / 100).toFixed(2))
          const isFull = refundRupees >= Number(payment.amount)
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
              refundId: refundEntity.id,
              refundAmount: refundRupees,
              refundedAt: new Date(),
            },
          })
        }
      }
    }

    // Mark webhook event as processed
    if (webhookRecordId) {
      await prisma.webhookEvent.update({
        where: { id: webhookRecordId },
        data: { processed: true, processedAt: new Date() },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    if (webhookRecordId) {
      await prisma.webhookEvent
        .update({
          where: { id: webhookRecordId },
          data: { error: error.message || 'Unknown error' },
        })
        .catch(() => {})
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
