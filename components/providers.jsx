"use client"

/**
 * Global client-side providers.
 * Kept in a separate file so the root layout stays a Server Component.
 */

import { SessionProvider } from 'next-auth/react'

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  )
}
