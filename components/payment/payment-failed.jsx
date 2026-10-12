"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { XCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function PaymentFailed({ searchParams }) {
  const params = new URLSearchParams(searchParams)
  const errorMessage = params.get('error') || 'Payment failed. Please try again.'

  return (
    <div className="min-h-screen bg-[#080A0A] flex items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-[#111615] border border-red-500/30 shadow-2xl">
          <CardContent className="p-8">
            {/* Failure Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-16 h-16 text-red-400" />
              </div>
            </motion.div>

            {/* Failure Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8] mb-2">
                Payment Failed
              </h1>
              <p className="text-[#929B95]">
                {errorMessage}
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-[#080A0A] rounded-lg p-6 mb-6">
              <h3 className="text-[#F4F1E8] font-semibold mb-4">What went wrong?</h3>
              <ul className="space-y-2 text-sm text-[#929B95]">
                <li>• Payment was declined by your bank</li>
                <li>• Insufficient funds in your account</li>
                <li>• Transaction timeout or network issue</li>
                <li>• Invalid payment details</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/" className="flex-1">
                <Button className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-[#F4F1E8] hover:bg-white/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Home
                </Button>
              </Link>
            </div>

            {/* Support Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[#929B95]">
                Need help? Contact us at{' '}
                <a href="mailto:hello@thecartelclub.com" className="text-[#B6F36B] hover:underline">
                  hello@thecartelclub.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
