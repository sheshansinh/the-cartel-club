/**
 * Gaming Session Lifecycle Service (Module E)
 *
 * Enforces:
 * - Single ACTIVE/PAUSED session per table constraint
 * - Table status transitions (AVAILABLE <-> OCCUPIED)
 * - Walk-in customer auto-registration (name + phone -> CustomerProfile)
 * - Session extensions recorded in SessionAdjustment
 * - Exact duration & charge calculation on completion
 * - Automatic CustomerProfile.totalPlayingHours increment + Loyalty check
 * - Abandoned session (>24h active) detection and manual resolution
 */

import { prisma } from '@/lib/prisma'
import {
  checkAndIssueRewards,
  redeemCustomerRewards,
  getCustomerHoursBreakdown,
} from '@/lib/services/loyalty'
import { getTablePriceForDuration } from '@/lib/services/table-pricing'
import { logAudit } from '@/lib/services/audit'

/**
 * Resolve or create a CustomerProfile + User record.
 * - Strictly deduplicates by phone number first: if the phone number already exists,
 *   it reuses the existing User + CustomerProfile (no duplicate entry).
 * - Only when the phone number is NOT saved (unique) does it create a new User (role: CUSTOMER)
 *   and CustomerProfile row so the client is saved for re-entry and loyalty tracking.
 */
export async function resolveOrCreateCustomer({
  customerId,
  customerName,
  customerPhone,
  customerEmail,
}) {
  const cleanName = customerName ? String(customerName).trim() : null
  const rawDigits = customerPhone ? String(customerPhone).replace(/\D/g, '') : ''
  const cleanPhone =
    rawDigits.length >= 10
      ? rawDigits.slice(-10)
      : rawDigits.length >= 6
      ? rawDigits
      : null
  const cleanEmail = customerEmail ? String(customerEmail).trim().toLowerCase() : null

  // 1. If explicit customerId is passed, verify it exists — unless a different profile
  // already owns cleanPhone (e.g. a Walk-in client who played 5h under their phone and later signed in with Google)
  if (customerId) {
    const existing = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      include: { user: true },
    })
    if (existing) {
      if (cleanPhone && existing.phone !== cleanPhone) {
        const phoneOwner = await prisma.customerProfile.findFirst({
          where: {
            id: { not: existing.id },
            OR: [{ phone: cleanPhone }, { phone: { endsWith: cleanPhone } }],
          },
        })
        if (phoneOwner) {
          return phoneOwner.id
        }
      }
      if (cleanPhone && !existing.phone) {
        await prisma.customerProfile.update({
          where: { id: existing.id },
          data: { phone: cleanPhone },
        })
      }
      const userUpdates = {}
      if (
        cleanName &&
        existing.user &&
        (!existing.user.name || existing.user.name === 'Customer')
      ) {
        userUpdates.name = cleanName
      }
      if (
        cleanEmail &&
        existing.user?.email &&
        (existing.user.email.endsWith('@cueclub.com') ||
          existing.user.email.endsWith('@cueclub.local'))
      ) {
        const emailTaken = await prisma.user.findUnique({
          where: { email: cleanEmail },
        })
        if (!emailTaken) userUpdates.email = cleanEmail
      }
      if (Object.keys(userUpdates).length > 0) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: userUpdates,
        })
      }
      return existing.id
    }
  }

  // 2. Check by phone number FIRST (Strict Phone Uniqueness Rule)
  if (cleanPhone) {
    const byPhone = await prisma.customerProfile.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { phone: { endsWith: cleanPhone } }],
      },
      include: { user: true },
    })

    if (byPhone) {
      // Phone already saved! Reuse this client and keep name/phone/email clean
      if (byPhone.phone !== cleanPhone) {
        await prisma.customerProfile.update({
          where: { id: byPhone.id },
          data: { phone: cleanPhone },
        })
      }
      const userUpdates = {}
      if (cleanName && byPhone.user && byPhone.user.name !== cleanName) {
        userUpdates.name = cleanName
      }
      if (
        cleanEmail &&
        byPhone.user?.email &&
        (byPhone.user.email.endsWith('@cueclub.com') ||
          byPhone.user.email.endsWith('@cueclub.local'))
      ) {
        const emailTaken = await prisma.user.findUnique({
          where: { email: cleanEmail },
        })
        if (!emailTaken) userUpdates.email = cleanEmail
      }
      if (Object.keys(userUpdates).length > 0) {
        await prisma.user.update({
          where: { id: byPhone.userId },
          data: userUpdates,
        })
      }
      return byPhone.id
    }
  }

  // 3. Check by email if provided (or deterministic client phone email)
  const fallbackClientEmail = cleanPhone
    ? `client.${cleanPhone}@cueclub.com`
    : null
  const emailCandidates = [cleanEmail, fallbackClientEmail].filter(Boolean)

  if (emailCandidates.length > 0) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { in: emailCandidates } },
      include: { customerProfile: true },
    })
    if (byEmail) {
      if (cleanName && byEmail.name !== cleanName) {
        await prisma.user.update({
          where: { id: byEmail.id },
          data: { name: cleanName },
        })
      }
      if (byEmail.customerProfile) {
        if (cleanPhone && byEmail.customerProfile.phone !== cleanPhone) {
          await prisma.customerProfile.update({
            where: { id: byEmail.customerProfile.id },
            data: { phone: cleanPhone },
          })
        }
        return byEmail.customerProfile.id
      }
      const createdProf = await prisma.customerProfile.create({
        data: {
          userId: byEmail.id,
          phone: cleanPhone || null,
          phoneVerified: Boolean(cleanPhone),
          notes: 'Saved Club Client',
        },
      })
      return createdProf.id
    }
  }

  // 4. Phone number is unique & not saved yet: create a new User + CustomerProfile
  if (cleanPhone || cleanName) {
    // If no phone was provided, check if a walk-in client with the exact same name exists
    if (!cleanPhone && cleanName) {
      const byExactName = await prisma.customerProfile.findFirst({
        where: {
          user: {
            name: { equals: cleanName },
            role: 'CUSTOMER',
          },
        },
      })
      if (byExactName) return byExactName.id
    }

    const uniqueEmail =
      cleanEmail ||
      fallbackClientEmail ||
      `walkin.${Date.now()}.${Math.floor(100 + Math.random() * 900)}@cueclub.com`

    const newUser = await prisma.user.create({
      data: {
        name: cleanName || `Client ${cleanPhone}`,
        email: uniqueEmail,
        role: 'CUSTOMER',
        customerProfile: {
          create: {
            phone: cleanPhone || null,
            phoneVerified: Boolean(cleanPhone),
            notes: 'Saved Club Client (Walk-in / Online)',
          },
        },
      },
      include: { customerProfile: true },
    })

    return newUser.customerProfile?.id || null
  }

  return null
}

