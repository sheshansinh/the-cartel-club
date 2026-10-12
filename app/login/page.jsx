"use client"

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  Sparkles,
  ShieldCheck,
  Calendar,
  Trophy,
  ArrowLeft,
  Mail,
  Lock,
} from 'lucide-react'

function CustomerLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('sheshan@gmail.com')
  const [password, setPassword] = useState('Sheshan@2004')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleCredentialsSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })

    if (result?.error) {
      setErrorMsg('Invalid email or password. Try sheshan@gmail.com / Sheshan@2004')
      setLoading(false)
      return
    }

    if (result?.ok) {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <main className="min-h-screen bg-[#080A0A] flex flex-col">
      <Navbar />
      <div className="grain-overlay" />

      <section className="flex-1 flex items-center justify-center pt-28 pb-20 px-4">
        <div className="w-full max-w-md">
          <Card className="bg-[#111615] border border-white/10 shadow-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center mb-4">
                  <img
                    src="/images/logo.jpg"
                    alt="The Cartel Club Logo"
                    className="w-16 h-16 rounded-2xl object-contain bg-black border border-[#B6F36B]/30 p-1 shadow-lg"
                  />
                </div>
                <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
                  Welcome to The Cartel Club
                </h1>
                <p className="text-sm text-[#929B95] mt-2">
                  Sign in with your email &amp; password or Google to book tables and claim loyalty rewards.
                </p>
              </div>

              {(urlError || errorMsg) && (
                <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
                  {errorMsg || 'Authentication failed or was cancelled. Please try signing in again.'}
                </div>
              )}

              {/* Email & Password Login Form */}
              <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#929B95] block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#929B95] absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sheshan@gmail.com"
                      className="pl-9 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#929B95] block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#929B95] absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                      required
                    />
                  </div>
                </div>

                {/* Quick Fill Demo Pill */}
                <div className="flex items-center justify-between text-[11px] bg-[#080A0A] border border-[#B6F36B]/30 rounded-lg px-3 py-2">
                  <span className="text-[#929B95]">
                    Demo User: <strong className="text-[#F4F1E8]">sheshan@gmail.com</strong> / <strong className="text-[#B6F36B]">Sheshan@2004</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('sheshan@gmail.com')
                      setPassword('Sheshan@2004')
                    }}
                    className="text-[#B6F36B] font-semibold hover:underline ml-2 shrink-0"
                  >
                    Fill
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-11 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In with Email'
                  )}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#111615] px-3 text-[#929B95]">Or</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full h-11 bg-[#F4F1E8] text-[#080A0A] hover:bg-white font-semibold text-sm flex items-center justify-center gap-3 shadow-lg"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                <div className="flex items-center gap-3 text-xs text-[#929B95]">
                  <Calendar className="w-4 h-4 text-[#B6F36B] shrink-0" />
                  <span>Instant online table reservations with 15-minute slot hold</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#929B95]">
                  <Trophy className="w-4 h-4 text-[#D6B36A] shrink-0" />
                  <span>Earn free loyalty bonus hours automatically when you hit milestones</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#929B95]">
                  <ShieldCheck className="w-4 h-4 text-[#B6F36B] shrink-0" />
                  <span>Secure payments powered by Razorpay</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-[#929B95]">
                <Link href="/" className="hover:text-[#F4F1E8] flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Home
                </Link>
                <Link href="/admin/login" className="hover:text-[#B6F36B]">
                  Staff Login →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080A0A] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
        </div>
      }
    >
      <CustomerLoginContent />
    </Suspense>
  )
}
