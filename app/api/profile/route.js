import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit, getRequestMeta } from '@/lib/services/audit'

/**
 * GET /api/profile
 * Returns the authenticated customer's User + CustomerProfile + summary stats.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const customerProfile = await prisma.customerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })

    const [totalBookings, upcomingBookings, completedBookings, unreadNotifications] =
      await Promise.all([
        prisma.booking.count({ where: { customerId: customerProfile.id } }),
        prisma.booking.count({
          where: {
            customerId: customerProfile.id,
            status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
          },
        }),
        prisma.booking.count({
          where: {
            customerId: customerProfile.id,
            status: 'COMPLETED',
          },
        }),
        prisma.notification.count({
          where: {
            userId: user.id,
            isRead: false,
          },
        }),
      ])

    return NextResponse.json({
      user,
      profile: {
        ...customerProfile,
        totalPlayingHours: Number(customerProfile.totalPlayingHours),
        lifetimeSpending: Number(customerProfile.lifetimeSpending),
        rewardBalance: Number(customerProfile.rewardBalance),
      },
      stats: {
        totalBookings,
        upcomingBookings,
        completedBookings,
        unreadNotifications,
      },
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 * Updates the customer's display name and optional phone number (marked Unverified).
 */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (name !== undefined && String(name).trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    let cleanedPhone = undefined
    if (phone !== undefined) {
      const digitsOnly = String(phone).replace(/\D/g, '')
      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
        return NextResponse.json(
          { error: 'Please enter a valid 10-digit mobile number' },
          { status: 400 }
        )
      }
      cleanedPhone = digitsOnly.length === 10 ? digitsOnly : null
    }

    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.customerProfile.upsert({
        where: { userId: session.user.id },
        update: {
          ...(cleanedPhone !== undefined
            ? { phone: cleanedPhone, phoneVerified: false }
            : {}),
        },
        create: {
          userId: session.user.id,
          phone: cleanedPhone ?? null,
          phoneVerified: false,
        },
      }),
    ])

    await logAudit({
      userId: session.user.id,
      action: 'PROFILE_UPDATED',
      module: 'CUSTOMER_PORTAL',
      entityId: updatedProfile.id,
      entityType: 'CustomerProfile',
      changes: { name: updatedUser.name, phone: updatedProfile.phone },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      user: updatedUser,
      profile: {
        ...updatedProfile,
        totalPlayingHours: Number(updatedProfile.totalPlayingHours),
        lifetimeSpending: Number(updatedProfile.lifetimeSpending),
        rewardBalance: Number(updatedProfile.rewardBalance),
      },
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

