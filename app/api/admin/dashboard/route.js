import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ensureDefaultProductsAndSuppliers,
  recordStockMovement,
  serializeProduct,
} from '@/lib/services/inventory'
import {
  startGamingSession,
  extendGamingSession,
  togglePauseGamingSession,
  stopGamingSession,
  resolveOrCreateCustomer,
  syncCustomerStatsAndLoyalty,
} from '@/lib/services/session'
import {
  ensureDefaultLoyaltyProgram,
  checkAndIssueRewards,
  adjustCustomerRewards,
  getCustomerHoursBreakdown,
} from '@/lib/services/loyalty'
import { parseTablePricing } from '@/lib/services/table-pricing'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

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

function extractPlayerName(session) {
  if (!session) return 'Player'
  if (session.booking?.customerName) return session.booking.customerName
  if (session.customer?.user?.name) return session.customer.user.name
  if (session.notes) {
    const match = String(session.notes).match(/Guest:\s*([^—|(]+)/i)
    if (match?.[1]) return match[1].trim()
  }
  return 'Walk-in Player'
}

function extractPlayerPhone(session) {
  if (!session) return ''
  if (session.booking?.phone) return session.booking.phone
  if (session.customer?.phone) return session.customer.phone
  if (session.notes) {
    const match = String(session.notes).match(/\(([\d+\s-]{8,15})\)/)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDefaultProductsAndSuppliers()

    const now = new Date()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Auto-start any Online Booking whose booked time slot is active right now
    // if the requested table is currently available
    const dayRangeStart = new Date(todayStart.getTime() - 6 * 3600000)
    const dayRangeEnd = new Date(todayEnd.getTime() + 6 * 3600000)
    const dueOnlineBookings = await prisma.booking.findMany({
      where: {
        bookingDate: { gte: dayRangeStart, lte: dayRangeEnd },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
    })

    const nowMins = now.getHours() * 60 + now.getMinutes()
    for (const b of dueOnlineBookings) {
      const [sh, sm] = String(b.startTime || '00:00').split(':').map(Number)
      const [eh, em] = String(b.endTime || '00:00').split(':').map(Number)
      const startMins = (sh || 0) * 60 + (sm || 0)
      let endMins = (eh || 0) * 60 + (em || 0)
      if (endMins <= startMins) endMins += 1440

      if (nowMins >= startMins && nowMins < endMins) {
        try {
          await startGamingSession({
            tableId: b.tableId,
            bookingId: b.id,
            sessionType: 'ONLINE_BOOKING',
            staffUserId: session.user.id,
          })
        } catch {
          // Table already has an active session; skip silently
        }
      }
    }

    const [
      totalBookings,
      todayBookings,
      revenueResult,
      todayRevenueResult,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      recentBookings,
      allTables,
      activeSessionsRaw,
      readyBookingsRaw,
      productsRaw,
      categories,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      prisma.booking.count({ where: { status: 'PENDING_PAYMENT' } }),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.booking.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          table: true,
          payments: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.table.findMany({
        where: { isActive: true },
        orderBy: { sequence: 'asc' },
      }),
      prisma.gamingSession.findMany({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        orderBy: { startTime: 'asc' },
        include: {
          table: true,
          customer: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          booking: true,
        },
      }),
      prisma.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        orderBy: [{ bookingDate: 'asc' }, { startTime: 'asc' }],
        take: 30,
        include: { table: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      }),
      prisma.productCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ])

    // Fetch all POS sales linked to active sessions via notes: "SESSION_TAB:<sessionId>"
    const activeSessionIds = activeSessionsRaw.map((s) => s.id)
    let sessionPosSales = []
    if (activeSessionIds.length > 0) {
      const tagFilters = activeSessionIds.map((id) => ({
        notes: { startsWith: `SESSION_TAB:${id}` },
      }))
      sessionPosSales = await prisma.pOSSale.findMany({
        where: {
          voidedAt: null,
          OR: tagFilters,
        },
        orderBy: { saleDate: 'asc' },
        include: {
          items: {
            include: { product: true },
          },
        },
      })
    }

    // Group POS tab sales by sessionId
    const posBySessionId = new Map()
    for (const sale of sessionPosSales) {
      const note = String(sale.notes || '')
      const sessionId = note.replace('SESSION_TAB:', '').split('|')[0].trim()
      if (!posBySessionId.has(sessionId)) {
        posBySessionId.set(sessionId, [])
      }
      posBySessionId.get(sessionId).push({
        id: sale.id,
        saleRef: sale.saleRef,
        totalAmount: Number(sale.totalAmount || 0),
        paymentStatus: sale.paymentStatus, // 'UNPAID' (Pending) or 'PAID'
        paymentMethod: sale.paymentMethod,
        saleDate: sale.saleDate,
        items: (sale.items || []).map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Product',
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
        })),
      })
    }

    const activeByTableId = new Map()
    for (const s of activeSessionsRaw) {
      const isOnlineBooking = Boolean(
        s.bookingId || s.sessionType === 'ONLINE_BOOKING'
      )
      const plannedHours = Math.max(0.1, Number(s.actualDuration || 1))
      const hourlyRate = Number(s.hourlyRate || s.table?.hourlyRate || 200)
      const hasDiscountOrZeroFinal =
        Number(s.discountAmount || 0) > 0 ||
        s.sessionType === 'COMPLIMENTARY' ||
        (s.finalAmount !== null &&
          s.finalAmount !== undefined &&
          Number(s.finalAmount) === 0 &&
          s.paymentStatus === 'PAID')
      const tableCharge = Number(
        (hasDiscountOrZeroFinal
          ? Number(s.finalAmount || 0)
          : Number(s.finalAmount) > 0
          ? Number(s.finalAmount)
          : plannedHours * hourlyRate
        ).toFixed(2)
      )

      const tableIsPaid = s.paymentStatus === 'PAID' || tableCharge === 0
      const posOrders = posBySessionId.get(s.id) || []

      // Flatten individual line items for easy display on the player's tab
      const posItems = []
      let posPaidTotal = 0
      let posPendingTotal = 0

      for (const order of posOrders) {
        const orderPaid = order.paymentStatus === 'PAID'
        if (orderPaid) {
          posPaidTotal += order.totalAmount
        } else {
          posPendingTotal += order.totalAmount
        }
        for (const line of order.items) {
          posItems.push({
            ...line,
            posSaleId: order.id,
            saleRef: order.saleRef,
            paymentStatus: order.paymentStatus,
            saleDate: order.saleDate,
          })
        }
      }

      const tablePaidAmount = tableIsPaid ? tableCharge : 0
      const tablePendingAmount = tableIsPaid ? 0 : tableCharge
      const totalPaid = Number((tablePaidAmount + posPaidTotal).toFixed(2))
      const totalPending = Number((tablePendingAmount + posPendingTotal).toFixed(2))
      const grandTotal = Number((totalPaid + totalPending).toFixed(2))

      activeByTableId.set(s.tableId, {
        id: s.id,
        sessionRef: s.sessionRef,
        tableId: s.tableId,
        bookingId: s.bookingId,
        customerId: s.customerId,
        playerName: extractPlayerName(s),
        playerPhone: extractPlayerPhone(s),
        sessionType: s.sessionType,
        isOnlineBooking,
        status: s.status,
        startTime: s.startTime,
        expectedEndTime: s.expectedEndTime,
        durationHours: plannedHours,
        hourlyRate,
        tableCharge,
        discountAmount: Number(s.discountAmount || 0),
        discountReason: s.discountReason || null,
        tablePaymentStatus: tableIsPaid ? 'PAID' : 'UNPAID',
        posOrders,
        posItems,
        posPaidTotal: Number(posPaidTotal.toFixed(2)),
        posPendingTotal: Number(posPendingTotal.toFixed(2)),
        totalPaid,
        totalPending,
        grandTotal,
      })
    }

    const tablesFloor = allTables.map((t) => {
      const activeSession = activeByTableId.get(t.id) || null
      const tableReadyBookings = readyBookingsRaw
        .filter((b) => b.tableId === t.id)
        .map((b) => ({
          id: b.id,
          bookingRef: b.bookingRef,
          customerName: b.customerName,
          phone: b.phone,
          bookingDate: b.bookingDate,
          startTime: b.startTime,
          endTime: b.endTime,
          durationHours: Number(b.durationHours || 1),
          totalAmount: Number(b.totalAmount || 0),
          paymentStatus: b.paymentStatus,
          status: b.status,
        }))

      const { pricingTiers, effectiveHourlyRate } = parseTablePricing(t)

      return {
        id: t.id,
        tableNumber: t.tableNumber,
        name: t.name,
        type: t.type,
        hourlyRate: effectiveHourlyRate || Number(t.hourlyRate || 200),
        pricingTiers,
        status: activeSession ? 'OCCUPIED' : t.status === 'OCCUPIED' ? 'AVAILABLE' : t.status,
        activeSession,
        readyBookings: tableReadyBookings,
      }
    })

    // Ensure Loyalty Program & Milestone Rules exist
    const loyaltyProgram = await ensureDefaultLoyaltyProgram()
    const loyaltyRulesRaw = await prisma.rewardRule.findMany({
      orderBy: [{ sortOrder: 'asc' }, { hoursRequired: 'asc' }],
    })
    const loyaltyRules = loyaltyRulesRaw.map((r) => ({
      id: r.id,
      name: r.name,
      hoursRequired: Number(r.hoursRequired),
      bonusHours: Number(r.bonusHours),
      validForDays: r.validForDays || 90,
      isActive: Boolean(r.isActive),
    }))

    // Auto-backfill any unlinked Bookings or GamingSessions that have a player name/phone
    // into User + CustomerProfile (strictly deduplicated by phone number)
    const [unlinkedBookings, unlinkedSessions] = await Promise.all([
      prisma.booking.findMany({
        where: { customerId: null },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.gamingSession.findMany({
        where: { customerId: null },
        take: 30,
        orderBy: { startTime: 'desc' },
      }),
    ])

    for (const b of unlinkedBookings) {
      if (b.phone || b.customerName) {
        const cid = await resolveOrCreateCustomer({
          customerName: b.customerName,
          customerPhone: b.phone,
          customerEmail: b.email,
        })
        if (cid) {
          await prisma.booking.update({
            where: { id: b.id },
            data: { customerId: cid },
          })
          await syncCustomerStatsAndLoyalty(cid)
        }
      }
    }

    for (const gs of unlinkedSessions) {
      const pName = extractPlayerName(gs)
      const pPhone = extractPlayerPhone(gs)
      if (pPhone || (pName && pName !== 'Walk-in Player' && pName !== 'Player')) {
        const cid = await resolveOrCreateCustomer({
          customerName: pName,
          customerPhone: pPhone,
        })
        if (cid) {
          await prisma.gamingSession.update({
            where: { id: gs.id },
            data: { customerId: cid },
          })
          await syncCustomerStatsAndLoyalty(cid, gs.id)
        }
      }
    }

    // Ensure any client with playing hours has their stats synced & milestone rewards evaluated
    const allProfiles = await prisma.customerProfile.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true, gamingSessions: true } },
      },
    })

    const savedClients = []
    for (const cp of allProfiles) {
      const breakdown = await getCustomerHoursBreakdown(cp.id)
      if (
        Number(cp.totalPlayingHours || 0) !== breakdown.lifetimeTotalHours ||
        Number(cp.lifetimeSpending || 0) !== breakdown.lifetimeSpending
      ) {
        await prisma.customerProfile.update({
          where: { id: cp.id },
          data: {
            totalPlayingHours: breakdown.lifetimeTotalHours,
            lifetimeSpending: breakdown.lifetimeSpending,
          },
        })
      }
      const { profile: refreshed } = await checkAndIssueRewards(cp.id)

      const rawEmail = cp.user?.email || ''
      const isSyntheticEmail =
        rawEmail.endsWith('@cueclub.com') || rawEmail.endsWith('@cueclub.local')
      savedClients.push({
        id: cp.id,
        userId: cp.userId,
        name: cp.user?.name || 'Client',
        phone: cp.phone || '',
        email: isSyntheticEmail ? '' : rawEmail,
        membershipTier: refreshed?.membershipTier || cp.membershipTier || 'BRONZE',
        // milestoneCycleHours resets to 0 whenever the client claims/redeems their bonus hour
        milestoneCycleHours: breakdown.milestoneCycleHours,
        totalPlayingHours: breakdown.milestoneCycleHours,
        // lifetimeTotalHours never resets and is shown in the Customers Directory
        lifetimeTotalHours: breakdown.lifetimeTotalHours,
        rewardBalance: Number(refreshed?.rewardBalance ?? cp.rewardBalance ?? 0),
        lifetimeSpending: breakdown.lifetimeSpending,
        visitsCount:
          (cp._count?.bookings || 0) + (cp._count?.gamingSessions || 0),
      })
    }

    return NextResponse.json({
      stats: {
        totalBookings,
        todayBookings,
        totalRevenue: Number(revenueResult._sum.amount ?? 0),
        todayRevenue: Number(todayRevenueResult._sum.amount ?? 0),
        activeTables: allTables.length,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        activeSessions: activeSessionsRaw.length,
      },
      tables: tablesFloor,
      recentBookings,
      products: productsRaw.map(serializeProduct),
      categories,
      savedClients,
      loyaltyRules,
      loyaltyProgramId: loyaltyProgram?.id || 'default-loyalty',
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/dashboard
 * Handles interactive Live Table Floor actions:
 *  - START_TABLE_SESSION (Walk-in player or Online booking check-in)
 *  - EXTEND_TABLE_SESSION (+0.5h / +1h)
 *  - ADD_TABLE_POS_ITEM (Add POS product to player's table tab as UNPAID / Pending)
 *  - REMOVE_TABLE_POS_ITEM (Void item from player's table tab and restore stock)
 *  - MARK_PAID (Mark Table, POS items, or All as PAID — with optional endSession)
 *  - END_TABLE_SESSION (Finish session & free table back to AVAILABLE)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    // 0. SAVE_LOYALTY_RULE (Configure milestone hours -> bonus hours directly on Dashboard)
    if (action === 'SAVE_LOYALTY_RULE') {
      const {
        id,
        name,
        hoursRequired,
        bonusHours,
        validForDays = 90,
        isActive = true,
      } = body

      if (!name || Number(hoursRequired) <= 0 || Number(bonusHours) <= 0) {
        return NextResponse.json(
          { error: 'Please provide rule name, required hours (>0), and bonus hours (>0)' },
          { status: 400 }
        )
      }

      const program = await ensureDefaultLoyaltyProgram()
      let savedRule
      if (id) {
        savedRule = await prisma.rewardRule.update({
          where: { id },
          data: {
            name: String(name).trim(),
            hoursRequired: Number(hoursRequired),
            bonusHours: Number(bonusHours),
            validForDays: Number(validForDays || 90),
            isActive: Boolean(isActive),
          },
        })
      } else {
        savedRule = await prisma.rewardRule.create({
          data: {
            programId: program.id,
            name: String(name).trim(),
            hoursRequired: Number(hoursRequired),
            bonusHours: Number(bonusHours),
            validForDays: Number(validForDays || 90),
            isActive: Boolean(isActive),
            sortOrder: 1,
          },
        })
      }

      // Re-evaluate all customers with playing hours against the updated milestone rule
      const profiles = await prisma.customerProfile.findMany({
        where: { totalPlayingHours: { gt: 0 } },
        select: { id: true },
      })
      for (const p of profiles) {
        await checkAndIssueRewards(p.id)
      }

      return NextResponse.json({ rule: savedRule })
    }

    // 0B. GRANT_LOYALTY_REWARD (Quick grant/redeem bonus hours from Dashboard)
    if (action === 'GRANT_LOYALTY_REWARD') {
      const {
        customerId,
        actionType = 'GRANT',
        hours = 1,
        reason = 'Bonus reward granted from Live Dashboard',
      } = body
      const updatedProfile = await adjustCustomerRewards({
        customerId,
        actionType,
        hours: Number(hours || 1),
        reason,
        staffUserId: session.user.id,
      })
      return NextResponse.json({ profile: updatedProfile })
    }

    // 1. START_TABLE_SESSION
    if (action === 'START_TABLE_SESSION') {
      const {
        tableId,
        bookingId,
        customerId = null,
        playerName,
        playerPhone,
        playerEmail,
        durationHours = 1,
        customTablePrice = null,
        saveTableHourlyRate = null,
        redeemRewardHours = 0,
        sessionType = 'WALK_IN',
        isPrepaid = false,
      } = body

      if (!bookingId && (!playerName || !String(playerName).trim())) {
        return NextResponse.json(
          { error: 'Please enter the player name to start the table' },
          { status: 400 }
        )
      }

      if (
        tableId &&
        saveTableHourlyRate !== null &&
        saveTableHourlyRate !== undefined &&
        Number(saveTableHourlyRate) > 0
      ) {
        await prisma.table.update({
          where: { id: tableId },
          data: { hourlyRate: Number(Number(saveTableHourlyRate).toFixed(2)) },
        })
      }

      const rawDigits = playerPhone ? String(playerPhone).replace(/\D/g, '') : ''
      const cleanPhone =
        rawDigits.length >= 10
          ? rawDigits.slice(-10)
          : rawDigits.length >= 6
          ? rawDigits
          : null
      const cleanEmail = playerEmail
        ? String(playerEmail).trim().toLowerCase()
        : null

      // Check if phone, email, or name already exists before starting so we can inform the UI
      let existingClient = null
      if (cleanPhone) {
        existingClient = await prisma.customerProfile.findFirst({
          where: {
            OR: [{ phone: cleanPhone }, { phone: { endsWith: cleanPhone } }],
          },
          include: { user: true },
        })
      }
      if (!existingClient && cleanEmail) {
        const byEmail = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: { customerProfile: true },
        })
        if (byEmail?.customerProfile) {
          existingClient = byEmail.customerProfile
        }
      }
      if (!existingClient && playerName) {
        existingClient = await prisma.customerProfile.findFirst({
          where: {
            user: {
              name: { equals: String(playerName).trim() },
              role: 'CUSTOMER',
            },
          },
          include: { user: true },
        })
      }

      const started = await startGamingSession({
        tableId,
        bookingId: bookingId || null,
        customerId: customerId || existingClient?.id || null,
        customerName: playerName ? String(playerName).trim() : null,
        customerPhone: cleanPhone || (playerPhone ? String(playerPhone).trim() : null),
        customerEmail: cleanEmail,
        sessionType: bookingId
          ? 'ONLINE_BOOKING'
          : isPrepaid
          ? 'PREPAID'
          : sessionType,
        expectedDurationHours: Number(durationHours || 1),
        customTablePrice,
        redeemRewardHours: Number(redeemRewardHours || 0),
        notes: playerName
          ? `Guest: ${String(playerName).trim()}${cleanPhone ? ` (${cleanPhone})` : ''}`
          : null,
        staffUserId: session.user.id,
        ipAddress,
        userAgent,
      })

      return NextResponse.json(
        {
          session: started,
          isExistingClient: Boolean(existingClient || customerId),
          redeemedReward: Number(started.discountAmount || 0) > 0,
        },
        { status: 201 }
      )
    }

    // 1B. UPDATE_TABLE_RATE (Save a new default hourly rate for a table)
    if (action === 'UPDATE_TABLE_RATE') {
      const { tableId, hourlyRate } = body
      if (!tableId || Number(hourlyRate) <= 0) {
        return NextResponse.json(
          { error: 'Valid tableId and hourlyRate (>0) are required' },
          { status: 400 }
        )
      }
      const updatedTable = await prisma.table.update({
        where: { id: tableId },
        data: { hourlyRate: Number(Number(hourlyRate).toFixed(2)) },
      })
      return NextResponse.json({ table: updatedTable })
    }

    // 1C. UPDATE_SESSION_DURATION_PRICE (Modify active session's Duration and/or Table Price)
    if (action === 'UPDATE_SESSION_DURATION_PRICE') {
      const { sessionId, durationHours, tablePrice } = body
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        )
      }

      const existingSess = await prisma.gamingSession.findUnique({
        where: { id: sessionId },
        include: { table: true },
      })
      if (!existingSess) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      const newDuration = Math.max(
        0.1,
        Number(durationHours ?? existingSess.actualDuration ?? 1)
      )
      const hasCustomPrice =
        tablePrice !== null &&
        tablePrice !== undefined &&
        tablePrice !== '' &&
        !Number.isNaN(Number(tablePrice)) &&
        Number(tablePrice) >= 0

      const newCharge = hasCustomPrice
        ? Number(Number(tablePrice).toFixed(2))
        : Number(
            (
              newDuration *
              Number(existingSess.hourlyRate || existingSess.table?.hourlyRate || 200)
            ).toFixed(2)
          )

      const newHourlyRate =
        newDuration > 0
          ? Number((newCharge / newDuration).toFixed(2))
          : Number(existingSess.hourlyRate || 200)

      const startMs = existingSess.startTime
        ? new Date(existingSess.startTime).getTime()
        : Date.now()
      const newExpectedEnd = new Date(startMs + newDuration * 3600000)

      const updatedSess = await prisma.gamingSession.update({
        where: { id: sessionId },
        data: {
          actualDuration: newDuration,
          expectedEndTime: newExpectedEnd,
          hourlyRate: newHourlyRate,
          totalCharge: newCharge,
          finalAmount: newCharge,
          ...(newCharge === 0 ? { paymentStatus: 'PAID' } : {}),
        },
      })

      if (existingSess.customerId) {
        await syncCustomerStatsAndLoyalty(existingSess.customerId, sessionId)
      }

      return NextResponse.json({ session: updatedSess })
    }

    // 2. EXTEND_TABLE_SESSION
    if (action === 'EXTEND_TABLE_SESSION') {
      const { sessionId, additionalHours = 0.5 } = body
      const extended = await extendGamingSession({
        sessionId,
        additionalHours: Number(additionalHours),
        reason: 'Extended from Live Table Dashboard',
        staffUserId: session.user.id,
      })
      return NextResponse.json({ session: extended })
    }

    // 2B. TOGGLE_PAUSE_SESSION
    if (action === 'TOGGLE_PAUSE_SESSION') {
      const { sessionId } = body
      const toggled = await togglePauseGamingSession({
        sessionId,
        reason: 'Toggled from Live Table Dashboard',
        staffUserId: session.user.id,
      })
      return NextResponse.json({ session: toggled })
    }

    // 3. ADD_TABLE_POS_ITEM
    if (action === 'ADD_TABLE_POS_ITEM') {
      const {
        sessionId,
        productId,
        quantity = 1,
        customUnitPrice = null,
        markPaidImmediately = false,
      } = body

      if (!sessionId || !productId) {
        return NextResponse.json(
          { error: 'sessionId and productId are required' },
          { status: 400 }
        )
      }

      const qty = Math.max(1, Number(quantity || 1))

      const createdPosOrder = await prisma.$transaction(async (tx) => {
        const gamingSess = await tx.gamingSession.findUnique({
          where: { id: sessionId },
        })
        if (!gamingSess) {
          const err = new Error('Active table session not found')
          err.status = 404
          throw err
        }

        const product = await tx.product.findUnique({
          where: { id: productId },
        })
        if (!product) {
          const err = new Error('Product not found')
          err.status = 404
          throw err
        }

        const unitPrice =
          customUnitPrice !== null &&
          customUnitPrice !== undefined &&
          Number(customUnitPrice) >= 0
            ? Number(customUnitPrice)
            : Number(product.sellingPrice)
        const totalPrice = Number((unitPrice * qty).toFixed(2))

        // Deduct stock immediately
        await recordStockMovement({
          productId: product.id,
          movementType: 'SALE',
          quantity: qty,
          reason: `Table Session POS Tab (${gamingSess.sessionRef.slice(-6).toUpperCase()})`,
          referenceId: gamingSess.id,
          referenceType: 'GamingSessionPOS',
          createdBy: session.user.id,
          tx,
        })

        const now = new Date()
        const saleRef = `TAB-${now.getHours()}${now.getMinutes()}-${Math.floor(
          1000 + Math.random() * 9000
        )}`

        // IMPORTANT: Do NOT attach customerId or modify Booking.totalAmount so
        // table POS items never pollute the online booking cost or customer portal dashboard!
        const sale = await tx.pOSSale.create({
          data: {
            saleRef,
            customerId: null,
            subtotal: totalPrice,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: totalPrice,
            paymentMethod: 'CASH',
            paymentStatus: markPaidImmediately ? 'PAID' : 'UNPAID',
            notes: `SESSION_TAB:${sessionId}`,
            items: {
              create: [
                {
                  productId: product.id,
                  quantity: qty,
                  unitPrice,
                  discount: 0,
                  totalPrice,
                },
              ],
            },
          },
          include: {
            items: { include: { product: true } },
          },
        })

        if (markPaidImmediately && totalPrice > 0) {
          await tx.payment.create({
            data: {
              amount: totalPrice,
              currency: 'INR',
              status: 'PAID',
              paymentType: 'POS_SALE',
              paymentMethod: 'CASH',
              paidAt: now,
              metadata: JSON.stringify({
                saleId: sale.id,
                saleRef: sale.saleRef,
                sessionId,
              }),
            },
          })
        }

        return sale
      })

      return NextResponse.json({ posOrder: createdPosOrder }, { status: 201 })
    }

    // 4. REMOVE_TABLE_POS_ITEM
    if (action === 'REMOVE_TABLE_POS_ITEM') {
      const { posSaleId } = body
      if (!posSaleId) {
        return NextResponse.json(
          { error: 'posSaleId is required' },
          { status: 400 }
        )
      }

      await prisma.$transaction(async (tx) => {
        const sale = await tx.pOSSale.findUnique({
          where: { id: posSaleId },
          include: { items: true },
        })
        if (!sale || sale.voidedAt) return

        for (const item of sale.items) {
          await recordStockMovement({
            productId: item.productId,
            movementType: 'RETURN',
            quantity: Number(item.quantity),
            reason: `Removed item from Table POS Tab (${sale.saleRef})`,
            referenceId: sale.id,
            referenceType: 'POSSale',
            createdBy: session.user.id,
            tx,
          })
        }

        await tx.pOSSale.update({
          where: { id: posSaleId },
          data: {
            voidedAt: new Date(),
            voidReason: 'Removed from Table POS Tab',
            paymentStatus: 'REFUNDED',
          },
        })
      })

      return NextResponse.json({ success: true })
    }

    // 5. MARK_PAID (Mark Table Charge, POS Tab items, or Both as PAID)
    if (action === 'MARK_PAID') {
      const {
        sessionId,
        scope = 'ALL', // 'ALL' | 'TABLE_ONLY' | 'POS_ONLY' | 'SINGLE_POS'
        posSaleId = null,
        paymentMethod = 'CASH',
        endSession = false,
      } = body

      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        )
      }

      const now = new Date()

      await prisma.$transaction(async (tx) => {
        const gamingSess = await tx.gamingSession.findUnique({
          where: { id: sessionId },
          include: { table: true },
        })
        if (!gamingSess) {
          const err = new Error('Session not found')
          err.status = 404
          throw err
        }

        // A. Settle Table Charge if requested and currently UNPAID
        if (
          (scope === 'ALL' || scope === 'TABLE_ONLY') &&
          gamingSess.paymentStatus !== 'PAID'
        ) {
          const plannedHours = Math.max(0.5, Number(gamingSess.actualDuration || 1))
          const hourlyRate = Number(gamingSess.hourlyRate || gamingSess.table?.hourlyRate || 200)
          const tableAmount = Number(
            (Number(gamingSess.finalAmount) > 0
              ? Number(gamingSess.finalAmount)
              : plannedHours * hourlyRate
            ).toFixed(2)
          )

          await tx.gamingSession.update({
            where: { id: sessionId },
            data: {
              paymentStatus: 'PAID',
              paymentMethod,
              totalCharge: tableAmount,
              finalAmount: tableAmount,
            },
          })

          if (tableAmount > 0) {
            await tx.payment.create({
              data: {
                bookingId: gamingSess.bookingId || null,
                amount: tableAmount,
                currency: 'INR',
                status: 'PAID',
                paymentType: 'SESSION_PAYMENT',
                paymentMethod,
                paidAt: now,
                metadata: JSON.stringify({
                  sessionId: gamingSess.id,
                  sessionRef: gamingSess.sessionRef,
                  tableName: gamingSess.table?.name,
                }),
              },
            })
          }
        }

        // B. Settle POS Tab items if requested
        if (scope === 'ALL' || scope === 'POS_ONLY' || scope === 'SINGLE_POS') {
          const whereClause =
            scope === 'SINGLE_POS' && posSaleId
              ? { id: posSaleId, voidedAt: null, paymentStatus: { not: 'PAID' } }
              : {
                  notes: { startsWith: `SESSION_TAB:${sessionId}` },
                  voidedAt: null,
                  paymentStatus: { not: 'PAID' },
                }

          const unpaidPosSales = await tx.pOSSale.findMany({
            where: whereClause,
          })

          for (const sale of unpaidPosSales) {
            await tx.pOSSale.update({
              where: { id: sale.id },
              data: {
                paymentStatus: 'PAID',
                paymentMethod,
              },
            })

            const amt = Number(sale.totalAmount || 0)
            if (amt > 0) {
              await tx.payment.create({
                data: {
                  amount: amt,
                  currency: 'INR',
                  status: 'PAID',
                  paymentType: 'POS_SALE',
                  paymentMethod,
                  paidAt: now,
                  metadata: JSON.stringify({
                    saleId: sale.id,
                    saleRef: sale.saleRef,
                    sessionId,
                  }),
                },
              })
            }
          }
        }
      })

      const currentSess = await prisma.gamingSession.findUnique({
        where: { id: sessionId },
      })

      if (endSession) {
        await stopGamingSession({
          sessionId,
          overrideDurationHours: Number(currentSess?.actualDuration || 1),
          paymentMethod,
          paymentStatus: 'PAID',
          staffUserId: session.user.id,
          ipAddress,
          userAgent,
        })
      } else if (currentSess?.customerId) {
        await syncCustomerStatsAndLoyalty(currentSess.customerId, sessionId)
      }

      await createAuditLog({
        userId: session.user.id,
        action: 'TABLE_ACCOUNT_MARKED_PAID',
        entityType: 'GamingSession',
        entityId: sessionId,
        newValues: { scope, paymentMethod, endSession },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ success: true })
    }

    // 6. END_TABLE_SESSION (Complete session and free table to AVAILABLE)
    if (action === 'END_TABLE_SESSION') {
      const { sessionId, paymentMethod = 'CASH' } = body
      const currentSess = await prisma.gamingSession.findUnique({
        where: { id: sessionId },
      })
      if (!currentSess) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      const stopped = await stopGamingSession({
        sessionId,
        overrideDurationHours: Number(currentSess.actualDuration || 1),
        paymentMethod,
        paymentStatus: 'PAID',
        staffUserId: session.user.id,
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ session: stopped.session })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in Dashboard Floor action:', error)
    return NextResponse.json(
      { error: error.message || 'Operation failed' },
      { status: error.status || 500 }
    )
  }
}
