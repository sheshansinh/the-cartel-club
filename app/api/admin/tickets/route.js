import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TICKET_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'SUPPORT_AGENT',
  'RECEPTIONIST',
]

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !TICKET_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const [tickets, staffList] = await Promise.all([
      prisma.supportTicket.findMany({
        where: {
          ...(status && status !== 'ALL' ? { status } : {}),
          ...(priority && priority !== 'ALL' ? { priority } : {}),
        },
        orderBy: [{ createdAt: 'desc' }],
        include: {
          customer: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          assignedToUser: {
            include: { user: { select: { id: true, name: true, role: true } } },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.employeeProfile.findMany({
        where: { isActive: true },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      }),
    ])

    return NextResponse.json({
      tickets,
      staff: staffList,
    })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

