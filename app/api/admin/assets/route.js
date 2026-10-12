import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const ASSET_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'INVENTORY_MANAGER',
]

async function ensureDefaultAssets() {
  const count = await prisma.asset.count()
  if (count > 0) return

  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const twoYearsAhead = new Date(now.getTime() + 540 * 24 * 60 * 60 * 1000)
  const expiringSoon = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)

  const defaults = [
    {
      name: 'Riley Aristocrat Championship Snooker Table (VIP)',
      category: 'Gaming Tables',
      serialNumber: 'RLY-SNK-2025-001',
      purchaseDate: oneYearAgo,
      purchaseCost: 425000,
      status: 'OPERATIONAL',
      location: 'VIP Lounge',
      warrantyEnd: twoYearsAhead,
      warrantyProvider: 'Riley England Official India Partner',
    },
    {
      name: 'Rasson Ox Tournament Pool Table #1',
      category: 'Gaming Tables',
      serialNumber: 'RSN-OX-2025-014',
      purchaseDate: oneYearAgo,
      purchaseCost: 265000,
      status: 'OPERATIONAL',
      location: 'Main Arena - Bay 1',
      warrantyEnd: twoYearsAhead,
      warrantyProvider: 'Apex Billiards & Sports Co.',
    },
    {
      name: 'Daikin 4.0 Ton Cassette AC Unit (Main Hall)',
      category: 'HVAC & Electrical',
      serialNumber: 'DKN-CAS-40T-882',
      purchaseDate: oneYearAgo,
      purchaseCost: 118000,
      status: 'OPERATIONAL',
      location: 'Main Arena Ceiling',
      warrantyEnd: expiringSoon,
      warrantyProvider: 'Daikin India Commercial Care',
    },
    {
      name: 'Aramith Tournament Pro-Cup Ball Sets (6x)',
      category: 'Equipment',
      serialNumber: 'ARM-PRO-SET-06',
      purchaseDate: oneYearAgo,
      purchaseCost: 96000,
      status: 'OPERATIONAL',
      location: 'Reception Vault',
      warrantyEnd: twoYearsAhead,
      warrantyProvider: 'Apex Billiards & Sports Co.',
    },
  ]

  for (const item of defaults) {
    const created = await prisma.asset.create({
      data: {
        name: item.name,
        category: item.category,
        serialNumber: item.serialNumber,
        purchaseDate: item.purchaseDate,
        purchaseCost: item.purchaseCost,
        status: item.status,
        location: item.location,
        warranties: {
          create: {
            startDate: item.purchaseDate,
            endDate: item.warrantyEnd,
            provider: item.warrantyProvider,
            notes: 'Comprehensive manufacturer & parts warranty',
          },
        },
      },
    })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ASSET_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDefaultAssets()

    const [assetsRaw, maintenanceRaw, suppliers] = await Promise.all([
      prisma.asset.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          warranties: { orderBy: { endDate: 'desc' } },
          maintenanceRecords: { orderBy: { reportedDate: 'desc' } },
        },
      }),
      prisma.maintenanceRecord.findMany({
        orderBy: { reportedDate: 'desc' },
        take: 100,
        include: {
          asset: true,
        },
      }),
      prisma.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ])

    const now = new Date()
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const assets = assetsRaw.map((a) => {
      const latestWarranty = a.warranties?.[0] || null
      let warrantyStatus = 'NONE'
      if (latestWarranty) {
        const end = new Date(latestWarranty.endDate)
        if (end < now) warrantyStatus = 'EXPIRED'
        else if (end <= thirtyDaysOut) warrantyStatus = 'EXPIRING_SOON'
        else warrantyStatus = 'ACTIVE'
      }

      return {
        ...a,
        purchaseCost: Number(a.purchaseCost || 0),
        latestWarranty,
        warrantyStatus,
        maintenanceRecords: (a.maintenanceRecords || []).map((m) => ({
          ...m,
          cost: Number(m.cost || 0),
        })),
      }
    })

    const maintenanceRecords = maintenanceRaw.map((m) => ({
      ...m,
      cost: Number(m.cost || 0),
    }))

    return NextResponse.json({
      assets,
      maintenanceRecords,
      suppliers,
    })
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ASSET_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    // 1. Log Maintenance Record
    if (action === 'LOG_MAINTENANCE') {
      const { assetId, description, cost, status, notes } = body
      if (!assetId || !description) {
        return NextResponse.json(
          { error: 'assetId and description are required' },
          { status: 400 }
        )
      }

      const cleanCost = Math.max(0, Number(cost || 0))
      const maintStatus = status || 'PENDING'

      const record = await prisma.$transaction(async (tx) => {
        const m = await tx.maintenanceRecord.create({
          data: {
            assetId,
            description: String(description).trim(),
            cost: cleanCost,
            status: maintStatus,
            resolvedAt: maintStatus === 'RESOLVED' ? new Date() : null,
            resolvedBy: maintStatus === 'RESOLVED' ? session.user.id : null,
            notes: notes || null,
          },
          include: { asset: true },
        })

        // Update asset status automatically
        if (maintStatus !== 'RESOLVED') {
          await tx.asset.update({
            where: { id: assetId },
            data: { status: 'UNDER_MAINTENANCE' },
          })
        } else {
          await tx.asset.update({
            where: { id: assetId },
            data: { status: 'OPERATIONAL' },
          })
        }

        // If cost > 0, also log to Expense under 'Repairs & Maintenance'
        if (cleanCost > 0) {
          const repCat = await tx.expenseCategory.upsert({
            where: { name: 'Repairs & Maintenance' },
            update: {},
            create: { name: 'Repairs & Maintenance' },
          })
          await tx.expense.create({
            data: {
              categoryId: repCat.id,
              amount: cleanCost,
              date: new Date(),
              description: `Asset Maintenance (${m.asset.name}): ${description}`,
              paymentMethod: 'CASH',
              status: 'PAID',
              approvedBy: session.user.id,
              approvedAt: new Date(),
              createdBy: session.user.id,
            },
          })
        }

        return m
      })

      await createAuditLog({
        userId: session.user.id,
        action: 'ASSET_MAINTENANCE_LOGGED',
        entityType: 'MaintenanceRecord',
        entityId: record.id,
        newValues: { assetId, description, cost: cleanCost, status: maintStatus },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ maintenanceRecord: record }, { status: 201 })
    }

    // 2. Default: Create Asset (+ optional Warranty)
    const {
      name,
      category,
      serialNumber,
      purchaseDate,
      purchaseCost,
      supplierId,
      location,
      notes,
      warrantyEndDate,
      warrantyProvider,
    } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Asset name and category are required' },
        { status: 400 }
      )
    }

    const pDate = purchaseDate ? new Date(purchaseDate) : new Date()
    const created = await prisma.asset.create({
      data: {
        name: String(name).trim(),
        category: String(category).trim(),
        serialNumber: serialNumber ? String(serialNumber).trim() : null,
        purchaseDate: pDate,
        purchaseCost: Math.max(0, Number(purchaseCost || 0)),
        supplierId: supplierId || null,
        status: 'OPERATIONAL',
        location: location ? String(location).trim() : null,
        notes: notes || null,
        ...(warrantyEndDate
          ? {
              warranties: {
                create: {
                  startDate: pDate,
                  endDate: new Date(warrantyEndDate),
                  provider: warrantyProvider || null,
                  notes: 'Warranty registered on asset creation',
                },
              },
            }
          : {}),
      },
      include: {
        supplier: true,
        warranties: true,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'ASSET_CREATED',
      entityType: 'Asset',
      entityId: created.id,
      newValues: { name: created.name, category: created.category, purchaseCost },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ asset: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating asset:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create asset' },
      { status: 500 }
    )
  }
}

