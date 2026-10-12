import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ensureDefaultProductsAndSuppliers,
  createPurchaseOrder,
  serializeProduct,
} from '@/lib/services/inventory'
import { getRequestMeta } from '@/lib/services/audit'

const PO_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
]

function serializePO(po) {
  return {
    ...po,
    subtotal: Number(po.subtotal || 0),
    taxAmount: Number(po.taxAmount || 0),
    totalAmount: Number(po.totalAmount || 0),
    paidAmount: Number(po.paidAmount || 0),
    items: (po.items || []).map((item) => ({
      ...item,
      orderedQuantity: Number(item.orderedQuantity || 0),
      receivedQuantity: Number(item.receivedQuantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
    })),
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !PO_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDefaultProductsAndSuppliers()

    const [ordersRaw, suppliers, productsRaw] = await Promise.all([
      prisma.purchaseOrder.findMany({
        orderBy: { orderDate: 'desc' },
        take: 100,
        include: {
          supplier: true,
          items: {
            include: { product: { include: { category: true } } },
          },
        },
      }),
      prisma.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: { category: true },
      }),
    ])

    const purchaseOrders = ordersRaw.map(serializePO)
    const products = productsRaw.map(serializeProduct)

    return NextResponse.json({
      purchaseOrders,
      suppliers,
      products,
    })
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !PO_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ipAddress, userAgent } = getRequestMeta(request)

    const po = await createPurchaseOrder({
      supplierId: body.supplierId,
      expectedDate: body.expectedDate,
      items: body.items,
      taxAmount: body.taxAmount,
      paidAmount: body.paidAmount,
      status: body.status || 'CONFIRMED',
      notes: body.notes,
      staffUserId: session.user.id,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ purchaseOrder: serializePO(po) }, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase order' },
      { status: error.status || 500 }
    )
  }
}

