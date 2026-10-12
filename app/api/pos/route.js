import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ensureDefaultProductsAndSuppliers,
  serializeProduct,
} from '@/lib/services/inventory'
import { createPOSSale, serializePOSSale } from '@/lib/services/pos'
import { getRequestMeta } from '@/lib/services/audit'

const POS_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'CASHIER',
  'RECEPTIONIST',
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !POS_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDefaultProductsAndSuppliers()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [categories, productsRaw, salesRaw, customers, settings] = await Promise.all([
      prisma.productCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
        include: { category: true },
      }),
      prisma.pOSSale.findMany({
        orderBy: { saleDate: 'desc' },
        take: 40,
        include: {
          customer: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          items: {
            include: { product: { include: { category: true } } },
          },
          payments: true,
        },
      }),
      prisma.customerProfile.findMany({
        take: 100,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.businessSettings.findFirst(),
    ])

    const products = productsRaw.map(serializeProduct)
    const sales = salesRaw.map(serializePOSSale)

    const todaySales = sales.filter(
      (s) => !s.voidedAt && new Date(s.saleDate) >= todayStart
    )
    const todayRevenue = Number(
      todaySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0).toFixed(2)
    )

    return NextResponse.json({
      categories,
      products,
      sales,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.user?.name || 'Customer',
        phone: c.phone || '',
        email: c.user?.email || '',
      })),
      taxRate: Number(settings?.taxRate || 0),
      businessName:
        settings?.businessName && settings.businessName !== 'CUE CLUB'
          ? settings.businessName
          : 'The Cartel Club',
      businessPhone: settings?.phone || '+91 98765 43210',
      businessAddress: settings?.address || 'Ahmedabad',
      todayStats: {
        salesCount: todaySales.length,
        revenue: todayRevenue,
      },
    })
  } catch (error) {
    console.error('Error fetching POS terminal data:', error)
    return NextResponse.json({ error: 'Failed to load POS terminal' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !POS_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ipAddress, userAgent } = getRequestMeta(request)

    const sale = await createPOSSale({
      items: body.items,
      customerId: body.customerId || null,
      discountAmount: body.discountAmount || 0,
      taxRate: body.taxRate || 0,
      paymentMethod: body.paymentMethod || 'CASH',
      payments: body.payments || null,
      notes: body.notes || null,
      staffUserId: session.user.id,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ sale }, { status: 201 })
  } catch (error) {
    console.error('Error completing POS sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete POS sale' },
      { status: error.status || 500 }
    )
  }
}

