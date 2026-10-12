import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getCustomerHoursBreakdown,
  recalculateCustomerLoyaltyState,
} from '@/lib/services/loyalty'

const CUSTOMER_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'RECEPTIONIST',
  'CASHIER',
  'SUPPORT_AGENT',
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !CUSTOMER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profiles = await prisma.customerProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        bookings: {
          orderBy: { bookingDate: 'desc' },
          select: { id: true, bookingDate: true, totalAmount: true },
        },
        gamingSessions: {
          orderBy: { startTime: 'desc' },
          take: 1,
          select: { id: true, startTime: true },
        },
        _count: {
          select: { bookings: true, gamingSessions: true },
        },
      },
    })

    const customers = []
    for (const p of profiles) {
      const breakdown = await getCustomerHoursBreakdown(p.id)
      if (
        Number(p.totalPlayingHours || 0) !== breakdown.lifetimeTotalHours ||
        Number(p.lifetimeSpending || 0) !== breakdown.lifetimeSpending
      ) {
        await prisma.customerProfile.update({
          where: { id: p.id },
          data: {
            totalPlayingHours: breakdown.lifetimeTotalHours,
            lifetimeSpending: breakdown.lifetimeSpending,
          },
        })
      }
      const syncedProfile = await recalculateCustomerLoyaltyState(p.id)

      const latestBookingDate = p.bookings?.[0]?.bookingDate
        ? new Date(p.bookings[0].bookingDate)
        : null
      const latestSessionDate = p.gamingSessions?.[0]?.startTime
        ? new Date(p.gamingSessions[0].startTime)
        : null
      const mostRecentDate =
        latestBookingDate && latestSessionDate
          ? latestBookingDate > latestSessionDate
            ? latestBookingDate
            : latestSessionDate
          : latestBookingDate || latestSessionDate

      const lastBookingDate = mostRecentDate
        ? mostRecentDate.toLocaleDateString('en-IN')
        : '—'

      const rawEmail = p.user?.email || '—'
      const isSyntheticEmail =
        rawEmail.endsWith('@cueclub.com') || rawEmail.endsWith('@cueclub.local')

      customers.push({
        id: p.id,
        name: p.user?.name || 'Customer',
        email: isSyntheticEmail ? '—' : rawEmail,
        phone: p.phone || '—',
        membershipTier: syncedProfile?.membershipTier || p.membershipTier || 'BRONZE',
        // All-time total hours played (never resets — shown in Customers Directory)
        totalPlayingHours: breakdown.lifetimeTotalHours,
        lifetimeTotalHours: breakdown.lifetimeTotalHours,
        // Current milestone cycle hours (resets to 0h when bonus is claimed)
        milestoneCycleHours: breakdown.milestoneCycleHours,
        rewardBalance: Number(syncedProfile?.rewardBalance ?? p.rewardBalance ?? 0),
        totalBookings:
          (p._count?.bookings || 0) + (p._count?.gamingSessions || 0),
        totalSpent: breakdown.lifetimeSpending,
        lastBooking: lastBookingDate,
        joinedAt: new Date(p.createdAt).toLocaleDateString('en-IN'),
      })
    }

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}
