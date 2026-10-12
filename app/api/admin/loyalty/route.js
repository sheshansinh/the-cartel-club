import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ensureDefaultLoyaltyProgram,
  adjustCustomerRewards,
  checkAndIssueRewards,
  getCustomerHoursBreakdown,
} from '@/lib/services/loyalty'
import { logAudit } from '@/lib/services/audit'

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

const MANAGER_ROLES = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER']

/**
 * GET /api/admin/loyalty
 * Returns active loyalty program, milestone rules, customer reward balances,
 * and recent RewardLedger history.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const program = await ensureDefaultLoyaltyProgram()

    const [rules, recentLedger, customersRaw] = await Promise.all([
      prisma.rewardRule.findMany({
        where: { programId: program.id },
        orderBy: [{ sortOrder: 'asc' }, { hoursRequired: 'asc' }],
      }),
      prisma.rewardLedger.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          customer: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.customerProfile.findMany({
        orderBy: { totalPlayingHours: 'desc' },
        take: 100,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    const customers = []
    for (const c of customersRaw) {
      const breakdown = await getCustomerHoursBreakdown(c.id)
      const { profile: refreshed } = await checkAndIssueRewards(c.id)
      customers.push({
        id: c.id,
        userId: c.userId,
        name: c.user?.name || 'Customer',
        email: c.user?.email || '',
        phone: c.phone || '',
        totalPlayingHours: breakdown.milestoneCycleHours,
        milestoneCycleHours: breakdown.milestoneCycleHours,
        lifetimeTotalHours: breakdown.lifetimeTotalHours,
        rewardBalance: Number(refreshed?.rewardBalance ?? c.rewardBalance ?? 0),
        lifetimeSpending: breakdown.lifetimeSpending,
        membershipTier: refreshed?.membershipTier || c.membershipTier || 'BRONZE',
      })
    }

    return NextResponse.json({
      program,
      rules: rules.map((r) => ({
        ...r,
        hoursRequired: Number(r.hoursRequired),
        bonusHours: Number(r.bonusHours),
      })),
      ledger: recentLedger.map((entry) => ({
        ...entry,
        hoursEarned: Number(entry.hoursEarned),
        hoursRedeemed: Number(entry.hoursRedeemed),
        customerName: entry.customer?.user?.name || 'Customer',
        customerEmail: entry.customer?.user?.email || '',
        customerPhone: entry.customer?.phone || '',
      })),
      customers,
    })
  } catch (error) {
    console.error('Error fetching admin loyalty data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loyalty data' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/loyalty
 * Create or update a RewardRule (MANAGER+ only).
 */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !MANAGER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, hoursRequired, bonusHours, validForDays, isActive } = body

    if (!name || !hoursRequired || !bonusHours) {
      return NextResponse.json(
        { error: 'Rule name, hoursRequired, and bonusHours are required' },
        { status: 400 }
      )
    }

    const program = await ensureDefaultLoyaltyProgram()

    let rule
    if (id) {
      rule = await prisma.rewardRule.update({
        where: { id },
        data: {
          name: String(name).trim(),
          hoursRequired: Number(hoursRequired),
          bonusHours: Number(bonusHours),
          validForDays: validForDays ? Number(validForDays) : null,
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
      })
    } else {
      rule = await prisma.rewardRule.create({
        data: {
          programId: program.id,
          name: String(name).trim(),
          hoursRequired: Number(hoursRequired),
          bonusHours: Number(bonusHours),
          validForDays: validForDays ? Number(validForDays) : 90,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      })
    }

    await logAudit({
      userId: session.user.id,
      action: id ? 'REWARD_RULE_UPDATED' : 'REWARD_RULE_CREATED',
      module: 'LOYALTY',
      entityId: rule.id,
      entityType: 'RewardRule',
      changes: {
        name: rule.name,
        hoursRequired: Number(rule.hoursRequired),
        bonusHours: Number(rule.bonusHours),
        isActive: rule.isActive,
      },
    })

    return NextResponse.json({
      rule: {
        ...rule,
        hoursRequired: Number(rule.hoursRequired),
        bonusHours: Number(rule.bonusHours),
      },
    })
  } catch (error) {
    console.error('Error updating loyalty rule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update reward rule' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/loyalty
 * Manual reward adjustment (GRANT, REVOKE, REDEEM) with mandatory reason,
 * or EVALUATE milestone rules for a customer.
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customerId, actionType, hours, reason, validForDays } = body

    if (actionType === 'EVALUATE') {
      const result = await checkAndIssueRewards(customerId)
      return NextResponse.json({
        success: true,
        issuedCount: result.issuedRewards.length,
        issuedRewards: result.issuedRewards,
      })
    }

    // GRANT and REVOKE require MANAGER+ role
    if (
      (actionType === 'GRANT' || actionType === 'REVOKE') &&
      !MANAGER_ROLES.includes(session.user.role)
    ) {
      return NextResponse.json(
        { error: 'Only managers and owners can manually grant or revoke bonus hours' },
        { status: 403 }
      )
    }

    const updatedProfile = await adjustCustomerRewards({
      customerId,
      actionType,
      hours,
      reason,
      validForDays: validForDays || 90,
      staffUserId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      profile: {
        ...updatedProfile,
        totalPlayingHours: Number(updatedProfile.totalPlayingHours),
        rewardBalance: Number(updatedProfile.rewardBalance),
      },
    })
  } catch (error) {
    console.error('Error adjusting customer rewards:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to adjust customer rewards' },
      { status: error.status || 500 }
    )
  }
}

