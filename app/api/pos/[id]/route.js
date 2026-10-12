import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializePOSSale, voidPOSSale } from '@/lib/services/pos'
import { getRequestMeta } from '@/lib/services/audit'

const POS_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'CASHIER',
  'RECEPTIONIST',
]

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !POS_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const sale = await prisma.pOSSale.findUnique({
      where: { id },
      include: {
        customer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        items: {
          include: { product: { include: { category: true } } },
        },
        payments: true,
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    return NextResponse.json({ sale: serializePOSSale(sale) })
  } catch (error) {
    console.error('Error fetching POS sale:', error)
    return NextResponse.json({ error: 'Failed to fetch POS sale' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !POS_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, voidReason } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (action === 'VOID') {
      const voided = await voidPOSSale({
        saleId: id,
        voidReason,
        staffUserId: session.user.id,
        ipAddress,
        userAgent,
      })
      return NextResponse.json({ sale: voided })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error voiding POS sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to void POS sale' },
      { status: error.status || 500 }
    )
  }
}

