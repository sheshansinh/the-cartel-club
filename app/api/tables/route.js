import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  expireOldHolds,
  to24Hour,
  addHoursToTime,
  parseDurationHours,
  intervalsOverlap,
  getDayBounds,
  ACTIVE_BOOKING_STATUSES,
  getBusinessSettings,
} from '@/lib/services/booking'
import {
  parseTablePricing,
  getTablePriceForDuration,
} from '@/lib/services/table-pricing'

/**
 * GET /api/tables
 * Optional query params:
 *   date          (YYYY-MM-DD)
 *   time / startTime ("6:00 PM" or "18:00")
 *   duration / durationHours ("2 Hours" or 2)
 *
 * Returns all active tables managed in the Admin Panel (/admin/tables),
 * including custom pricingTiers and real-time availability.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startTimeRaw = searchParams.get('time') || searchParams.get('startTime')
    const durationRaw =
      searchParams.get('durationHours') || searchParams.get('duration') || '1'
    const durationHours = parseDurationHours(durationRaw) || 1

    // 1. Clean up expired booking holds before checking availability
    await expireOldHolds()

    // 2. Fetch active tables, active live sessions, and business booking settings in parallel
    const [tables, activeSessions, settings] = await Promise.all([
      prisma.table.findMany({
        where: { isActive: true },
        orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.gamingSession.findMany({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        select: { tableId: true },
      }),
      getBusinessSettings(),
    ])

    const activeFloorTableIds = new Set(activeSessions.map((s) => s.tableId))

    if (!date || !startTimeRaw) {
      return NextResponse.json({
        tables: tables.map((t) => {
          const { cleanDescription, pricingTiers, effectiveHourlyRate } =
            parseTablePricing(t)
          const hourlyRate = effectiveHourlyRate || Number(t.hourlyRate || 200)
          const isOccupiedNow =
            activeFloorTableIds.has(t.id) || t.status === 'OCCUPIED'
          const liveStatus =
            t.status === 'MAINTENANCE' || t.status === 'INACTIVE'
              ? t.status
              : isOccupiedNow
              ? 'OCCUPIED'
              : 'AVAILABLE'

          return {
            ...t,
            status: liveStatus,
            description: cleanDescription,
            hourlyRate,
            pricingTiers,
            calculatedTotal: getTablePriceForDuration(t, durationHours),
            isAvailable: t.status !== 'MAINTENANCE' && t.status !== 'INACTIVE',
          }
        }),
        settings,
      })
    }

    const startHHMM = to24Hour(startTimeRaw)
    const endHHMM = addHoursToTime(startHHMM, durationHours)
    const { rangeStart, rangeEnd } = getDayBounds(date)

    // 3. Fetch active bookings for that date and check overlap using minute arithmetic
    const existingBookings = await prisma.booking.findMany({
      where: {
        bookingDate: { gte: rangeStart, lte: rangeEnd },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      select: {
        tableId: true,
        startTime: true,
        endTime: true,
      },
    })

    const conflictingTableIds = new Set(
      existingBookings
        .filter((b) =>
          intervalsOverlap(b.startTime, b.endTime, startHHMM, endHHMM)
        )
        .map((b) => b.tableId)
    )

    const tablesWithAvailability = tables.map((table) => {
      const { cleanDescription, pricingTiers, effectiveHourlyRate } =
        parseTablePricing(table)
      const hourlyRate = effectiveHourlyRate || Number(table.hourlyRate || 200)
      const totalAmount = getTablePriceForDuration(table, durationHours)
      const payableAmount = settings.fullPaymentOnly
        ? totalAmount
        : Math.min(totalAmount, Number(settings.advanceAmount))

      const isMaintenance =
        table.status === 'MAINTENANCE' || table.status === 'INACTIVE'

      return {
        ...table,
        description: cleanDescription,
        hourlyRate,
        pricingTiers,
        calculatedTotal: totalAmount,
        payableAmount,
        isAvailable: !isMaintenance && !conflictingTableIds.has(table.id),
      }
    })

    return NextResponse.json({
      tables: tablesWithAvailability,
      settings,
    })
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}
