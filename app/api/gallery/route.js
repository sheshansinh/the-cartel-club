import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = {
      isActive: true,
      ...(category && category !== 'All' ? { category } : {}),
    }

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: {
        sortOrder: 'asc',
      },
    })

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Error fetching gallery:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gallery' },
      { status: 500 }
    )
  }
}
