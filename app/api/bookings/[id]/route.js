import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelBooking, expireOldHolds } from '@/lib/services/booking'
import { getRequestMeta } from '@/lib/services/audit'

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'RECEPTIONIST',
  'CASHIER',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
  'SUPPORT_AGENT',
]

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    await expireOldHolds()

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        table: true,
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const isStaff = session?.user?.role && STAFF_ROLES.includes(session.user.role)

    // Enforce customer data isolation: if booking belongs to a customer profile,
    // only that customer or staff can view it.
    if (booking.customerId && !isStaff) {
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (session.user.customerProfileId !== booking.customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}

/**
 * PATCH /api/bookings/[id]
 * Allows a customer (or staff) to cancel an upcoming booking.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { action, status, reason } = body
    const { ipAddress, userAgent } = getRequestMeta(request)
    const isStaff = STAFF_ROLES.includes(session.user.role)

    if (action === 'cancel' || status === 'CANCELLED') {
      const booking = await cancelBooking({
        bookingId: id,
        userId: session.user.id,
        customerProfileId: session.user.customerProfileId,
        isStaff,
        reason: reason || (isStaff ? 'Cancelled by staff' : 'Cancelled by customer'),
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ booking })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update booking' },
      { status: error.status || 500 }
    )
  }
}
