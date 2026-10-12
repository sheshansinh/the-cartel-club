import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordStockMovement } from '@/lib/services/inventory'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const INVENTORY_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'INVENTORY_MANAGER',
  'RECEPTIONIST',
  'CASHIER',
]

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !INVENTORY_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const movementType = searchParams.get('movementType')

    const movementsRaw = await prisma.inventoryMovement.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(movementType ? { movementType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        product: {
          include: { category: true },
        },
      },
    })

    const movements = movementsRaw.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
      previousStock: Number(m.previousStock),
      newStock: Number(m.newStock),
    }))

    return NextResponse.json({ movements })
  } catch (error) {
    console.error('Error fetching inventory movements:', error)
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !INVENTORY_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, movementType, quantity, reason } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (!productId || !movementType || !quantity) {
      return NextResponse.json(
        { error: 'productId, movementType, and quantity are required' },
        { status: 400 }
      )
    }

    const result = await recordStockMovement({
      productId,
      movementType,
      quantity: Number(quantity),
      reason: reason || `Manual ${movementType} by staff`,
      referenceType: 'MANUAL_ADJUSTMENT',
      createdBy: session.user.id,
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'INVENTORY_MOVEMENT_RECORDED',
      entityType: 'InventoryMovement',
      entityId: result.movement.id,
      newValues: {
        productId,
        movementType,
        quantity: result.movement.quantity,
        previousStock: result.movement.previousStock,
        newStock: result.movement.newStock,
        reason,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error recording stock movement:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record stock movement' },
      { status: error.status || 500 }
    )
  }
}

