import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ensureDefaultProductsAndSuppliers,
  serializeProduct,
  recordStockMovement,
} from '@/lib/services/inventory'
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

    await ensureDefaultProductsAndSuppliers()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(categoryId ? { categoryId } : {}),
    }

    const [productsRaw, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      }),
      prisma.productCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ])

    const products = productsRaw.map(serializeProduct)
    const lowStockProducts = products.filter((p) => p.isLowStock && p.isActive)

    const summary = {
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      totalCostValue: Number(
        products.reduce((sum, p) => sum + p.stockCostValue, 0).toFixed(2)
      ),
      totalRetailValue: Number(
        products.reduce((sum, p) => sum + p.stockRetailValue, 0).toFixed(2)
      ),
    }

    return NextResponse.json({
      products,
      lowStockProducts,
      categories,
      summary,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !INVENTORY_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      categoryId,
      sku,
      barcode,
      description,
      purchaseCost,
      sellingPrice,
      currentStock,
      minStockLevel,
      unit,
      imageUrl,
    } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Product name and category are required' },
        { status: 400 }
      )
    }

    const initialStock = Math.max(0, Number(currentStock || 0))
    const cost = Math.max(0, Number(purchaseCost || 0))
    const price = Math.max(0, Number(sellingPrice || 0))
    const minStock = Math.max(0, Number(minStockLevel || 0))

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: String(name).trim(),
          categoryId,
          sku: sku ? String(sku).trim().toUpperCase() : null,
          barcode: barcode ? String(barcode).trim() : null,
          description: description || null,
          purchaseCost: cost,
          sellingPrice: price,
          currentStock: 0,
          minStockLevel: minStock,
          unit: unit || 'piece',
          imageUrl: imageUrl || null,
          isActive: true,
        },
        include: { category: true },
      })

      if (initialStock > 0) {
        const moved = await recordStockMovement({
          productId: product.id,
          movementType: 'PURCHASE',
          quantity: initialStock,
          reason: 'Initial opening stock on product creation',
          referenceType: 'INITIAL_STOCK',
          createdBy: session.user.id,
          tx,
        })
        return moved.product
      }

      return serializeProduct(product)
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: created.id,
      newValues: created,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ product: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}

