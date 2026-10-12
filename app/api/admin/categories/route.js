import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureDefaultProductsAndSuppliers } from '@/lib/services/inventory'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const INVENTORY_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'INVENTORY_MANAGER',
  'RECEPTIONIST',
  'CASHIER',
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !INVENTORY_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDefaultProductsAndSuppliers()

    const categories = await prisma.productCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching product categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !INVENTORY_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, sortOrder } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const category = await prisma.productCategory.upsert({
      where: { name: String(name).trim() },
      update: {
        description: description || null,
        sortOrder: Number(sortOrder || 0),
        isActive: true,
      },
      create: {
        name: String(name).trim(),
        description: description || null,
        sortOrder: Number(sortOrder || 0),
        isActive: true,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'PRODUCT_CATEGORY_UPSERTED',
      entityType: 'ProductCategory',
      entityId: category.id,
      newValues: category,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    )
  }
}

