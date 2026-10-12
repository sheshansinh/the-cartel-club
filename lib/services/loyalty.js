/**
 * Loyalty & Rewards Engine (Module F)
 *
 * Enforces:
 * - Default milestone rules (5h -> +1 bonus hr, 31h -> +5 bonus hrs)
 * - Idempotent threshold crossing check (issued at most once per rule per customer)
 * - Strict rewardBalance recalculation from active EARNED ledger entries
 * - Admin manual grant / revoke / redeem with mandatory reason + audit log
 */

import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'

/**
 * Ensure the default LoyaltyProgram and 5h / 31h RewardRules exist in the DB.
 */
export async function ensureDefaultLoyaltyProgram() {
  const existingProgram = await prisma.loyaltyProgram.findFirst({
    where: { isActive: true },
    include: {
      rewardRules: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (existingProgram && existingProgram.rewardRules.length > 0) {
    return existingProgram
  }

  const program = await prisma.loyaltyProgram.upsert({
    where: { id: 'default-loyalty' },
    update: { isActive: true, name: 'The Cartel Club Rewards' },
    create: {
      id: 'default-loyalty',
      name: 'The Cartel Club Rewards',
      description: 'Earn bonus playing hours automatically when you cross hour milestones.',
      isActive: true,
    },
  })

  const defaultRules = [
    {
      id: 'rule-5h',
      name: '5-Hour Milestone',
      hoursRequired: 5,
      bonusHours: 1,
      validForDays: 90,
      sortOrder: 1,
    },
    {
      id: 'rule-31h',
      name: '31-Hour Milestone',
      hoursRequired: 31,
      bonusHours: 5,
      validForDays: 180,
      sortOrder: 2,
    },
  ]

  for (const r of defaultRules) {
    await prisma.rewardRule.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        programId: program.id,
        isActive: true,
      },
    })
  }

  return prisma.loyaltyProgram.findUnique({
    where: { id: program.id },
    include: { rewardRules: { orderBy: { sortOrder: 'asc' } } },
  })
}

/**
 * Recalculate and update CustomerProfile.rewardBalance and membershipTier
 * based on their current RewardLedger entries and totalPlayingHours.
 */
