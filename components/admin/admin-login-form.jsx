"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react'

export default function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard'

  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    if (result?.ok) {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#080A0A] flex items-center justify-center p-4">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#B6F36B]/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md bg-[#111615] border border-white/10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          {/* Logo / brand */}
          <div className="flex justify-center mb-4">
            <img
              src="/images/logo.jpg"
              alt="The Cartel Club Logo"
              className="w-16 h-16 rounded-2xl object-contain bg-black border border-[#B6F36B]/30 p-1 shadow-lg"
            />
          </div>
          <CardTitle className="text-2xl font-bold font-space-grotesk text-[#F4F1E8]">
            THE CARTEL CLUB
          </CardTitle>
          <p className="text-[#929B95] text-sm mt-1">Staff &amp; Admin Access</p>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#929B95] block">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929B95]" />
                <Input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="pl-10 bg-[#080A0A] border-white/20 text-[#F4F1E8] placeholder:text-[#929B95]/60 focus:border-[#B6F36B]/50"
                  placeholder="admin@thecartelclub.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#929B95] block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929B95]" />
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="pl-10 bg-[#080A0A] border-white/20 text-[#F4F1E8] placeholder:text-[#929B95]/60 focus:border-[#B6F36B]/50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
                <span className="shrink-0">⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold h-11 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-[#929B95]/60 mt-6">
            This portal is for authorised staff only.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
