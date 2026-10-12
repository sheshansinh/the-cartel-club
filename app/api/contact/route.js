import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request) {
  try {
    const body = await request.json()
    
    const { name, phone, email, message } = body

    // Validate required fields
    if (!name || !phone || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create contact message
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        phone,
        email: email || null,
        message,
        status: 'NEW',
      },
    })

    return NextResponse.json({ contactMessage }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact message:', error)
    return NextResponse.json(
      { error: 'Failed to submit message' },
      { status: 500 }
    )
  }
}
