"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080A0A] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#111615] border border-white/10">
        <CardContent className="p-12 text-center">
          <h1 className="text-6xl font-bold font-space-grotesk text-[#B6F36B] mb-4">
            404
          </h1>
          <h2 className="text-2xl font-bold text-[#F4F1E8] mb-2">
            Page Not Found
          </h2>
          <p className="text-[#929B95] mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
