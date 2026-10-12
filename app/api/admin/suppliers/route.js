import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureDefaultProductsAndSuppliers } from '@/lib/services/inventory'
import { createAuditLog, getRequestMeta } from '@/lib/services/audit'

const SUPPLIER_ROLES = [
  'SUPER_ADMIN',
  'BUSINESS_OWNER',
  'MANAGER',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !SUPPLIER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDefaultProductsAndSuppliers()

    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    })

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !SUPPLIER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, contactPerson, phone, email, address, gstNumber, notes } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Supplier name and phone number are required' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: String(name).trim(),
        contactPerson: contactPerson ? String(contactPerson).trim() : null,
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
        gstNumber: gstNumber ? String(gstNumber).trim().toUpperCase() : null,
        notes: notes || null,
        isActive: true,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'SUPPLIER_CREATED',
      entityType: 'Supplier',
      entityId: supplier.id,
      newValues: supplier,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create supplier' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !SUPPLIER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, contactPerson, phone, email, address, gstNumber, notes, isActive } = body
    const { ipAddress, userAgent } = getRequestMeta(request)

    if (!id) {
      return NextResponse.json({ error: 'Supplier id is required' }, { status: 400 })
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(contactPerson !== undefined ? { contactPerson: contactPerson || null } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(address !== undefined ? { address: address || null } : {}),
        ...(gstNumber !== undefined ? { gstNumber: gstNumber || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'SUPPLIER_UPDATED',
      entityType: 'Supplier',
      entityId: updated.id,
      newValues: updated,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ supplier: updated })
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

