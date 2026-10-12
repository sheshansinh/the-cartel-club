import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  extendGamingSession,
  togglePauseGamingSession,
  stopGamingSession,
  decorateSession,
} from '@/lib/services/session'
import { getRequestMeta } from '@/lib/services/audit'

const SESSION_STAFF_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'RECEPTIONIST',
  'CASHIER',
]

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user || !SESSION_STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gamingSession = await prisma.gamingSession.findUnique({
      where: { id },
      include: {
        table: true,
        customer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        booking: true,
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!gamingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session: decorateSession(gamingSession) })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

/**
 * PATCH /api/sessions/[id]
 * Actions:
 * - action: 'extend' -> extends session duration & logs SessionAdjustment
 * - action: 'pause' | 'resume' -> toggles ACTIVE / PAUSED
 * - action: 'stop' -> completes session, calculates charge, updates hours, runs loyalty engine
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const authSession = await getServerSession(authOptions)
    if (!authSession?.user || !SESSION_STAFF_ROLES.includes(authSession.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (action === 'extend') {
      const updated = await extendGamingSession({
        sessionId: id,
        additionalHours: body.additionalHours ?? 0.5,
        reason: body.reason || 'Extended by staff',
        staffUserId: authSession.user.id,
      })
      return NextResponse.json({ session: updated })
    }

    if (action === 'pause' || action === 'resume') {
      const updated = await togglePauseGamingSession({
        sessionId: id,
        reason: body.reason || `${action}d by staff`,
        staffUserId: authSession.user.id,
      })
      return NextResponse.json({ session: updated })
    }

    if (action === 'stop') {
      const result = await stopGamingSession({
        sessionId: id,
        overrideDurationHours: body.overrideDurationHours ?? null,
        discountAmount: body.discountAmount ?? 0,
        discountReason: body.discountReason ?? null,
        redeemBonusHours: body.redeemBonusHours ?? 0,
        paymentMethod: body.paymentMethod || 'CASH',
        paymentStatus: body.paymentStatus || 'PAID',
        notes: body.notes ?? null,
        staffUserId: authSession.user.id,
        ipAddress,
        userAgent,
      })
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Invalid action. Use extend, pause, resume, or stop.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update session' },
      { status: error.status || 500 }
    )
  }
}

