import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ARTIFACT_DIR =
  'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\cc413898-c885-471a-8ee1-ae77958c4569'

const IMAGE_MAP = {
  'arena-8ball-closeup.jpg': 'arena_8ball_closeup_v2_1791810240025.jpg',
  'arena-6-tables-lounge.jpg': 'arena_6_tables_lounge_1791810275559.jpg',
  'about-billiards-club.jpg': 'about_billiards_club_1791810298819.jpg',
  'snooker-table-pro.jpg': 'snooker_table_pro_1791810322297.jpg',
  'hero-mobile.jpg': 'hero_mobile_1791812066482.jpg',
  'hero-tablet.jpg': 'hero_tablet_1791812092790.jpg',
  'hero-desktop.jpg': 'hero_desktop_1791812124687.jpg',
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params
    const name = String(resolvedParams?.name || '')
    const sourceFileName = IMAGE_MAP[name]

    if (!sourceFileName) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const publicDir = path.join(process.cwd(), 'public', 'images')
    const publicFilePath = path.join(publicDir, name)
    const artifactFilePath = path.join(ARTIFACT_DIR, sourceFileName)

    // Ensure file is persisted in public/images/ so it stays permanently in the project
    if (!fs.existsSync(publicFilePath) && fs.existsSync(artifactFilePath)) {
      fs.mkdirSync(publicDir, { recursive: true })
      fs.copyFileSync(artifactFilePath, publicFilePath)
    }

    const targetPath = fs.existsSync(publicFilePath)
      ? publicFilePath
      : artifactFilePath

    if (!fs.existsSync(targetPath)) {
      return new NextResponse('Image not found', { status: 404 })
    }

    const fileBuffer = fs.readFileSync(targetPath)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('Media route error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