export async function recalculateCustomerLoyaltyState(customerId, tx = prisma) {
  const now = new Date()

  // 1. Mark any expired EARNED rewards as EXPIRED
  await tx.rewardLedger.updateMany({
    where: {
      customerId,
      status: 'EARNED',
      validUntil: { lt: now },
    },
    data: { status: 'EXPIRED' },
  })

  // 1b. Find the most recent bonus claim/redemption timestamp across RewardLedger, GamingSession, and Booking.
  // When a client claims their bonus one time, any EARNED entries created at or before that claim
  // belong to the completed cycle and are marked REDEEMED so the cycle & bonus reset cleanly to 0.
  const [lastLedgerRedeem, lastFreeSession, lastFreeBooking] = await Promise.all([
    tx.rewardLedger.findFirst({
      where: {
        customerId,
        OR: [{ status: 'REDEEMED' }, { hoursRedeemed: { gt: 0 } }],
        redeemedAt: { not: null },
      },
      orderBy: { redeemedAt: 'desc' },
      select: { redeemedAt: true },
    }),
    tx.gamingSession.findFirst({
      where: {
        customerId,
        status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
        OR: [
          { discountAmount: { gt: 0 } },
          { notes: { contains: 'FREE_REWARD' } },
          { notes: { contains: 'ONLINE_REWARD' } },
        ],
      },
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    }),
    tx.booking.findFirst({
      where: {
        customerId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] },
        notes: { contains: 'FREE_REWARD' },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  const candidateTimestamps = [
    lastLedgerRedeem?.redeemedAt ? new Date(lastLedgerRedeem.redeemedAt).getTime() : 0,
    lastFreeSession?.startTime ? new Date(lastFreeSession.startTime).getTime() : 0,
    lastFreeBooking?.createdAt ? new Date(lastFreeBooking.createdAt).getTime() : 0,
  ]
  const maxClaimMs = Math.max(...candidateTimestamps)

  if (maxClaimMs > 0) {
    const claimCutoff = new Date(maxClaimMs + 2000)
    const priorEarned = await tx.rewardLedger.findMany({
      where: {
        customerId,
        status: 'EARNED',
        createdAt: { lte: claimCutoff },
      },
      select: { id: true, hoursEarned: true },
    })
    for (const oldEntry of priorEarned) {
      await tx.rewardLedger.update({
        where: { id: oldEntry.id },
        data: {
          status: 'REDEEMED',
          hoursRedeemed: oldEntry.hoursEarned,
          redeemedAt: new Date(maxClaimMs),
        },
      })
    }
  }

  // 2. Sum remaining available hours across EARNED entries created after the last bonus claim
  const earnedEntries = await tx.rewardLedger.findMany({
    where: {
      customerId,
      status: 'EARNED',
    },
    select: {
      hoursEarned: true,
      hoursRedeemed: true,
    },
  })

  const rawBalance = earnedEntries.reduce((acc, entry) => {
    const net = Number(entry.hoursEarned || 0) - Number(entry.hoursRedeemed || 0)
    return acc + net
  }, 0)

  const rewardBalance = Math.max(0, Number(rawBalance.toFixed(2)))

  // 3. Determine membership tier from totalPlayingHours
  const profile = await tx.customerProfile.findUnique({
    where: { id: customerId },
    select: { totalPlayingHours: true },
  })

  const hours = Number(profile?.totalPlayingHours || 0)
  let membershipTier = 'BRONZE'
  if (hours >= 50) membershipTier = 'PLATINUM'
  else if (hours >= 25) membershipTier = 'GOLD'
  else if (hours >= 10) membershipTier = 'SILVER'

  const updatedProfile = await tx.customerProfile.update({
    where: { id: customerId },
    data: {
      rewardBalance,
      membershipTier,
    },
  })

  return updatedProfile
}

/**
 * Computes two distinct hour metrics for a customer:
 * 1. lifetimeTotalHours: All-time total hours played (never resets — shown in Customers Directory)
 * 2. milestoneCycleHours: Hours played toward the current reward milestone since the customer's
 *    last bonus claim/redemption (resets to 0 every time the customer claims a bonus hour!)
 */
export async function getCustomerHoursBreakdown(customerId) {
  if (!customerId) {
    return {
      lifetimeTotalHours: 0,
      milestoneCycleHours: 0,
      lifetimeSpending: 0,
      lastRedeemedAt: null,
    }
  }

  const [profile, sessions, bookings, lastRedeemedEntry] = await Promise.all([
    prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: { totalPlayingHours: true, lifetimeSpending: true },
    }),
    prisma.gamingSession.findMany({
      where: {
        customerId,
        status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
      },
      select: {
        id: true,
        bookingId: true,
        startTime: true,
        actualDuration: true,
        hourlyRate: true,
        discountAmount: true,
        finalAmount: true,
        totalCharge: true,
        paymentStatus: true,
        notes: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        customerId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] },
      },
      select: {
        id: true,
        createdAt: true,
        durationHours: true,
        totalAmount: true,
        paymentStatus: true,
        notes: true,
      },
    }),
    prisma.rewardLedger.findFirst({
      where: {
        customerId,
        OR: [{ status: 'REDEEMED' }, { hoursRedeemed: { gt: 0 } }],
        redeemedAt: { not: null },
      },
      orderBy: { redeemedAt: 'desc' },
      select: { redeemedAt: true },
    }),
  ])

  let latestClaimMs = lastRedeemedEntry?.redeemedAt
    ? new Date(lastRedeemedEntry.redeemedAt).getTime()
    : 0

  for (const s of sessions) {
    const disc = Number(s.discountAmount || 0)
    const noteStr = String(s.notes || '')
    if (
      disc > 0 ||
      noteStr.includes('FREE_REWARD') ||
      noteStr.includes('ONLINE_REWARD')
    ) {
      const sMs = new Date(s.startTime).getTime()
      if (sMs > latestClaimMs) latestClaimMs = sMs
    }
  }

  for (const b of bookings) {
    const noteStr = String(b.notes || '')
    if (noteStr.includes('FREE_REWARD')) {
      const bMs = new Date(b.createdAt).getTime()
      if (bMs > latestClaimMs) latestClaimMs = bMs
    }
  }

  const lastRedeemedAt = latestClaimMs > 0 ? new Date(latestClaimMs) : null

  const sessionBookingIds = new Set(
    sessions.map((s) => s.bookingId).filter(Boolean)
  )

  let computedLifetimeHours = 0
  let milestoneCycleHours = 0
  let totalSpent = 0

  for (const s of sessions) {
    const dur = Number(s.actualDuration || 0)
    const rate = Number(s.hourlyRate || 0)
    const disc = Number(s.discountAmount || 0)
    const freeHrs = rate > 0 && disc > 0 ? Math.min(dur, disc / rate) : 0
    const paidHrs = Math.max(0, dur - freeHrs)

    // All-time total hours includes all sessions played (never resets)
    computedLifetimeHours += dur

    // Milestone cycle hours only counts paid hours played AFTER the last bonus redemption
    const sessionStart = new Date(s.startTime)
    if (!lastRedeemedAt || sessionStart > lastRedeemedAt) {
      milestoneCycleHours += paidHrs
    }

    if (s.paymentStatus === 'PAID') {
      totalSpent += Number(s.finalAmount ?? s.totalCharge ?? 0)
    }
  }

  for (const b of bookings) {
    if (!sessionBookingIds.has(b.id)) {
      const dur = Number(b.durationHours || 0)
      const freeMatch = String(b.notes || '').match(/\[FREE_REWARD:([\d.]+)h\]/)
      const freeHrs = freeMatch ? Math.min(dur, Number(freeMatch[1] || 0)) : 0
      const paidHrs = Math.max(0, dur - freeHrs)

      computedLifetimeHours += dur

      const bookingCreated = new Date(b.createdAt)
      if (!lastRedeemedAt || bookingCreated > lastRedeemedAt) {
        milestoneCycleHours += paidHrs
      }

      if (b.paymentStatus === 'PAID') {
        totalSpent += Number(b.totalAmount || 0)
      }
    }
  }

  const storedTotal = Number(profile?.totalPlayingHours || 0)
  const lifetimeTotalHours = Number(
    Math.max(computedLifetimeHours, storedTotal).toFixed(2)
  )

  // If customer had pre-existing stored hours before any session records and hasn't redeemed yet
  if (!lastRedeemedAt && storedTotal > computedLifetimeHours) {
    milestoneCycleHours += storedTotal - computedLifetimeHours
  }

  return {
    lifetimeTotalHours,
    milestoneCycleHours: Number(Math.max(0, milestoneCycleHours).toFixed(2)),
    lifetimeSpending: Number(
      Math.max(totalSpent, Number(profile?.lifetimeSpending || 0)).toFixed(2)
    ),
    lastRedeemedAt,
  }
}

