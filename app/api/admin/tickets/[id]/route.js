import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const TICKET_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'SUPPORT_AGENT',
  'RECEPTIONIST',
]

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !TICKET_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      status,
      priority,
      assignedTo,
      resolution,
      replyMessage,
      isInternal = false,
    } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { customer: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (replyMessage && String(replyMessage).trim()) {
        await tx.ticketMessage.create({
          data: {
            ticketId: id,
            isInternal: Boolean(isInternal),
            message: String(replyMessage).trim(),
            senderId: session.user.id,
            senderName: `${session.user.name || 'Support Staff'} (${session.user.role})`,
          },
        })
      }

      const nextStatus =
        status ||
        (replyMessage && !isInternal && ticket.status === 'OPEN'
          ? 'IN_PROGRESS'
          : ticket.status)

      const t = await tx.supportTicket.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(priority ? { priority } : {}),
          ...(assignedTo !== undefined ? { assignedTo: assignedTo || null } : {}),
          ...(resolution !== undefined ? { resolution: resolution || null } : {}),
          ...(nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
            ? { resolvedAt: new Date() }
            : {}),
        },
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
      })

      // Send customer notification if public reply or resolved
      if (ticket.customer?.userId && ((replyMessage && !isInternal) || nextStatus === 'RESOLVED')) {
        await tx.notification.create({
          data: {
            userId: ticket.customer.userId,
            title:
              nextStatus === 'RESOLVED'
                ? `Ticket ${ticket.ticketNumber} Resolved`
                : `New Reply on Ticket ${ticket.ticketNumber}`,
            message:
              replyMessage && !isInternal
                ? String(replyMessage).trim()
                : resolution || `Your support ticket "${ticket.subject}" has been resolved.`,
            type: 'TICKET',
            actionUrl: '/tickets',
          },
        })
      }

      return t
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'SupportTicket',
      entityId: id,
      newValues: {
        ticketNumber: updated.ticketNumber,
        status: updated.status,
        priority: updated.priority,
        assignedTo: updated.assignedTo,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ ticket: updated })
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update ticket' },
      { status: 500 }
    )
  }
}

