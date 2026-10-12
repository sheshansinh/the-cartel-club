export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thecartelclub.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/gallery', '/contact', '/login'],
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

