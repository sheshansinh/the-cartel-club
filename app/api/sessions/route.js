import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startGamingSession, decorateSession } from '@/lib/services/session'
import { getRequestMeta } from '@/lib/services/audit'

const SESSION_STAFF_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'RECEPTIONIST',
  'CASHIER',
]

/**
 * GET /api/sessions
 * Returns live active/paused sessions, all tables with current occupancy,
 * today's confirmed/checked-in bookings ready to start, and recent completed sessions.
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !SESSION_STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    const now = new Date()
    const dayStart = new Date(now.getTime() - 18 * 60 * 60 * 1000)
    const dayEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const [activeRaw, recentRaw, tables, readyBookings, customers] = await Promise.all([
      prisma.gamingSession.findMany({
        where: statusFilter
          ? { status: statusFilter }
          : { status: { in: ['ACTIVE', 'PAUSED'] } },
        orderBy: { startTime: 'asc' },
        include: {
          table: true,
          customer: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          booking: true,
          adjustments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.gamingSession.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { endTime: 'desc' },
        take: 25,
        include: {
          table: true,
          customer: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          booking: true,
          adjustments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.table.findMany({
        where: { isActive: true },
        orderBy: { sequence: 'asc' },
      }),
      prisma.booking.findMany({
        where: {
          bookingDate: { gte: dayStart, lte: dayEnd },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        orderBy: { startTime: 'asc' },
        include: { table: true, customer: true },
      }),
      prisma.customerProfile.findMany({
        take: 100,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    const activeSessions = activeRaw.map(decorateSession)
    const recentSessions = recentRaw.map(decorateSession)
    const activeByTable = new Map(activeSessions.map((s) => [s.tableId, s]))

    const tablesBoard = tables.map((t) => ({
      ...t,
      hourlyRate: Number(t.hourlyRate),
      activeSession: activeByTable.get(t.id) || null,
    }))

    return NextResponse.json({
      activeSessions,
      recentSessions,
      tables: tablesBoard,
      readyBookings,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.user?.name || 'Customer',
        email: c.user?.email || '',
        phone: c.phone || '',
        totalPlayingHours: Number(c.totalPlayingHours || 0),
        rewardBalance: Number(c.rewardBalance || 0),
        membershipTier: c.membershipTier || 'BRONZE',
      })),
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

/**
 * POST /api/sessions
 * Starts a new gaming session (walk-in, online booking, prepaid, or complimentary).
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !SESSION_STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ipAddress, userAgent } = getRequestMeta(request)

    const {
      tableId,
      bookingId,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      sessionType,
      expectedDurationHours,
      notes,
    } = body

    const started = await startGamingSession({
      tableId,
      bookingId,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      sessionType: sessionType || 'WALK_IN',
      expectedDurationHours: expectedDurationHours || 1,
      notes,
      staffUserId: session.user.id,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ session: started }, { status: 201 })
  } catch (error) {
    console.error('Error starting session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start session' },
      { status: error.status || 500 }
    )
  }
}

