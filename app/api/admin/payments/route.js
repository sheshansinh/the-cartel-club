import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const PAYMENT_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'ACCOUNTANT',
  'CASHIER',
  'RECEPTIONIST',
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !PAYMENT_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paymentsRaw = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        booking: {
          include: { table: true },
        },
      },
    })

    const payments = paymentsRaw.map((p) => {
      let meta = {}
      try {
        if (p.metadata) meta = JSON.parse(p.metadata)
      } catch (_) {}

      return {
        id: p.id,
        bookingId: p.booking?.bookingRef || p.bookingId || meta.saleRef || meta.sessionId || '—',
        rawBookingId: p.bookingId,
        customerName:
          p.booking?.customerName ||
          meta.customerName ||
          (p.paymentType === 'POS_SALE' ? 'POS Counter Sale' : 'Walk-in Guest'),
        amount: Number(p.amount || 0),
        status: p.status,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod || 'RAZORPAY',
        transactionId: p.razorpayPaymentId || p.razorpayOrderId || p.id.slice(-10).toUpperCase(),
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}
