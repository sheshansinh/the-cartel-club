import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page   = Math.max(1, parseInt(searchParams.get('page'))  || 1)
    const limit  = Math.min(50, parseInt(searchParams.get('limit')) || 10)
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const skip   = (page - 1) * limit

    // MySQL doesn't support mode: 'insensitive' — use contains without mode
    const where = {
      ...(status !== 'all' && { status }),
      ...(search && {
        OR: [
          { customerName: { contains: search } },
          { phone:        { contains: search } },
          { bookingRef:   { contains: search } },
        ],
      }),
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { table: true, payments: { take: 1, orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])

    return NextResponse.json({
      bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Admin bookings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { bookingId, status, reason } = await request.json()
    if (!bookingId || !status) {
      return NextResponse.json({ error: 'bookingId and status are required' }, { status: 400 })
    }

    // Fetch current status for history
    const current = await prisma.booking.findUnique({
      where:  { id: bookingId },
      select: { status: true },
    })
    if (!current) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const booking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where:   { id: bookingId },
        data:    { status, ...(status === 'CANCELLED' && { cancelledAt: new Date(), cancelReason: reason }) },
        include: { table: true, payments: { take: 1 } },
      })
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          oldStatus: current.status,
          newStatus: status,
          changedBy: session.user?.id,
          reason:    reason ?? null,
        },
      })
      return updated
    })

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Admin bookings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { customerName, phone, email, tableId, bookingDate, startTime, durationHours, notes } = body

    if (!customerName || !phone || !tableId || !bookingDate || !startTime || !durationHours) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const table = await prisma.table.findUnique({ where: { id: tableId } })
    if (!table || !table.isActive) {
      return NextResponse.json({ error: 'Table not available' }, { status: 400 })
    }

    const hours      = parseFloat(durationHours)
    const startHHMM  = /^\d{2}:\d{2}$/.test(startTime) ? startTime : to24Hour(startTime)
    const endHHMM    = addHours(startHHMM, hours)
    const dateObj    = new Date(bookingDate)
    dateObj.setHours(0, 0, 0, 0)

    const conflict = await prisma.booking.findFirst({
      where: {
        tableId,
        bookingDate: dateObj,
        status:      { in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
        AND: [{ startTime: { lt: endHHMM } }, { endTime: { gt: startHHMM } }],
      },
    })
    if (conflict) return NextResponse.json({ error: 'Table already booked for this slot' }, { status: 409 })

    const totalAmount = Number(table.hourlyRate) * hours

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          customerName,
          phone,
          email:         email || null,
          tableId,
          bookingDate:   dateObj,
          startTime:     startHHMM,
          endTime:       endHHMM,
          durationHours: hours,
          status:        'CONFIRMED',   // walk-in bookings by staff are immediately confirmed
          paymentStatus: 'UNPAID',
          totalAmount,
          advanceAmount: 0,
          notes:         notes || null,
        },
        include: { table: true },
      })
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: b.id,
          oldStatus: 'PENDING_PAYMENT',
          newStatus: 'CONFIRMED',
          changedBy: session.user?.id,
          reason:    'Walk-in booking created by staff',
        },
      })
      return b
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    console.error('Admin bookings POST error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

function to24Hour(t) {
  if (!t) return '12:00'
  if (/^\d{2}:\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return '12:00'
  let h = parseInt(m[1])
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

function addHours(hhMM, hours) {
  const [h, m] = hhMM.split(':').map(Number)
  const total  = h * 60 + m + Math.round(hours * 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
