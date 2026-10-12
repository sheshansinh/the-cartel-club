import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tickets
 * Customer: list own support tickets.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.customerProfile.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    })

    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

/**
 * POST /api/tickets
 * Customer: create a new support ticket with server-generated ticketNumber.
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, category, priority, description } = body

    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      )
    }

    const profile = await prisma.customerProfile.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    })

    const count = await prisma.supportTicket.count()
    const year = new Date().getFullYear()
    const ticketNumber = `TKT-${year}-${String(count + 1).padStart(5, '0')}`

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: profile.id,
        subject: String(subject).trim(),
        category: category || 'General',
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        description: String(description).trim(),
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}