/**
 * Recalculates a client's totalPlayingHours (lifetime total hours for Customers Directory),
 * lifetimeSpending, and triggers Loyalty milestone checks against their current cycle hours.
 */
export async function syncCustomerStatsAndLoyalty(customerId, sessionId = null) {
  if (!customerId) return { issuedRewards: [] }

  const breakdown = await getCustomerHoursBreakdown(customerId)

  await prisma.customerProfile.update({
    where: { id: customerId },
    data: {
      totalPlayingHours: breakdown.lifetimeTotalHours,
      lifetimeSpending: breakdown.lifetimeSpending,
    },
  })

  return checkAndIssueRewards(customerId, sessionId)
}

/**
 * Start a new gaming session on a table.
 */
export async function startGamingSession({
  tableId,
  bookingId = null,
  customerId = null,
  customerName = null,
  customerPhone = null,
  customerEmail = null,
  sessionType = 'WALK_IN',
  expectedDurationHours = 1,
  customTablePrice = null,
  redeemRewardHours = 0,
  notes = null,
  staffUserId = null,
  ipAddress = null,
  userAgent = null,
}) {
  if (!tableId && !bookingId) {
    const err = new Error('tableId or bookingId is required to start a session')
    err.status = 400
    throw err
  }

  let linkedBooking = null
  if (bookingId) {
    linkedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { table: true },
    })
    if (!linkedBooking) {
      const err = new Error('Linked booking not found')
      err.status = 404
      throw err
    }
    tableId = linkedBooking.tableId
    customerId = customerId || linkedBooking.customerId
    customerName = customerName || linkedBooking.customerName
    customerPhone = customerPhone || linkedBooking.phone
    customerEmail = customerEmail || linkedBooking.email
    sessionType = 'ONLINE_BOOKING'
    expectedDurationHours = Number(linkedBooking.durationHours || expectedDurationHours || 1)
  }

  const table = await prisma.table.findUnique({ where: { id: tableId } })
  if (!table || !table.isActive) {
    const err = new Error('Table not found or inactive')
    err.status = 404
    throw err
  }

  if (table.status === 'MAINTENANCE' || table.status === 'INACTIVE') {
    const err = new Error(`Table ${table.name} is currently under ${table.status}`)
    err.status = 400
    throw err
  }

  // Resolve employeeId if staffUserId has an EmployeeProfile
  let employeeId = null
  if (staffUserId) {
    const emp = await prisma.employeeProfile.findUnique({
      where: { userId: staffUserId },
      select: { id: true },
    })
    employeeId = emp?.id || null
  }

  const resolvedCustomerId = await resolveOrCreateCustomer({
    customerId,
    customerName,
    customerPhone,
    customerEmail,
  })

  // Ensure any earned milestone rewards are up-to-date before checking rewardBalance
  if (resolvedCustomerId) {
    await checkAndIssueRewards(resolvedCustomerId)
  }

  const now = new Date()
  const durationHrs = Math.max(0.1, Number(expectedDurationHours) || 1)
  const expectedEndTime = new Date(now.getTime() + durationHrs * 60 * 60 * 1000)

  const hasCustomPrice =
    customTablePrice !== null &&
    customTablePrice !== undefined &&
    customTablePrice !== '' &&
    !Number.isNaN(Number(customTablePrice)) &&
    Number(customTablePrice) >= 0

  const baseTotalCharge =
    sessionType === 'COMPLIMENTARY'
      ? 0
      : hasCustomPrice
      ? Number(Number(customTablePrice).toFixed(2))
      : getTablePriceForDuration(table, durationHrs)

  const hourlyRate =
    sessionType === 'COMPLIMENTARY'
      ? 0
      : durationHrs > 0
      ? Number((baseTotalCharge / durationHrs).toFixed(2))
      : Number(table.hourlyRate)

  // Calculate loyalty reward redemption if requested or if linked online booking used a free reward
  let hoursToRedeemNow = 0
  let sessionDiscountAmount = 0
  let sessionDiscountReason = null

  if (linkedBooking) {
    const bookingTotal = Number(linkedBooking.totalAmount ?? baseTotalCharge)
    if (bookingTotal < baseTotalCharge) {
      sessionDiscountAmount = Number((baseTotalCharge - bookingTotal).toFixed(2))
      sessionDiscountReason = 'Online Booking Loyalty Gift Reward Applied'
    }
  } else if (resolvedCustomerId && Number(redeemRewardHours) > 0) {
    const custProfile = await prisma.customerProfile.findUnique({
      where: { id: resolvedCustomerId },
      select: { rewardBalance: true },
    })
    const availableReward = Number(custProfile?.rewardBalance || 0)
    hoursToRedeemNow = Math.min(Number(redeemRewardHours), availableReward, durationHrs)
    if (hoursToRedeemNow > 0) {
      sessionDiscountAmount = Math.min(
        baseTotalCharge,
        Number((hoursToRedeemNow * hourlyRate).toFixed(2))
      )
      sessionDiscountReason = `Loyalty Reward Applied (${hoursToRedeemNow}h Free)`
    }
  }

  const finalSessionAmount = Math.max(
    0,
    Number((baseTotalCharge - sessionDiscountAmount).toFixed(2))
  )

  const session = await prisma.$transaction(async (tx) => {
    // Enforce: only one ACTIVE or PAUSED session per table at a time
    const existingActive = await tx.gamingSession.findFirst({
      where: {
        tableId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    })

    if (existingActive) {
      const conflictErr = new Error(
        `Table ${table.name} already has an active session (#${existingActive.sessionRef.slice(-6).toUpperCase()})`
      )
      conflictErr.status = 409
      throw conflictErr
    }

    // Mark table as OCCUPIED
    await tx.table.update({
      where: { id: tableId },
      data: { status: 'OCCUPIED' },
    })

    // If started from a booking, transition booking to IN_PROGRESS
    if (linkedBooking && linkedBooking.status !== 'IN_PROGRESS') {
      const oldStatus = linkedBooking.status
      await tx.booking.update({
        where: { id: linkedBooking.id },
        data: {
          status: 'IN_PROGRESS',
          checkedInAt: linkedBooking.checkedInAt || now,
          ...(resolvedCustomerId && !linkedBooking.customerId
            ? { customerId: resolvedCustomerId }
            : {}),
        },
      })

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: linkedBooking.id,
          oldStatus,
          newStatus: 'IN_PROGRESS',
          changedBy: staffUserId || null,
          reason: 'Gaming session started',
        },
      })
    }

    const notePrefix =
      !resolvedCustomerId && customerName
        ? `Guest: ${customerName}${customerPhone ? ` (${customerPhone})` : ''}`
        : ''
    const rewardNote =
      hoursToRedeemNow > 0
        ? `[FREE_REWARD:${hoursToRedeemNow}h]`
        : sessionDiscountAmount > 0
        ? `[ONLINE_REWARD]`
        : ''
    const combinedNotes =
      [notePrefix, notes, rewardNote].filter(Boolean).join(' — ') || null

    return tx.gamingSession.create({
      data: {
        customerId: resolvedCustomerId,
        employeeId,
        tableId,
        bookingId: linkedBooking ? linkedBooking.id : null,
        sessionType,
        status: 'ACTIVE',
        startTime: now,
        expectedEndTime,
        actualDuration: durationHrs,
        hourlyRate,
        totalCharge: baseTotalCharge,
        discountAmount: sessionDiscountAmount,
        discountReason: sessionDiscountReason,
        finalAmount: finalSessionAmount,
        paymentStatus:
          finalSessionAmount === 0 ||
          sessionType === 'COMPLIMENTARY' ||
          sessionType === 'PREPAID' ||
          linkedBooking?.paymentStatus === 'PAID'
            ? 'PAID'
            : 'UNPAID',
        notes: combinedNotes,
      },
      include: {
        table: true,
        customer: { include: { user: { select: { id: true, name: true, email: true } } } },
        booking: true,
        adjustments: true,
      },
    })
  })

  if (resolvedCustomerId && hoursToRedeemNow > 0) {
    await redeemCustomerRewards({
      customerId: resolvedCustomerId,
      hoursToRedeem: hoursToRedeemNow,
      sessionId: session.id,
      staffUserId,
      reason: `Redeemed ${hoursToRedeemNow}h Free Loyalty Reward on ${table.name}`,
    })
  }

  if (resolvedCustomerId) {
    await syncCustomerStatsAndLoyalty(resolvedCustomerId, session.id)
  }

  if (staffUserId) {
    await logAudit({
      userId: staffUserId,
      action: 'SESSION_STARTED',
      module: 'SESSIONS',
      entityId: session.id,
      entityType: 'GamingSession',
      changes: {
        tableId,
        tableName: table.name,
        sessionType,
        customerId: resolvedCustomerId,
        expectedDurationHours: durationHrs,
      },
      ipAddress,
      userAgent,
    })
  }

  return decorateSession(session)
}

