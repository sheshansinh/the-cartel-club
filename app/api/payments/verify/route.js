import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyRazorpaySignature, confirmBookingPayment } from '@/lib/services/payment'
import { getRequestMeta } from '@/lib/services/audit'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    const { ipAddress, userAgent } = getRequestMeta(request)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } =
      await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required verification fields' },
        { status: 400 }
      )
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const result = await confirmBookingPayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      bookingId,
      source: 'verify',
      userId: session?.user?.id || null,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      alreadyConfirmed: result.alreadyConfirmed,
      booking: result.booking,
      message: result.alreadyConfirmed
        ? 'Payment already verified'
        : 'Payment verified successfully',
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: error.status || 500 }
    )
  }
}