/**
 * Check if a customer has crossed any active RewardRule thresholds in their current
 * milestone cycle (since their last bonus claim/redemption), and issue unlocked rewards.
 */
export async function checkAndIssueRewards(customerId, sessionId = null) {
  if (!customerId) return { issuedRewards: [] }

  await ensureDefaultLoyaltyProgram()

  const profile = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: {
      user: { select: { id: true, name: true } },
      rewards: true,
    },
  })

  if (!profile) return { issuedRewards: [] }

  const {
    lifetimeTotalHours,
    milestoneCycleHours,
    lastRedeemedAt,
  } = await getCustomerHoursBreakdown(customerId)

  const activeRules = await prisma.rewardRule.findMany({
    where: {
      isActive: true,
      program: { isActive: true },
    },
    orderBy: { hoursRequired: 'asc' },
  })

  const issuedRewards = []

  for (const rule of activeRules) {
    const required = Number(rule.hoursRequired)
    const bonus = Number(rule.bonusHours)

    if (!required || required <= 0 || milestoneCycleHours < required) continue

    // How many times has the player crossed this milestone in the CURRENT cycle (since last bonus claim)?
    const timesCrossedInCycle = Math.floor(milestoneCycleHours / required)

    // Count how many rewards for this rule have already been issued in the CURRENT cycle (after lastRedeemedAt)
    const ruleTagPrefix = `[RULE:${rule.id}`
    const entriesInCurrentCycle = profile.rewards.filter((entry) => {
      if (entry.status === 'REVOKED') return false
      const matchesRule =
        entry.reason?.includes(ruleTagPrefix) ||
        entry.reason?.toLowerCase().includes(rule.name.toLowerCase())
      if (!matchesRule) return false
      if (!lastRedeemedAt) return true
      return new Date(entry.createdAt) > lastRedeemedAt
    })

    const alreadyIssuedInCycle = entriesInCurrentCycle.length
    if (alreadyIssuedInCycle >= timesCrossedInCycle) continue

    for (
      let cycle = alreadyIssuedInCycle + 1;
      cycle <= timesCrossedInCycle;
      cycle++
    ) {
      const cycleTag = `[RULE:${rule.id}#${Date.now()}-${cycle}]`
      const milestoneHoursAtCycle = required * cycle
      const validUntil = rule.validForDays
        ? new Date(Date.now() + rule.validForDays * 24 * 60 * 60 * 1000)
        : null

      const createdLedger = await prisma.rewardLedger.create({
        data: {
          customerId: profile.id,
          hoursEarned: bonus,
          hoursRedeemed: 0,
          status: 'EARNED',
          reason: `${rule.name} (${milestoneHoursAtCycle}h cycle milestone) ${cycleTag}`,
          grantedBy: 'SYSTEM_LOYALTY_ENGINE',
          validUntil,
          sessionId: sessionId || null,
        },
      })

      issuedRewards.push(createdLedger)

      if (profile.user?.id) {
        await createNotification({
          userId: profile.user.id,
          title: `🎉 Unlocked: +${bonus} Free Bonus Hour(s)!`,
          message: `Congratulations! You reached ${milestoneHoursAtCycle} hours in your current cycle and earned ${bonus} bonus hour(s) under ${rule.name}.`,
          type: 'REWARD',
          actionUrl: '/rewards',
        })

        await logAudit({
          userId: profile.user.id,
          action: 'REWARD_ISSUED',
          module: 'LOYALTY',
          entityId: createdLedger.id,
          entityType: 'RewardLedger',
          changes: {
            customerId: profile.id,
            ruleId: rule.id,
            ruleName: rule.name,
            bonusHours: bonus,
            milestoneCycleHours,
            lifetimeTotalHours,
          },
        })
      }
    }
  }

  // Always recalculate denormalized balance and membership tier
  const updatedProfile = await recalculateCustomerLoyaltyState(customerId)

  return {
    issuedRewards,
    profile: updatedProfile,
    lifetimeTotalHours,
    milestoneCycleHours,
  }
}