/**
 * Extend a running gaming session and create a SessionAdjustment record.
 */
export async function extendGamingSession({
  sessionId,
  additionalHours = 0.5,
  reason = 'Customer requested extension',
  staffUserId = null,
}) {
  const addHrs = Number(additionalHours)
  if (!addHrs || addHrs <= 0) {
    const err = new Error('additionalHours must be positive')
    err.status = 400
    throw err
  }

  const session = await prisma.gamingSession.findUnique({
    where: { id: sessionId },
    include: { table: true },
  })

  if (!session) {
    const err = new Error('Session not found')
    err.status = 404
    throw err
  }

  if (!['ACTIVE', 'PAUSED'].includes(session.status)) {
    const err = new Error(`Cannot extend a session with status ${session.status}`)
    err.status = 400
    throw err
  }

  const oldDuration = Number(
    session.actualDuration ||
      (session.expectedEndTime
        ? (new Date(session.expectedEndTime).getTime() - new Date(session.startTime).getTime()) /
          3600000
        : 1)
  )
  const newDuration = Number((oldDuration + addHrs).toFixed(2))
  const baseExpected = session.expectedEndTime
    ? new Date(session.expectedEndTime)
    : new Date(new Date(session.startTime).getTime() + oldDuration * 3600000)
  const newExpectedEndTime = new Date(baseExpected.getTime() + addHrs * 3600000)

  const newTotalCharge = Number((newDuration * Number(session.hourlyRate)).toFixed(2))
  const newFinalAmount = Math.max(
    0,
    Number((newTotalCharge - Number(session.discountAmount || 0)).toFixed(2))
  )

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sessionAdjustment.create({
      data: {
        sessionId: session.id,
        adjustmentType: 'EXTENSION',
        oldDuration,
        newDuration,
        reason: String(reason).trim() || 'Session extended',
        adjustedBy: staffUserId || null,
      },
    })

    return tx.gamingSession.update({
      where: { id: session.id },
      data: {
        actualDuration: newDuration,
        expectedEndTime: newExpectedEndTime,
        totalCharge: newTotalCharge,
        finalAmount: newFinalAmount,
      },
      include: {
        table: true,
        customer: { include: { user: { select: { id: true, name: true, email: true } } } },
        booking: true,
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    })
  })

  if (updated.customerId) {
    await syncCustomerStatsAndLoyalty(updated.customerId, updated.id)
  }

  return decorateSession(updated)
}

