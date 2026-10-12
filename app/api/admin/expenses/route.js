import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureExpenseCategories } from '@/lib/services/finance'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const EXPENSE_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'ACCOUNTANT',
  'INVENTORY_MANAGER',
]

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !EXPENSE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureExpenseCategories()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const status = searchParams.get('status')

    const [expensesRaw, categories] = await Promise.all([
      prisma.expense.findMany({
        where: {
          ...(categoryId && categoryId !== 'ALL' ? { categoryId } : {}),
          ...(status && status !== 'ALL' ? { status } : {}),
        },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 150,
      }),
      prisma.expenseCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ])

    const expenses = expensesRaw.map((e) => ({
      ...e,
      amount: Number(e.amount || 0),
    }))

    const paidTotal = expenses
      .filter((e) => e.status === 'PAID' || e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.amount, 0)
    const pendingTotal = expenses
      .filter((e) => e.status === 'PENDING')
      .reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({
      expenses,
      categories,
      summary: {
        totalCount: expenses.length,
        paidTotal: Number(paidTotal.toFixed(2)),
        pendingTotal: Number(pendingTotal.toFixed(2)),
      },
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !EXPENSE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      categoryId,
      amount,
      date,
      description,
      paymentMethod,
      referenceNumber,
      status,
    } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    const cleanAmount = Number(amount || 0)
    if (!categoryId || !description || cleanAmount <= 0) {
      return NextResponse.json(
        { error: 'Category, description, and a positive amount are required' },
        { status: 400 }
      )
    }

    // Super Admin / Business Owner / Manager / Accountant expenses can be directly PAID
    const initialStatus = status || 'PAID'
    const isApprovedOrPaid = ['APPROVED', 'PAID'].includes(initialStatus)

    const created = await prisma.expense.create({
      data: {
        categoryId,
        amount: cleanAmount,
        date: date ? new Date(date) : new Date(),
        description: String(description).trim(),
        paymentMethod: paymentMethod || 'CASH',
        referenceNumber: referenceNumber ? String(referenceNumber).trim() : null,
        status: initialStatus,
        approvedBy: isApprovedOrPaid ? session.user.id : null,
        approvedAt: isApprovedOrPaid ? new Date() : null,
        createdBy: session.user.id,
      },
      include: { category: true },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'EXPENSE_CREATED',
      entityType: 'Expense',
      entityId: created.id,
      newValues: {
        category: created.category?.name,
        amount: cleanAmount,
        description: created.description,
        status: created.status,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json(
      {
        expense: {
          ...created,
          amount: Number(created.amount),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    )
  }
}

