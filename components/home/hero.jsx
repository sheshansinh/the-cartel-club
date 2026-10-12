"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Clock, ShieldCheck, Trophy } from 'lucide-react'
import Link from 'next/link'
import BookingModal from '@/components/booking-modal'

export default function Hero() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  return (
    <section className="relative min-h-[88vh] sm:min-h-[92vh] lg:min-h-screen flex items-center justify-center overflow-hidden bg-[#080A0A] pt-24 pb-16">
      {/* Responsive Background Photography (Mobile 9:16, Tablet 4:3, Laptop/Desktop 16:9) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <picture className="block w-full h-full">
          <source
            media="(min-width: 1024px)"
            srcSet="/api/media/hero-desktop.jpg"
          />
          <source
            media="(min-width: 640px)"
            srcSet="/api/media/hero-tablet.jpg"
          />
          <img
            src="/api/media/hero-mobile.jpg"
            alt="Luxury Championship Pool and Snooker Club"
            className="w-full h-full object-cover object-center scale-[1.02] transition-transform duration-1000"
          />
        </picture>

        {/* Multi-layered cinematic overlays so the background photo looks rich while text stays razor-sharp */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080A0A]/80 via-[#080A0A]/55 to-[#080A0A]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,10,10,0.25)_0%,rgba(8,10,10,0.82)_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {/* Top Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-[#B6F36B]/30 text-[#B6F36B] text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] mb-5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Premium Pool &amp; Snooker Lounge</span>
          </div>

          {/* Refined, balanced Hero Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-space-grotesk text-[#F4F1E8] mb-4 sm:mb-5 tracking-tight leading-[1.08] drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)]">
            BOOK{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B6F36B] via-[#00FF88] to-[#F4F1E8]">
              YOUR TABLE
            </span>
          </h1>

          {/* Refined Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg text-[#D5DDD8] mb-7 sm:mb-8 font-sora max-w-xl mx-auto leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          >
            Reserve your championship pool or snooker table online in seconds.
            Experience tournament-grade tables, pro cues, and luxury lounge vibes.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto max-w-xs sm:max-w-none mx-auto"
          >
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#a3e655] px-7 py-5 sm:py-6 text-sm sm:text-base font-bold rounded-xl shadow-[0_10px_30px_rgba(182,243,107,0.3)] transition-all"
            >
              Book Now
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            <Link href="#game" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-white/25 bg-black/40 backdrop-blur-md text-[#F4F1E8] hover:bg-white/15 hover:border-white/40 px-7 py-5 sm:py-6 text-sm sm:text-base font-medium rounded-xl"
              >
                Play the Game
              </Button>
            </Link>
          </motion.div>

          {/* Compact Feature Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs text-white/80"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10">
              <Clock className="w-3.5 h-3.5 text-[#B6F36B]" />
              <span>Instant Slot Confirmation</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00FF88]" />
              <span>Championship Tables</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10">
              <Trophy className="w-3.5 h-3.5 text-[#FFB800]" />
              <span>Play 5 Hours • Get 1 Hour Free</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  )
}