/**
 * Pause or resume an active gaming session.
 */
export async function togglePauseGamingSession({
  sessionId,
  reason = 'Paused by staff',
  staffUserId = null,
}) {
  const session = await prisma.gamingSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    const err = new Error('Session not found')
    err.status = 404
    throw err
  }

  if (!['ACTIVE', 'PAUSED'].includes(session.status)) {
    const err = new Error(`Cannot pause/resume session with status ${session.status}`)
    err.status = 400
    throw err
  }

  const nextStatus = session.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
  const dur = Number(session.actualDuration || 1)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sessionAdjustment.create({
      data: {
        sessionId: session.id,
        adjustmentType: nextStatus === 'PAUSED' ? 'PAUSE' : 'RESUME',
        oldDuration: dur,
        newDuration: dur,
        reason: String(reason).trim(),
        adjustedBy: staffUserId || null,
      },
    })

    return tx.gamingSession.update({
      where: { id: session.id },
      data: { status: nextStatus },
      include: {
        table: true,
        customer: { include: { user: { select: { id: true, name: true, email: true } } } },
        booking: true,
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    })
  })

  return decorateSession(updated)
}

/**
 * Stop / Complete a gaming session, free the table, calculate final charge,
 * optionally redeem loyalty bonus hours, update CustomerProfile playing hours,
 * and trigger automatic loyalty milestone rewards.
 */
