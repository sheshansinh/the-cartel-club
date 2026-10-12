import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  parseTablePricing,
  encodeTableDescription,
  normalizePricingTiers,
} from '@/lib/services/table-pricing'

function serializeAdminTable(t, activeTableIds = new Set()) {
  const { cleanDescription, pricingTiers, effectiveHourlyRate } =
    parseTablePricing(t)
  const isOccupied = activeTableIds.has(t.id)
  return {
    id: t.id,
    tableNumber: t.tableNumber,
    name: t.name,
    type: t.type, // 'POOL' | 'SNOOKER'
    status: isOccupied ? 'OCCUPIED' : t.status,
    isActive: Boolean(t.isActive),
    sequence: Number(t.sequence || 0),
    hourlyRate: effectiveHourlyRate || Number(t.hourlyRate || 200),
    description: cleanDescription,
    pricingTiers,
    bookingsCount: t._count?.bookings || 0,
    sessionsCount: t._count?.gamingSessions || 0,
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [tables, activeSessions] = await Promise.all([
      prisma.table.findMany({
        orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
        include: {
          _count: { select: { bookings: true, gamingSessions: true } },
        },
      }),
      prisma.gamingSession.findMany({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        select: { tableId: true },
      }),
    ])

    const activeTableIds = new Set(activeSessions.map((s) => s.tableId))

    return NextResponse.json({
      tables: tables.map((t) => serializeAdminTable(t, activeTableIds)),
    })
  } catch (error) {
    console.error('Admin tables GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tableNumber,
      name,
      type = 'POOL',
      hourlyRate = 200,
      sequence,
      description = '',
      pricingTiers = [],
    } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      )
    }

    const normalizedType =
      String(type).toUpperCase() === 'SNOOKER' ? 'SNOOKER' : 'POOL'

    const existingTables = await prisma.table.findMany({
      select: { tableNumber: true, sequence: true },
    })

    const maxSeq = existingTables.reduce(
      (max, t) => Math.max(max, Number(t.sequence || 0)),
      0
    )
    const nextSeq =
      sequence !== undefined && sequence !== null && Number(sequence) > 0
        ? Number(sequence)
        : maxSeq + 1

    const existingNums = new Set(existingTables.map((t) => t.tableNumber))
    let resolvedTableNumber = tableNumber ? String(tableNumber).trim() : ''
    if (!resolvedTableNumber || existingNums.has(resolvedTableNumber)) {
      let candidateIdx = existingTables.length + 1
      while (existingNums.has(`T${candidateIdx}`)) {
        candidateIdx++
      }
      resolvedTableNumber = `T${candidateIdx}`
    }

    const tiers = normalizePricingTiers(pricingTiers, Number(hourlyRate || 200))
    const oneHrTier = tiers.find((t) => Number(t.durationHours) === 1)
    const finalHourlyRate = oneHrTier
      ? Number(oneHrTier.price)
      : Number(hourlyRate || 200)

    const encodedDescription = encodeTableDescription(
      description,
      tiers,
      finalHourlyRate
    )

    const created = await prisma.table.create({
      data: {
        tableNumber: resolvedTableNumber,
        name: String(name).trim(),
        type: normalizedType,
        hourlyRate: finalHourlyRate,
        sequence: nextSeq,
        description: encodedDescription,
        status: 'AVAILABLE',
        isActive: true,
      },
      include: {
        _count: { select: { bookings: true, gamingSessions: true } },
      },
    })

    return NextResponse.json(
      { table: serializeAdminTable(created) },
      { status: 201 }
    )
  } catch (error) {
    console.error('Admin tables POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create table' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Support swapping sequence order of two tables in one call
    if (body.action === 'REORDER_TABLES' && Array.isArray(body.items)) {
      await prisma.$transaction(
        body.items.map((item) =>
          prisma.table.update({
            where: { id: item.id },
            data: { sequence: Number(item.sequence) },
          })
        )
      )
      return NextResponse.json({ success: true })
    }

    const {
      id,
      tableNumber,
      name,
      type,
      status,
      isActive,
      sequence,
      hourlyRate,
      description,
      pricingTiers,
      applyPricingToSameType = false,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await prisma.table.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const parsedExisting = parseTablePricing(existing)
    const updateData = {}

    if (tableNumber !== undefined && String(tableNumber).trim()) {
      updateData.tableNumber = String(tableNumber).trim()
    }
    if (name !== undefined && String(name).trim()) {
      updateData.name = String(name).trim()
    }
    if (type !== undefined) {
      updateData.type =
        String(type).toUpperCase() === 'SNOOKER' ? 'SNOOKER' : 'POOL'
    }
    if (status !== undefined) {
      updateData.status = status
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }
    if (sequence !== undefined) {
      updateData.sequence = Number(sequence)
    }

    const nextHourlyRate =
      hourlyRate !== undefined
        ? Number(hourlyRate)
        : parsedExisting.effectiveHourlyRate
    const nextTiers =
      pricingTiers !== undefined
        ? normalizePricingTiers(pricingTiers, nextHourlyRate)
        : parsedExisting.pricingTiers

    const oneHrTier = nextTiers.find((t) => Number(t.durationHours) === 1)
    const resolvedHourlyRate =
      pricingTiers !== undefined && oneHrTier
        ? Number(oneHrTier.price)
        : nextHourlyRate

    if (hourlyRate !== undefined || pricingTiers !== undefined) {
      updateData.hourlyRate = resolvedHourlyRate
    }

    if (
      description !== undefined ||
      pricingTiers !== undefined ||
      hourlyRate !== undefined
    ) {
      const nextCleanDesc =
        description !== undefined ? description : parsedExisting.cleanDescription
      updateData.description = encodeTableDescription(
        nextCleanDesc,
        nextTiers,
        resolvedHourlyRate
      )
    }

    const updated = await prisma.table.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { bookings: true, gamingSessions: true } },
      },
    })

    // Optionally apply the same Duration & Price tiers to all tables of the same type (Pool or Snooker)
    if (applyPricingToSameType && pricingTiers !== undefined) {
      const targetType = updateData.type || existing.type
      const siblingTables = await prisma.table.findMany({
        where: { type: targetType, id: { not: id } },
      })
      for (const sib of siblingTables) {
        const sibParsed = parseTablePricing(sib)
        await prisma.table.update({
          where: { id: sib.id },
          data: {
            hourlyRate: resolvedHourlyRate,
            description: encodeTableDescription(
              sibParsed.cleanDescription,
              nextTiers,
              resolvedHourlyRate
            ),
          },
        })
      }
    }

    return NextResponse.json({ table: serializeAdminTable(updated) })
  } catch (error) {
    console.error('Admin tables PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update table' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await prisma.table.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: true, gamingSessions: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const hasHistory =
      (existing._count?.bookings || 0) > 0 ||
      (existing._count?.gamingSessions || 0) > 0

    if (!hasHistory) {
      await prisma.tableBlockout.deleteMany({ where: { tableId: id } })
      await prisma.table.delete({ where: { id } })
      return NextResponse.json({ deleted: true, mode: 'HARD_DELETE' })
    }

    // If table has historical bookings/sessions, mark it INACTIVE & isActive: false so it is removed from active use
    const table = await prisma.table.update({
      where: { id },
      data: { isActive: false, status: 'INACTIVE' },
    })

    return NextResponse.json({ deleted: true, mode: 'ARCHIVED', table })
  } catch (error) {
    console.error('Admin tables DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    )
  }
}
