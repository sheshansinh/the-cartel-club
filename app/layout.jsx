import { Space_Grotesk, Sora, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import ErrorBoundary from '@/components/error-boundary'
import Providers from '@/components/providers'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thecartelclub.com'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'The Cartel Club | Premium Pool, Snooker & Billiards Lounge',
    template: '%s | The Cartel Club',
  },
  applicationName: 'The Cartel Club',
  description:
    'Welcome to The Cartel Club (Cartel Club) — the ultimate luxury pool, snooker, and billiards lounge. Book championship tables online in seconds, track live floor availability, and earn free loyalty playing hours.',
  keywords: [
    'The Cartel Club',
    'Cartel Club',
    'Cartel Pool Club',
    'Cartel Snooker Club',
    'The Cartel Club Billiards',
    'Cartel Lounge',
    'pool table booking online',
    'snooker table reservation',
    'billiards club',
    'championship pool tables',
    '8 ball pool club',
    'snooker lounge',
    'VIP billiards lounge',
  ],
  authors: [{ name: 'The Cartel Club' }],
  creator: 'The Cartel Club',
  publisher: 'The Cartel Club',
  icons: {
    icon: '/images/logo.jpg',
    shortcut: '/images/logo.jpg',
    apple: '/images/logo.jpg',
  },
  openGraph: {
    title: 'The Cartel Club | Luxury Pool & Snooker Lounge',
    description:
      'Reserve your championship pool or snooker table online at The Cartel Club. Tournament-grade tables, pro carbon cues, and VIP member rewards.',
    url: SITE_URL,
    siteName: 'The Cartel Club',
    images: [
      {
        url: '/images/logo.jpg',
        width: 800,
        height: 800,
        alt: 'The Cartel Club Official Logo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Cartel Club | Premium Pool & Snooker Lounge',
    description:
      'Book your pool or snooker table online at The Cartel Club. Real-time table availability & VIP loyalty rewards.',
    images: ['/images/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsActivityLocation',
  name: 'The Cartel Club',
  alternateName: ['Cartel Club', 'The Cartel Pool & Snooker Club'],
  description:
    'Luxury pool, snooker, and billiards lounge featuring championship tables, instant online slot booking, and VIP loyalty rewards.',
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.jpg`,
  image: `${SITE_URL}/images/logo.jpg`,
  priceRange: '₹₹',
  telephone: '+91 98765 43210',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '12:00',
      closes: '23:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Friday', 'Saturday'],
      opens: '12:00',
      closes: '01:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Sunday'],
      opens: '14:00',
      closes: '22:00',
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${sora.variable} ${inter.variable} font-sans antialiased`}
      >
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