export async function stopGamingSession({
  sessionId,
  overrideDurationHours = null,
  discountAmount = 0,
  discountReason = null,
  redeemBonusHours = 0,
  paymentMethod = 'CASH',
  paymentStatus = 'PAID',
  notes = null,
  staffUserId = null,
  ipAddress = null,
  userAgent = null,
}) {
  const session = await prisma.gamingSession.findUnique({
    where: { id: sessionId },
    include: {
      table: true,
      customer: { include: { user: true } },
      booking: true,
    },
  })

  if (!session) {
    const err = new Error('Session not found')
    err.status = 404
    throw err
  }

  if (session.status === 'COMPLETED') {
    return { session: decorateSession(session), issuedRewards: [] }
  }

  const endTime = new Date()
  const elapsedMs = Math.max(0, endTime.getTime() - new Date(session.startTime).getTime())
  const elapsedHours = Number((elapsedMs / (1000 * 60 * 60)).toFixed(2))

  // Use overrideDurationHours if provided (e.g. resolving an abandoned session or minimum charge),
  // otherwise use elapsedHours (with a minimum of 0.25h = 15 mins)
  const actualDuration =
    overrideDurationHours !== null && overrideDurationHours !== undefined && Number(overrideDurationHours) > 0
      ? Number(Number(overrideDurationHours).toFixed(2))
      : Math.max(0.25, elapsedHours)

  const hourlyRate = session.sessionType === 'COMPLIMENTARY' ? 0 : Number(session.hourlyRate)
  const totalCharge = Number((actualDuration * hourlyRate).toFixed(2))

  // Redeem loyalty bonus hours if requested and customer has balance
  let redeemedHours = 0
  let rewardDiscount = 0
  if (session.customerId && Number(redeemBonusHours) > 0) {
    redeemedHours = Math.min(Number(redeemBonusHours), actualDuration)
    await redeemCustomerRewards({
      customerId: session.customerId,
      hoursToRedeem: redeemedHours,
      sessionId: session.id,
      staffUserId,
      reason: `Redeemed on session #${session.sessionRef.slice(-6).toUpperCase()}`,
    })
    rewardDiscount = Number((redeemedHours * hourlyRate).toFixed(2))
  }

  const manualDiscount = Math.max(0, Number(discountAmount || session.discountAmount || 0))
  const combinedDiscount = Math.min(totalCharge, Number((manualDiscount + rewardDiscount).toFixed(2)))
  const finalAmount =
    session.sessionType === 'COMPLIMENTARY'
      ? 0
      : Math.max(0, Number((totalCharge - combinedDiscount).toFixed(2)))

  const combinedDiscountReason = [
    discountReason || session.discountReason,
    redeemedHours > 0 ? `Redeemed ${redeemedHours}h loyalty bonus (-₹${rewardDiscount})` : null,
  ]
    .filter(Boolean)
    .join('; ') || null

  const completedSession = await prisma.$transaction(async (tx) => {
    if (overrideDurationHours !== null && overrideDurationHours !== undefined) {
      await tx.sessionAdjustment.create({
        data: {
          sessionId: session.id,
          adjustmentType: 'DURATION_OVERRIDE',
          oldDuration: elapsedHours,
          newDuration: actualDuration,
          reason: discountReason || 'Manual duration resolution at checkout',
          adjustedBy: staffUserId || null,
        },
      })
    }

    // 1. Update session
    const updatedSess = await tx.gamingSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        endTime,
        actualDuration,
        totalCharge,
        discountAmount: combinedDiscount,
        discountReason: combinedDiscountReason,
        finalAmount,
        paymentStatus: finalAmount === 0 ? 'PAID' : paymentStatus || 'PAID',
        paymentMethod: paymentMethod || 'CASH',
        ...(notes ? { notes: [session.notes, notes].filter(Boolean).join(' | ') } : {}),
      },
      include: {
        table: true,
        customer: { include: { user: { select: { id: true, name: true, email: true } } } },
        booking: true,
        adjustments: { orderBy: { createdAt: 'desc' } },
      },
    })

    // 2. Release table if no other active sessions exist on it
    const otherActive = await tx.gamingSession.count({
      where: {
        tableId: session.tableId,
        id: { not: session.id },
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    })
    if (otherActive === 0) {
      await tx.table.update({
        where: { id: session.tableId },
        data: { status: 'AVAILABLE' },
      })
    }

    // 3. Complete linked booking if present
    if (session.bookingId && session.booking?.status !== 'COMPLETED') {
      await tx.booking.update({
        where: { id: session.bookingId },
        data: {
          status: 'COMPLETED',
          completedAt: endTime,
          paymentStatus: 'PAID',
        },
      })

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: session.bookingId,
          oldStatus: session.booking.status,
          newStatus: 'COMPLETED',
          changedBy: staffUserId || null,
          reason: 'Gaming session completed',
        },
      })
    }

    return updatedSess
  })

  // 4. Sync customer playing hours, lifetime spending & Loyalty Milestone Engine
  let loyaltyResult = { issuedRewards: [] }
  if (session.customerId) {
    loyaltyResult = await syncCustomerStatsAndLoyalty(
      session.customerId,
      session.id
    )
  }

  // 6. Audit Log
  if (staffUserId) {
    await logAudit({
      userId: staffUserId,
      action: 'SESSION_COMPLETED',
      module: 'SESSIONS',
      entityId: session.id,
      entityType: 'GamingSession',
      changes: {
        tableId: session.tableId,
        actualDuration,
        totalCharge,
        discountAmount: combinedDiscount,
        finalAmount,
        paymentMethod,
        issuedRewardsCount: loyaltyResult.issuedRewards.length,
      },
      ipAddress,
      userAgent,
    })
  }

  return {
    session: decorateSession(completedSession),
    issuedRewards: loyaltyResult.issuedRewards,
  }
}

/**
 * Decorate a GamingSession record with computed live elapsed time, live charge,
 * and `isAbandoned` flag (>24h without endTime).
 */
export function decorateSession(s) {
  if (!s) return null
  const now = Date.now()
  const startMs = new Date(s.startTime).getTime()
  const endMs = s.endTime ? new Date(s.endTime).getTime() : now
  const elapsedHours = Number(Math.max(0, (endMs - startMs) / 3600000).toFixed(2))
  const isRunning = s.status === 'ACTIVE' || s.status === 'PAUSED'
  const isAbandoned = isRunning && elapsedHours >= 24

  const hourlyRate = Number(s.hourlyRate || 0)
  const liveCharge = isRunning
    ? Number((Math.max(0.25, elapsedHours) * hourlyRate).toFixed(2))
    : Number(s.totalCharge || 0)

  return {
    ...s,
    hourlyRate,
    actualDuration: Number(s.actualDuration || 0),
    totalCharge: Number(s.totalCharge || 0),
    discountAmount: Number(s.discountAmount || 0),
    finalAmount: Number(s.finalAmount || 0),
    elapsedHours,
    liveCharge,
    isAbandoned,
  }
}

