import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'
import bcrypt from 'bcryptjs'

const HR_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'ACCOUNTANT',
]

async function ensureDefaultEmployees() {
  const count = await prisma.employeeProfile.count()
  if (count > 0) return

  const defaultStaff = [
    {
      name: 'Rohan Desai',
      email: 'rohan@cueclub.com',
      role: 'MANAGER',
      phone: '+91 98251 10011',
      address: 'Satellite, Ahmedabad',
      salary: 35000,
    },
    {
      name: 'Karan Joshi',
      email: 'karan@cueclub.com',
      role: 'RECEPTIONIST',
      phone: '+91 98251 10022',
      address: 'Vastrapur, Ahmedabad',
      salary: 22000,
    },
    {
      name: 'Meet Parmar',
      email: 'meet@cueclub.com',
      role: 'CASHIER',
      phone: '+91 98251 10033',
      address: 'Navrangpura, Ahmedabad',
      salary: 20000,
    },
  ]

  const defaultHash = await bcrypt.hash('Staff@2026!', 10)

  for (const s of defaultStaff) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { role: s.role, name: s.name },
      create: {
        name: s.name,
        email: s.email,
        passwordHash: defaultHash,
        role: s.role,
        isActive: true,
      },
    })

    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        phone: s.phone,
        address: s.address,
        salary: s.salary,
        isActive: true,
      },
    })
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !HR_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDefaultEmployees()

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const targetDate = new Date(dateParam)
    targetDate.setHours(0, 0, 0, 0)

    const [employeesRaw, attendanceRaw, shiftsRaw, salaryRecordsRaw] = await Promise.all([
      prisma.employeeProfile.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, isActive: true },
          },
        },
      }),
      prisma.attendance.findMany({
        orderBy: { date: 'desc' },
        take: 100,
        include: {
          employee: {
            include: { user: { select: { name: true, role: true } } },
          },
        },
      }),
      prisma.shift.findMany({
        orderBy: { date: 'desc' },
        take: 50,
        include: {
          employee: {
            include: { user: { select: { name: true, role: true } } },
          },
        },
      }),
      prisma.salaryRecord.findMany({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 100,
        include: {
          employee: {
            include: { user: { select: { name: true, role: true } } },
          },
        },
      }),
    ])

    const employees = employeesRaw.map((e) => ({
      ...e,
      salary: Number(e.salary || 0),
    }))

    const salaryRecords = salaryRecordsRaw.map((sr) => ({
      ...sr,
      baseSalary: Number(sr.baseSalary || 0),
      bonus: Number(sr.bonus || 0),
      deductions: Number(sr.deductions || 0),
      netSalary: Number(sr.netSalary || 0),
    }))

    return NextResponse.json({
      employees,
      attendance: attendanceRaw,
      shifts: shiftsRaw,
      salaryRecords,
    })
  } catch (error) {
    console.error('Error fetching employees data:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !HR_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    // 1. Mark / Upsert Attendance
    if (action === 'MARK_ATTENDANCE') {
      const { employeeId, date, status, notes } = body
      if (!employeeId || !date) {
        return NextResponse.json(
          { error: 'employeeId and date are required' },
          { status: 400 }
        )
      }
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)

      const now = new Date()
      const record = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: d,
          },
        },
        update: {
          status: status || 'PRESENT',
          checkOutTime: status === 'PRESENT' ? now : null,
          notes: notes || null,
        },
        create: {
          employeeId,
          date: d,
          status: status || 'PRESENT',
          checkInTime: status === 'PRESENT' || status === 'LATE' ? now : null,
          notes: notes || null,
        },
        include: {
          employee: { include: { user: { select: { name: true, role: true } } } },
        },
      })

      return NextResponse.json({ attendance: record }, { status: 201 })
    }

    // 2. Schedule Shift
    if (action === 'CREATE_SHIFT') {
      const { employeeId, date, startTime, endTime, notes } = body
      if (!employeeId || !date || !startTime || !endTime) {
        return NextResponse.json(
          { error: 'employeeId, date, startTime, and endTime are required' },
          { status: 400 }
        )
      }

      const d = new Date(date)
      const [sh, sm] = String(startTime).split(':').map(Number)
      const [eh, em] = String(endTime).split(':').map(Number)
      const startDt = new Date(d)
      startDt.setHours(sh || 12, sm || 0, 0, 0)
      const endDt = new Date(d)
      endDt.setHours(eh || 20, em || 0, 0, 0)

      const shift = await prisma.shift.create({
        data: {
          employeeId,
          date: d,
          startTime: startDt,
          endTime: endDt,
          notes: notes || null,
        },
        include: {
          employee: { include: { user: { select: { name: true, role: true } } } },
        },
      })

      return NextResponse.json({ shift }, { status: 201 })
    }

    // 3. Process / Record Salary Payroll
    if (action === 'PROCESS_SALARY') {
      const { employeeId, month, year, baseSalary, bonus, deductions, markPaid, notes } =
        body
      if (!employeeId || !month || !year) {
        return NextResponse.json(
          { error: 'employeeId, month, and year are required' },
          { status: 400 }
        )
      }

      const base = Number(baseSalary || 0)
      const bon = Number(bonus || 0)
      const ded = Number(deductions || 0)
      const netSalary = Math.max(0, Number((base + bon - ded).toFixed(2)))
      const paidAt = markPaid ? new Date() : null

      const salaryRecord = await prisma.salaryRecord.upsert({
        where: {
          employeeId_month_year: {
            employeeId,
            month: Number(month),
            year: Number(year),
          },
        },
        update: {
          baseSalary: base,
          bonus: bon,
          deductions: ded,
          netSalary,
          ...(markPaid ? { paidAt } : {}),
          notes: notes || null,
        },
        create: {
          employeeId,
          month: Number(month),
          year: Number(year),
          baseSalary: base,
          bonus: bon,
          deductions: ded,
          netSalary,
          paidAt,
          notes: notes || null,
        },
        include: {
          employee: { include: { user: { select: { name: true, role: true } } } },
        },
      })

      // Also log under 'Salaries & Wages' Expense category if marked paid
      if (markPaid && netSalary > 0) {
        const salCat = await prisma.expenseCategory.upsert({
          where: { name: 'Salaries & Wages' },
          update: {},
          create: { name: 'Salaries & Wages' },
        })
        await prisma.expense.create({
          data: {
            categoryId: salCat.id,
            amount: netSalary,
            date: new Date(),
            description: `Salary Payroll (${month}/${year}) - ${
              salaryRecord.employee?.user?.name || 'Employee'
            }`,
            paymentMethod: 'BANK_TRANSFER',
            status: 'PAID',
            approvedBy: session.user.id,
            approvedAt: new Date(),
            createdBy: session.user.id,
          },
        })
      }

      await createAuditLog({
        userId: session.user.id,
        action: 'SALARY_PROCESSED',
        entityType: 'SalaryRecord',
        entityId: salaryRecord.id,
        newValues: { employeeId, month, year, netSalary, markPaid },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ salaryRecord }, { status: 201 })
    }

    // 4. Default: Create New Staff Employee
    const { name, email, password, role, phone, address, salary } = body
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password || 'Staff@2026!', 10)
    const staffRole = role || 'RECEPTIONIST'

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: String(email).trim().toLowerCase() },
        update: {
          name: String(name).trim(),
          role: staffRole,
          isActive: true,
        },
        create: {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          passwordHash,
          role: staffRole,
          isActive: true,
        },
      })

      return tx.employeeProfile.upsert({
        where: { userId: user.id },
        update: {
          phone: String(phone).trim(),
          address: address || null,
          salary: Number(salary || 0),
          isActive: true,
        },
        create: {
          userId: user.id,
          phone: String(phone).trim(),
          address: address || null,
          salary: Number(salary || 0),
          isActive: true,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, isActive: true },
          },
        },
      })
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'EMPLOYEE_CREATED',
      entityType: 'EmployeeProfile',
      entityId: created.id,
      newValues: { name, email, role: staffRole, salary: Number(salary || 0) },
      ipAddress,
      userAgent,
    })

    return NextResponse.json(
      { employee: { ...created, salary: Number(created.salary || 0) } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in employees POST:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process employee request' },
      { status: 500 }
    )
  }
}

