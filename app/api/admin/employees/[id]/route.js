import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const HR_ROLES = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'MANAGER']

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !HR_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, role, phone, address, salary, isActive } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    const existing = await prisma.employeeProfile.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (name !== undefined || role !== undefined || isActive !== undefined) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(name !== undefined ? { name: String(name).trim() } : {}),
            ...(role !== undefined ? { role } : {}),
            ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
          },
        })
      }

      return tx.employeeProfile.update({
        where: { id },
        data: {
          ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
          ...(address !== undefined ? { address: address || null } : {}),
          ...(salary !== undefined ? { salary: Number(salary) } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
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
      action: 'EMPLOYEE_UPDATED',
      entityType: 'EmployeeProfile',
      entityId: id,
      newValues: { role, salary, isActive },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      employee: { ...updated, salary: Number(updated.salary || 0) },
    })
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

