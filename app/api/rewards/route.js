import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ensureDefaultLoyaltyProgram,
  recalculateCustomerLoyaltyState,
  checkAndIssueRewards,
  getCustomerHoursBreakdown,
} from '@/lib/services/loyalty'
import { syncCustomerStatsAndLoyalty } from '@/lib/services/session'

/**
 * GET /api/rewards
 * Returns the customer's loyalty progress, active milestone rules, gift voucher code,
 * and reward ledger history. Supports matching by authenticated session as well as
 * phone/email/name (so a walk-in client who signs in online automatically gets their
 * unlocked free reward hours!).
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const queryPhone = searchParams.get('phone') || ''
    const queryEmail = searchParams.get('email') || ''
    const queryName = searchParams.get('name') || ''

    const rawDigits = String(queryPhone || session?.user?.phone || '').replace(/\D/g, '')
    const cleanPhone =
      rawDigits.length >= 10
        ? rawDigits.slice(-10)
        : rawDigits.length >= 6
        ? rawDigits
        : null
    const cleanEmail = String(queryEmail || session?.user?.email || '')
      .trim()
      .toLowerCase()
    const cleanName = String(queryName || session?.user?.name || '').trim()

    await ensureDefaultLoyaltyProgram()

    // 1. Try finding the best matching CustomerProfile (prefer phone match or profile with playing hours)
    let targetProfile = null

    if (cleanPhone) {
      targetProfile = await prisma.customerProfile.findFirst({
        where: {
          OR: [{ phone: cleanPhone }, { phone: { endsWith: cleanPhone } }],
        },
        include: { user: true },
      })
    }

    if (!targetProfile && cleanEmail) {
      const byEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { customerProfile: { include: { user: true } } },
      })
      if (byEmail?.customerProfile) {
        targetProfile = byEmail.customerProfile
      }
    }

    if (session?.user?.id) {
      const sessionProfile = await prisma.customerProfile.upsert({
        where: { userId: session.user.id },
        update: {},
        create: { userId: session.user.id },
        include: { user: true },
      })

      // If the user has a walk-in profile with playing hours under their phone or name,
      // and their Google session profile has 0 hours, link or use the profile with hours
      if (!targetProfile && cleanName) {
        const byNameWithHours = await prisma.customerProfile.findFirst({
          where: {
            id: { not: sessionProfile.id },
            totalPlayingHours: { gt: 0 },
            user: { name: { equals: cleanName } },
          },
          orderBy: { totalPlayingHours: 'desc' },
          include: { user: true },
        })
        if (byNameWithHours) {
          targetProfile = byNameWithHours
        }
      }

      if (
        targetProfile &&
        targetProfile.id !== sessionProfile.id &&
        Number(targetProfile.totalPlayingHours || 0) >=
          Number(sessionProfile.totalPlayingHours || 0)
      ) {
        // Keep targetProfile (which has the walk-in hours & rewards)
      } else {
        targetProfile = sessionProfile
      }
    } else if (!targetProfile && cleanName.length >= 2) {
      targetProfile = await prisma.customerProfile.findFirst({
        where: {
          user: { name: { equals: cleanName } },
        },
        orderBy: { totalPlayingHours: 'desc' },
        include: { user: true },
      })
    }

    const programs = await prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      include: {
        rewardRules: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { hoursRequired: 'asc' }],
        },
      },
    })

    const rules = programs.flatMap((p) =>
      p.rewardRules.map((r) => ({
        id: r.id,
        programName: p.name,
        name: r.name,
        hoursRequired: Number(r.hoursRequired),
        bonusHours: Number(r.bonusHours),
        validForDays: r.validForDays,
      }))
    )

    if (!targetProfile) {
      return NextResponse.json({
        profile: null,
        rules,
        ledger: [],
      })
    }

    // Sync playing hours & issue any newly crossed milestone rewards
    await syncCustomerStatsAndLoyalty(targetProfile.id)
    const breakdown = await getCustomerHoursBreakdown(targetProfile.id)
    const profile = await recalculateCustomerLoyaltyState(targetProfile.id)

    const ledger = await prisma.rewardLedger.findMany({
      where: { customerId: profile.id },
      orderBy: { createdAt: 'desc' },
    })

    // milestoneCycleHours resets to 0 whenever the client claims their bonus hour!
    // lifetimeTotalHours is preserved for the Customers Directory.
    const milestoneCycleHours = Number(breakdown.milestoneCycleHours || 0)
    const lifetimeTotalHours = Number(breakdown.lifetimeTotalHours || 0)
    const rewardBalance = Number(profile.rewardBalance || 0)
    const primaryRule = rules[0] || {
      name: '5-Hour Milestone',
      hoursRequired: 5,
      bonusHours: 1,
    }
    const reqHours = Math.max(1, Number(primaryRule.hoursRequired || 5))
    const hoursIntoCycle = milestoneCycleHours % reqHours
    const hoursRemaining =
      rewardBalance > 0
        ? 0
        : Number(Math.max(0, reqHours - hoursIntoCycle).toFixed(2))
    const progressPct =
      rewardBalance > 0
        ? 100
        : Math.min(100, Math.round((hoursIntoCycle / reqHours) * 100))

    const playerCleanTag = (targetProfile.user?.name || cleanName || 'VIP')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8)
    const giftVoucherCode =
      rewardBalance > 0
        ? `GIFT-${playerCleanTag || 'VIP'}-${rewardBalance}HR-FREE`
        : null

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: targetProfile.user?.name || cleanName || 'Member',
        phone: profile.phone || cleanPhone || '',
        totalPlayingHours: milestoneCycleHours,
        milestoneCycleHours,
        lifetimeTotalHours,
        lifetimeSpending: Number(profile.lifetimeSpending || 0),
        rewardBalance,
        membershipTier: profile.membershipTier || 'BRONZE',
        giftVoucherCode,
        nextMilestone: {
          ruleName: primaryRule.name,
          hoursRequired: reqHours,
          bonusHours: Number(primaryRule.bonusHours || 1),
          hoursRemaining,
          progressPct,
        },
      },
      rules,
      ledger: ledger.map((entry) => ({
        ...entry,
        hoursEarned: Number(entry.hoursEarned),
        hoursRedeemed: Number(entry.hoursRedeemed),
      })),
    })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 })
  }
}
