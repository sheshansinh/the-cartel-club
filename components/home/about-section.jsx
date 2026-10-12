"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AboutSection() {
  return (
    <section id="about" className="py-24 bg-[#080A0A] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl group">
              <img
                src="/api/media/about-billiards-club.jpg"
                alt="Premium Billiards Experience at The Cartel Club"
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080A0A] via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                <p className="text-[#B6F36B] font-bold font-space-grotesk text-base">
                  The Cartel Club • Billiards &amp; Snooker Sanctuary
                </p>
                <p className="text-[#F4F1E8]/80 text-xs mt-0.5">
                  Championship tables, pro carbon cues &amp; curated lounge atmosphere
                </p>
              </div>
            </div>

            {/* Decorative elements */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-24 h-24 border border-[#B6F36B]/30 rounded-full pointer-events-none"
            />
            <motion.div
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 2 }}
              className="absolute -bottom-4 -left-4 w-32 h-32 border border-[#D6B36A]/30 rounded-full pointer-events-none"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk text-[#F4F1E8]">
              MORE THAN JUST A GAME.
            </h2>

            <div className="space-y-4 text-[#929B95] text-lg">
              <p>
                At The Cartel Club, we&apos;ve created more than just a pool hall. We&apos;ve built a sanctuary for
                those who appreciate the art of billiards, the thrill of competition, and the
                joy of shared experiences.
              </p>
              <p>
                Whether you&apos;re a seasoned player looking for a competitive match, a group of
                friends seeking a memorable night out, or someone who simply wants to relax in
                a premium atmosphere, our lounge offers the perfect setting.
              </p>
              <p>
                With professional-grade tables, expertly crafted cues, and an ambiance that
                balances sophistication with comfort, every visit becomes an experience to remember.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/about">
                <Button className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 px-6 py-5">
                  Discover Our Story
                  <ArrowRight className="ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
