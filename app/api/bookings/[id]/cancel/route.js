import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cancelBooking } from '@/lib/services/booking'
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

/**
 * POST /api/bookings/[id]/cancel
 * Cancel own upcoming booking (or any booking if staff).
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { reason } = body
    const { ipAddress, userAgent } = getRequestMeta(request)
    const isStaff = STAFF_ROLES.includes(session.user.role)

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
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel booking' },
      { status: error.status || 500 }
    )
  }
}

