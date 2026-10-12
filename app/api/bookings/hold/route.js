import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createBookingHold,
  renewBookingHold,
  checkTableAvailability,
  calculateBookingPrice,
  parseDurationHours,
} from '@/lib/services/booking'
import { getRequestMeta } from '@/lib/services/audit'

/**
 * POST /api/bookings/hold
 * Supports:
 * 1) Renewing an existing hold when `bookingId` is provided
 * 2) Creating a new PENDING_PAYMENT hold when table + slot + customer details are provided
 * 3) Checking slot availability + server-side price preview when `previewOnly: true`
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { ipAddress, userAgent } = getRequestMeta(request)

    // Mode 1: Renew existing hold
    if (body.bookingId && body.action === 'renew') {
      const renewed = await renewBookingHold(body.bookingId)
      return NextResponse.json({
        booking: renewed,
        holdExpiresAt: renewed.holdExpiresAt,
      })
    }

    // Mode 2: Preview availability & server-calculated price before creating DB hold
    if (body.previewOnly) {
      const { tableId, bookingDate, startTime, duration, durationHours: rawHours } = body
      const durationHours = parseDurationHours(rawHours ?? duration) || 1
      const table = await prisma.table.findUnique({ where: { id: tableId } })
      if (!table || !table.isActive) {
        return NextResponse.json({ error: 'Table not available' }, { status: 400 })
      }
      const availability = await checkTableAvailability({
        tableId,
        bookingDate,
        startTime,
        durationHours,
      })
      const pricing = await calculateBookingPrice(table, durationHours)
      return NextResponse.json({ availability, pricing })
    }

    // Mode 3: Create a new booking hold
    const {
      tableId,
      bookingDate,
      startTime,
      duration,
      durationHours,
      customerName,
      phone,
      email,
      notes,
    } = body

    const resolvedName = customerName || session?.user?.name
    const resolvedEmail = email || session?.user?.email
    const resolvedPhone = phone || session?.user?.phone

    if (!resolvedName || !resolvedPhone || !tableId || !bookingDate || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields to hold table' },
        { status: 400 }
      )
    }

    let customerId = session?.user?.customerProfileId || null
    if (!customerId && session?.user?.id && session?.user?.role === 'CUSTOMER') {
      const profile = await prisma.customerProfile.upsert({
        where: { userId: session.user.id },
        update: {},
        create: { userId: session.user.id, phone: String(resolvedPhone).trim() },
      })
      customerId = profile.id
    }

    const { booking, pricing } = await createBookingHold({
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
      userId: session?.user?.id || null,
      ipAddress,
      userAgent,
    })

    return NextResponse.json(
      {
        booking,
        pricing,
        holdExpiresAt: booking.holdExpiresAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in /api/bookings/hold:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to hold table' },
      { status: error.status || 500 }
    )
  }
}

