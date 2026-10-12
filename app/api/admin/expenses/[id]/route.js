import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const EXPENSE_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'ACCOUNTANT',
]

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !EXPENSE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, description, amount, paymentMethod, referenceNumber } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const isApproving = status && ['APPROVED', 'PAID'].includes(status)

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(isApproving
          ? { approvedBy: session.user.id, approvedAt: new Date() }
          : {}),
        ...(description !== undefined ? { description: String(description).trim() } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(referenceNumber !== undefined ? { referenceNumber } : {}),
      },
      include: { category: true },
    })

    await createAuditLog({
      userId: session.user.id,
      action: `EXPENSE_${status || 'UPDATED'}`,
      entityType: 'Expense',
      entityId: id,
      oldValues: { status: existing.status, amount: Number(existing.amount) },
      newValues: { status: updated.status, amount: Number(updated.amount) },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      expense: {
        ...updated,
        amount: Number(updated.amount),
      },
    })
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !EXPENSE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { ipAddress, userAgent } = getRequestMeta(request)

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      action: 'EXPENSE_DELETED',
      entityType: 'Expense',
      entityId: id,
      oldValues: existing,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}

