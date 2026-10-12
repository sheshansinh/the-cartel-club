import { prisma } from '@/lib/prisma'

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Rent', description: 'Monthly club premises rent and lease' },
  { name: 'Salaries & Wages', description: 'Staff payroll, bonuses, and allowances' },
  { name: 'Electricity & Utilities', description: 'Power, AC, water, and municipal bills' },
  { name: 'Internet & Software', description: 'Broadband, ERP hosting, and subscriptions' },
  { name: 'Inventory Purchases', description: 'Beverages, snacks, and counter stock' },
  { name: 'Repairs & Maintenance', description: 'Table cloth, pockets, lighting, and AC servicing' },
  { name: 'Equipment Purchases', description: 'Cues, Aramith balls, scoreboards, and furniture' },
  { name: 'Marketing & Advertising', description: 'Instagram ads, tournaments, and promotions' },
  { name: 'Miscellaneous', description: 'General office and housekeeping expenses' },
]

export async function ensureExpenseCategories() {
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
}

/**
 * Resolves startDate and endDate from a range string ('7d', '30d', '90d', '1y', 'all')
 * or explicit from/to dates.
 */
export function resolveDateRange({ range = '30d', from = null, to = null } = {}) {
  const endDate = to ? new Date(to) : new Date()
  endDate.setHours(23, 59, 59, 999)

  if (from) {
    const startDate = new Date(from)
    startDate.setHours(0, 0, 0, 0)
    return { startDate, endDate }
  }

  const daysMap = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  }
  const days = daysMap[range] || 30
  const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  startDate.setHours(0, 0, 0, 0)

  return { startDate, endDate, days }
}

/**
 * Computes full P&L, revenue breakdown, expense breakdown, daily series,
 * peak hours, and table utilization for the requested date window.
 */
