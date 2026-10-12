import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createBookingHold, expireOldHolds } from '@/lib/services/booking'
import { resolveOrCreateCustomer } from '@/lib/services/session'
import { getRequestMeta } from '@/lib/services/audit'

/**
 * POST /api/bookings
 * Creates a PENDING_PAYMENT booking hold with server-calculated pricing.
 * Automatically links to an existing User + CustomerProfile by phone number,
 * or creates a new User + CustomerProfile if the phone number is unique.
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { ipAddress, userAgent } = getRequestMeta(request)

    const {
      customerName,
      phone,
      email,
      tableId,
      bookingDate,
      startTime,
      duration,
      durationHours,
      redeemRewardHours = 0,
      notes,
    } = body

    const resolvedName = customerName || session?.user?.name
    const resolvedEmail = email || session?.user?.email
    const resolvedPhone = phone || session?.user?.phone

    if (!resolvedName || !resolvedPhone || !tableId || !bookingDate || !startTime || (!duration && !durationHours)) {
      return NextResponse.json(
        { error: 'Missing required booking fields (name, phone, table, date, start time, duration)' },
        { status: 400 }
      )
    }

    // Resolve or create CustomerProfile + User (strictly deduplicated by phone number)
    const customerId = await resolveOrCreateCustomer({
      customerId: session?.user?.customerProfileId || null,
      customerName: resolvedName,
      customerPhone: resolvedPhone,
      customerEmail: resolvedEmail,
    })

    const { booking, pricing, isFreeRewardBooking } = await createBookingHold({
      tableId,
      bookingDate,
      startTime,
      duration,
      durationHours,
      customerName: resolvedName,
      phone: resolvedPhone,
      email: resolvedEmail,
      notes,
      customerId,
      redeemRewardHours: Number(redeemRewardHours || 0),
      userId: session?.user?.id || null,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ booking, pricing, isFreeRewardBooking }, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    const status = error.status || 500
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status }
    )
  }
}

/**
 * GET /api/bookings
 * Customer: returns ONLY their own bookings (enforced via session.user.customerProfileId).
 * Staff: returns paginated bookings list.
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await expireOldHolds()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20)
    const statusFilter = searchParams.get('status')
    const skip = (page - 1) * limit

    const where = {}

    if (session.user.role === 'CUSTOMER') {
      let customerProfileId = session.user.customerProfileId
      if (!customerProfileId) {
        const profile = await prisma.customerProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })
        customerProfileId = profile?.id
      }

      if (!customerProfileId) {
        return NextResponse.json({
          bookings: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }

      where.customerId = customerProfileId
    }

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          table: true,
          payments: { orderBy: { createdAt: 'desc' } },
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.booking.count({ where }),
    ])

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