/**
 * Redeem bonus hours from a customer's available EARNED rewards (FIFO by expiry/createdAt).
 */
export async function redeemCustomerRewards({
  customerId,
  hoursToRedeem,
  sessionId = null,
  staffUserId = null,
  reason = 'Redeemed on gaming session',
}) {
  const requested = Number(hoursToRedeem)
  if (!customerId || requested <= 0) {
    const err = new Error('Valid customerId and positive hoursToRedeem are required')
    err.status = 400
    throw err
  }

  await recalculateCustomerLoyaltyState(customerId)

  const profile = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: { user: { select: { id: true } } },
  })

  if (!profile) {
    const err = new Error('Customer profile not found')
    err.status = 404
    throw err
  }

  const currentBalance = Number(profile.rewardBalance || 0)
  if (requested > currentBalance) {
    const err = new Error(
      `Insufficient reward balance. Available: ${currentBalance.toFixed(2)}h, requested: ${requested.toFixed(2)}h`
    )
    err.status = 400
    throw err
  }

  let remainingToRedeem = requested

  const earnedEntries = await prisma.rewardLedger.findMany({
    where: {
      customerId,
      status: 'EARNED',
    },
    orderBy: [{ validUntil: 'asc' }, { createdAt: 'asc' }],
  })

  await prisma.$transaction(async (tx) => {
    for (const entry of earnedEntries) {
      if (remainingToRedeem <= 0) break

      const availableInEntry =
        Number(entry.hoursEarned || 0) - Number(entry.hoursRedeemed || 0)
      if (availableInEntry <= 0) continue

      const deduct = Math.min(availableInEntry, remainingToRedeem)
      const newRedeemed = Number((Number(entry.hoursRedeemed || 0) + deduct).toFixed(2))
      const fullyUsed = newRedeemed >= Number(entry.hoursEarned)

      await tx.rewardLedger.update({
        where: { id: entry.id },
        data: {
          hoursRedeemed: newRedeemed,
          status: fullyUsed ? 'REDEEMED' : 'EARNED',
          redeemedAt: new Date(),
          ...(sessionId ? { sessionId } : {}),
        },
      })

      remainingToRedeem = Number((remainingToRedeem - deduct).toFixed(2))
    }

    await recalculateCustomerLoyaltyState(customerId, tx)
  })

  const auditUser = staffUserId || profile.user?.id
  if (auditUser) {
    await logAudit({
      userId: auditUser,
      action: 'REWARD_REDEEMED',
      module: 'LOYALTY',
      entityId: customerId,
      entityType: 'CustomerProfile',
      changes: {
        hoursRedeemed: requested,
        sessionId,
        reason,
      },
    })
  }

  if (profile.user?.id) {
    await createNotification({
      userId: profile.user.id,
      title: 'Reward Hours Redeemed',
      message: `${requested} bonus hour(s) were redeemed (${reason}).`,
      type: 'REWARD',
      actionUrl: '/rewards',
    })
  }

  return recalculateCustomerLoyaltyState(customerId)
}

