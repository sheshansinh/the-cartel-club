import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSchema, businessSettingsSchema } from '@/lib/validations'

const OWNER_ROLES = ['SUPER_ADMIN', 'BUSINESS_OWNER']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = await prisma.businessSettings.findFirst()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !OWNER_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { data, errors } = parseSchema(businessSettingsSchema, body)
    if (errors) return NextResponse.json({ error: 'Validation failed', errors }, { status: 422 })

    // Upsert — create default row if it doesn't exist yet
    const settings = await prisma.businessSettings.upsert({
      where:  { id: 'default' },
      update: data,
      create: { ...data, id: 'default' },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
