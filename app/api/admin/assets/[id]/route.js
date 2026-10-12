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

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !ASSET_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, status, maintenanceId, location, notes } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (action === 'RESOLVE_MAINTENANCE' && maintenanceId) {
      const resolved = await prisma.$transaction(async (tx) => {
        const m = await tx.maintenanceRecord.update({
          where: { id: maintenanceId },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: session.user.id,
          },
        })

        await tx.asset.update({
          where: { id },
          data: { status: 'OPERATIONAL' },
        })

        return m
      })

      await createAuditLog({
        userId: session.user.id,
        action: 'ASSET_MAINTENANCE_RESOLVED',
        entityType: 'MaintenanceRecord',
        entityId: maintenanceId,
        newValues: { assetId: id, status: 'RESOLVED' },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ maintenanceRecord: resolved })
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'ASSET_UPDATED',
      entityType: 'Asset',
      entityId: id,
      newValues: { status: updated.status, location: updated.location },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ asset: updated })
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
  }
}

