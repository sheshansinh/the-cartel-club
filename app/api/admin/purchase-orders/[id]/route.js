import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { receivePurchaseOrder } from '@/lib/services/inventory'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const PO_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
]

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !PO_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, receivedItems, paidAmount, notes } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (action === 'RECEIVE') {
      const updated = await receivePurchaseOrder({
        purchaseOrderId: id,
        receivedItems,
        paidAmount,
        notes,
        staffUserId: session.user.id,
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ purchaseOrder: updated })
    }

    if (action === 'CANCEL') {
      const po = await prisma.purchaseOrder.findUnique({ where: { id } })
      if (!po) {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
      }
      if (po.status === 'RECEIVED') {
        return NextResponse.json(
          { error: 'Cannot cancel a purchase order that has already been received' },
          { status: 400 }
        )
      }

      const cancelled = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'CANCELLED', notes: notes || po.notes },
        include: { supplier: true, items: { include: { product: true } } },
      })

      await createAuditLog({
        userId: session.user.id,
        action: 'PURCHASE_ORDER_CANCELLED',
        entityType: 'PurchaseOrder',
        entityId: id,
        newValues: { status: 'CANCELLED' },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ purchaseOrder: cancelled })
    }

    // Default update (paidAmount / status / notes)
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(paidAmount !== undefined ? { paidAmount: Number(paidAmount) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { supplier: true, items: { include: { product: true } } },
    })

    return NextResponse.json({ purchaseOrder: updated })
  } catch (error) {
    console.error('Error updating purchase order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update purchase order' },
      { status: error.status || 500 }
    )
  }
}