export async function getFinancialReport({ range = '30d', from = null, to = null } = {}) {
  await ensureExpenseCategories()

  const { startDate, endDate, days = 30 } = resolveDateRange({ range, from, to })
  const prevEndDate = new Date(startDate.getTime() - 1)
  const prevStartDate = new Date(prevEndDate.getTime() - days * 24 * 60 * 60 * 1000)

  const [
    payments,
    prevPayments,
    expenses,
    prevExpenses,
    bookings,
    prevBookingsCount,
    sessions,
    posSales,
    tables,
    customersCount,
    prevCustomersCount,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        booking: { include: { table: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: prevStartDate, lte: prevEndDate },
      },
    }),
    prisma.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      where: {
        status: { in: ['APPROVED', 'PAID'] },
        date: { gte: prevStartDate, lte: prevEndDate },
      },
    }),
    prisma.booking.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
      },
      include: { table: true },
      orderBy: { bookingDate: 'desc' },
    }),
    prisma.booking.count({
      where: {
        bookingDate: { gte: prevStartDate, lte: prevEndDate },
      },
    }),
    prisma.gamingSession.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
      },
      include: { table: true },
    }),
    prisma.pOSSale.findMany({
      where: {
        saleDate: { gte: startDate, lte: endDate },
        voidedAt: null,
      },
      include: {
        items: { include: { product: true } },
      },
    }),
    prisma.table.findMany({
      where: { isActive: true },
      orderBy: { sequence: 'asc' },
    }),
    prisma.customerProfile.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.customerProfile.count({
      where: { createdAt: { gte: prevStartDate, lte: prevEndDate } },
    }),
  ])

  // 1. Revenue Breakdown from PAID inflows
  const paidInflows = payments.filter(
    (p) =>
      p.status === 'PAID' &&
      ['BOOKING_ADVANCE', 'BOOKING_FULL', 'SESSION_PAYMENT', 'POS_SALE'].includes(
        p.paymentType
      )
  )

  let bookingRevenue = 0
  let sessionRevenue = 0
  let posRevenue = 0

  const revenueByMethod = {
    CASH: 0,
    UPI: 0,
    RAZORPAY: 0,
    CARD: 0,
    BANK_TRANSFER: 0,
  }

  for (const p of paidInflows) {
    const amt = Number(p.amount || 0)
    if (p.paymentType === 'BOOKING_ADVANCE' || p.paymentType === 'BOOKING_FULL') {
      bookingRevenue += amt
    } else if (p.paymentType === 'SESSION_PAYMENT') {
      sessionRevenue += amt
    } else if (p.paymentType === 'POS_SALE') {
      posRevenue += amt
    }

    const method = p.paymentMethod || 'RAZORPAY'
    revenueByMethod[method] = Number(((revenueByMethod[method] || 0) + amt).toFixed(2))
  }

  const totalRevenue = Number((bookingRevenue + sessionRevenue + posRevenue).toFixed(2))
  const prevTotalRevenue = Number(
    prevPayments
      .filter((p) =>
        ['BOOKING_ADVANCE', 'BOOKING_FULL', 'SESSION_PAYMENT', 'POS_SALE'].includes(
          p.paymentType
        )
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      .toFixed(2)
  )

  // 2. Expenses Breakdown
  const activeExpenses = expenses.filter((e) => e.status !== 'REJECTED')
  const approvedOrPaidExpenses = expenses.filter((e) =>
    ['APPROVED', 'PAID'].includes(e.status)
  )
  const pendingExpenses = expenses.filter((e) => e.status === 'PENDING')

  const totalExpenses = Number(
    approvedOrPaidExpenses
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
      .toFixed(2)
  )
  const pendingExpensesTotal = Number(
    pendingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toFixed(2)
  )
  const prevTotalExpenses = Number(
    prevExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toFixed(2)
  )

  const expensesByCategoryMap = new Map()
  for (const exp of activeExpenses) {
    const catName = exp.category?.name || 'Uncategorized'
    const current = expensesByCategoryMap.get(catName) || 0
    expensesByCategoryMap.set(catName, Number((current + Number(exp.amount || 0)).toFixed(2)))
  }
  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // 3. Net Profit & Margin
  const netProfit = Number((totalRevenue - totalExpenses).toFixed(2))
  const profitMargin =
    totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0

  // 4. Growth calculations
  const calcGrowth = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? 100 : 0
    return Number((((curr - prev) / prev) * 100).toFixed(1))
  }

  const avgDuration =
    bookings.length > 0
      ? Number(
          (
            bookings.reduce((s, b) => s + Number(b.durationHours || 1), 0) /
            bookings.length
          ).toFixed(1)
        )
      : 0

  // 5. Peak Hours Distribution (from bookings & gaming sessions)
  const hourBuckets = new Map()
  for (let h = 12; h <= 23; h++) {
    const label =
      h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`
    hourBuckets.set(h, { hour: label, bookings: 0 })
  }

  for (const b of bookings) {
    const hr = parseInt(String(b.startTime || '18:00').split(':')[0], 10)
    if (hourBuckets.has(hr)) {
      hourBuckets.get(hr).bookings += 1
    }
  }
  for (const s of sessions) {
    const hr = new Date(s.startTime).getHours()
    if (hourBuckets.has(hr)) {
      hourBuckets.get(hr).bookings += 1
    }
  }
  const peakHours = Array.from(hourBuckets.values())

  // 6. Table Utilization & Revenue
  const tableStats = tables.map((table) => {
    const tableBookings = bookings.filter(
      (b) => b.tableId === table.id && b.status !== 'CANCELLED'
    )
    const tableSessions = sessions.filter(
      (s) => s.tableId === table.id && s.status !== 'CANCELLED'
    )
    const hoursPlayed =
      tableBookings.reduce((sum, b) => sum + Number(b.durationHours || 0), 0) +
      tableSessions.reduce((sum, s) => sum + Number(s.actualDuration || 0), 0)

    const maxAvailableHours = Math.max(1, Math.min(days, 30) * 11) // 11 operating hours/day
    const utilization = Math.min(
      100,
      Math.round((hoursPlayed / maxAvailableHours) * 100)
    )

    return {
      id: table.id,
      table: table.name,
      tableNumber: table.tableNumber,
      type: table.type,
      bookingsCount: tableBookings.length + tableSessions.length,
      hoursPlayed: Number(hoursPlayed.toFixed(1)),
      utilization,
    }
  })

  // 7. Daily Cashflow Series (last 7 or 14 days inside range)
  const dailyMap = new Map()
  const seriesDays = Math.min(days, 14)
  for (let i = seriesDays - 1; i >= 0; i--) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
    dailyMap.set(key, { date: key, day: label, revenue: 0, expenses: 0, net: 0 })
  }

  for (const p of paidInflows) {
    const key = new Date(p.paidAt || p.createdAt).toISOString().split('T')[0]
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)
      entry.revenue = Number((entry.revenue + Number(p.amount || 0)).toFixed(2))
      entry.net = Number((entry.revenue - entry.expenses).toFixed(2))
    }
  }

  for (const e of approvedOrPaidExpenses) {
    const key = new Date(e.date).toISOString().split('T')[0]
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)
      entry.expenses = Number((entry.expenses + Number(e.amount || 0)).toFixed(2))
      entry.net = Number((entry.revenue - entry.expenses).toFixed(2))
    }
  }

  const dailySeries = Array.from(dailyMap.values())

  return {
    period: {
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    kpis: {
      totalRevenue,
      prevTotalRevenue,
      revenueGrowth: calcGrowth(totalRevenue, prevTotalRevenue),
      bookingRevenue: Number(bookingRevenue.toFixed(2)),
      sessionRevenue: Number(sessionRevenue.toFixed(2)),
      posRevenue: Number(posRevenue.toFixed(2)),
      totalExpenses,
      prevTotalExpenses,
      expenseGrowth: calcGrowth(totalExpenses, prevTotalExpenses),
      pendingExpensesTotal,
      netProfit,
      profitMargin,
      totalBookings: bookings.length,
      bookingsGrowth: calcGrowth(bookings.length, prevBookingsCount),
      newCustomers: customersCount,
      customersGrowth: calcGrowth(customersCount, prevCustomersCount),
      avgDuration,
      posOrdersCount: posSales.length,
      sessionsCount: sessions.length,
    },
    revenueByMethod,
    expensesByCategory,
    peakHours,
    tableUtilization: tableStats,
    dailySeries,
  }
}

