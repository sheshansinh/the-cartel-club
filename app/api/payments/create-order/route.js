import { NextResponse } from 'next/server'
import { createPaymentOrderForBooking } from '@/lib/services/payment'

export async function POST(request) {
  try {
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

    // Server-side price calculation and hold expiry validation
    const orderDetails = await createPaymentOrderForBooking(bookingId)

    return NextResponse.json(orderDetails)
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: error.status || 500 }
    )
  }
}
