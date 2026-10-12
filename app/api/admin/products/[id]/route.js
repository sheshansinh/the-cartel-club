import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeProduct } from '@/lib/services/inventory'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const INVENTORY_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'INVENTORY_MANAGER',
]

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !INVENTORY_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { ipAddress, userAgent } = getRequestMeta(request)

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.sku !== undefined
          ? { sku: body.sku ? String(body.sku).trim().toUpperCase() : null }
          : {}),
        ...(body.barcode !== undefined
          ? { barcode: body.barcode ? String(body.barcode).trim() : null }
          : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.purchaseCost !== undefined
          ? { purchaseCost: Math.max(0, Number(body.purchaseCost)) }
          : {}),
        ...(body.sellingPrice !== undefined
          ? { sellingPrice: Math.max(0, Number(body.sellingPrice)) }
          : {}),
        ...(body.minStockLevel !== undefined
          ? { minStockLevel: Math.max(0, Number(body.minStockLevel)) }
          : {}),
        ...(body.unit !== undefined ? { unit: body.unit || 'piece' } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      include: { category: true },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ product: serializeProduct(updated) })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !INVENTORY_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { ipAddress, userAgent } = getRequestMeta(request)

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'PRODUCT_DEACTIVATED',
      entityType: 'Product',
      entityId: id,
      oldValues: { isActive: existing.isActive },
      newValues: { isActive: false },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true, product: serializeProduct(updated) })
  } catch (error) {
    console.error('Error deactivating product:', error)
    return NextResponse.json({ error: 'Failed to deactivate product' }, { status: 500 })
  }
}