/**
 * Admin manual grant or revoke of bonus hours with mandatory reason.
 */
export async function adjustCustomerRewards({
  customerId,
  actionType, // 'GRANT' | 'REVOKE' | 'REDEEM'
  hours,
  reason,
  validForDays = 90,
  staffUserId,
}) {
  if (!customerId || !reason || String(reason).trim().length < 3) {
    const err = new Error('Customer and a valid reason (min 3 chars) are required')
    err.status = 400
    throw err
  }

  const numHours = Number(hours)
  if (!numHours || numHours <= 0) {
    const err = new Error('Hours must be greater than 0')
    err.status = 400
    throw err
  }

  if (actionType === 'REDEEM') {
    return redeemCustomerRewards({
      customerId,
      hoursToRedeem: numHours,
      staffUserId,
      reason: String(reason).trim(),
    })
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    include: { user: { select: { id: true, name: true } } },
  })

  if (!profile) {
    const err = new Error('Customer profile not found')
    err.status = 404
    throw err
  }

  if (actionType === 'GRANT') {
    const validUntil = validForDays
      ? new Date(Date.now() + Number(validForDays) * 24 * 60 * 60 * 1000)
      : null

    const ledger = await prisma.rewardLedger.create({
      data: {
        customerId,
        hoursEarned: numHours,
        hoursRedeemed: 0,
        status: 'EARNED',
        reason: `Admin Grant: ${String(reason).trim()}`,
        grantedBy: staffUserId,
        validUntil,
      },
    })

    const updatedProfile = await recalculateCustomerLoyaltyState(customerId)

    if (staffUserId) {
      await logAudit({
        userId: staffUserId,
        action: 'REWARD_ADJUSTED',
        module: 'LOYALTY',
        entityId: ledger.id,
        entityType: 'RewardLedger',
        changes: {
          actionType: 'GRANT',
          customerId,
          hours: numHours,
          reason,
        },
      })
    }

    if (profile.user?.id) {
      await createNotification({
        userId: profile.user.id,
        title: `🎁 +${numHours} Bonus Hour(s) Credited!`,
        message: `You received ${numHours} bonus playing hour(s): ${reason}`,
        type: 'REWARD',
        actionUrl: '/rewards',
      })
    }

    return updatedProfile
  }

  if (actionType === 'REVOKE') {
    // Revoke up to numHours from active EARNED entries
    let remainingToRevoke = numHours
    const earnedEntries = await prisma.rewardLedger.findMany({
      where: { customerId, status: 'EARNED' },
      orderBy: { createdAt: 'desc' },
    })

    await prisma.$transaction(async (tx) => {
      for (const entry of earnedEntries) {
        if (remainingToRevoke <= 0) break
        const avail = Number(entry.hoursEarned) - Number(entry.hoursRedeemed)
        if (avail <= 0) continue

        if (avail <= remainingToRevoke) {
          await tx.rewardLedger.update({
            where: { id: entry.id },
            data: {
              status: 'REVOKED',
              reason: `${entry.reason || ''} [Revoked: ${String(reason).trim()}]`,
            },
          })
          remainingToRevoke = Number((remainingToRevoke - avail).toFixed(2))
        } else {
          // Reduce hoursEarned on this entry and create a REVOKED record for the revoked portion
          await tx.rewardLedger.update({
            where: { id: entry.id },
            data: {
              hoursEarned: Number((Number(entry.hoursEarned) - remainingToRevoke).toFixed(2)),
            },
          })
          await tx.rewardLedger.create({
            data: {
              customerId,
              hoursEarned: remainingToRevoke,
              hoursRedeemed: 0,
              status: 'REVOKED',
              reason: `Admin Revoke: ${String(reason).trim()}`,
              grantedBy: staffUserId,
            },
          })
          remainingToRevoke = 0
        }
      }

      await recalculateCustomerLoyaltyState(customerId, tx)
    })

    if (staffUserId) {
      await logAudit({
        userId: staffUserId,
        action: 'REWARD_ADJUSTED',
        module: 'LOYALTY',
        entityId: customerId,
        entityType: 'CustomerProfile',
        changes: {
          actionType: 'REVOKE',
          customerId,
          hours: numHours,
          reason,
        },
      })
    }

    return recalculateCustomerLoyaltyState(customerId)
  }

  const err = new Error('Invalid actionType. Use GRANT, REVOKE, or REDEEM.')
  err.status = 400
  throw err
}

