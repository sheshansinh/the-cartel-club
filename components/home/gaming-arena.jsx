"use client"

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gamepad2, Armchair, Trophy, Music, Sparkles } from 'lucide-react'

export default function GamingArena() {
  const features = [
    {
      icon: Gamepad2,
      title: 'Premium Tables',
      description:
        'Professional-grade pool and snooker tables maintained to tournament standards.',
    },
    {
      icon: Armchair,
      title: 'Lounge Seating',
      description:
        'Comfortable seating areas for players and spectators to relax between games.',
    },
    {
      icon: Trophy,
      title: 'Quality Equipment',
      description:
        'Expertly crafted cues, premium balls, and accessories for the perfect game.',
    },
    {
      icon: Music,
      title: 'Great Atmosphere',
      description:
        'Curated music and lighting that sets the perfect mood for gaming.',
    },
  ]

  return (
    <section className="py-24 bg-[#111615]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            THE GAMING ARENA
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            Experience premium gaming facilities designed for players of all skill levels.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
            >
              <Card className="bg-[#080A0A] border-white/10 h-full group hover:border-[#B6F36B]/50 transition-all">
                <CardContent className="p-6">
                  <div className="w-16 h-16 rounded-full bg-[#B6F36B]/20 flex items-center justify-center mb-4 group-hover:bg-[#B6F36B]/30 transition-colors">
                    <feature.icon className="text-[#B6F36B] w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#F4F1E8] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[#929B95]">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Visual Showcase with Real Photography */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Left Card: Macro 8-Ball & Championship Felt */}
          <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden border border-white/10 group shadow-2xl">
            <img
              src="/api/media/arena-8ball-closeup.jpg"
              alt="Championship 8-Ball & Tournament Felt"
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080A0A] via-[#080A0A]/30 to-transparent" />
            <div className="absolute top-4 left-4">
              <Badge className="bg-[#B6F36B]/20 text-[#B6F36B] border border-[#B6F36B]/40 backdrop-blur-md">
                Pro Spec
              </Badge>
            </div>
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xl font-bold font-space-grotesk text-[#F4F1E8]">
                Tournament-Grade Felt &amp; Balls
              </p>
              <p className="text-xs text-[#929B95] mt-1">
                Precision Belgian phenolic resin balls &amp; championship worsted cloth
              </p>
            </div>
          </div>

          {/* Right Wide Card: 6 Premium Tables Lounge */}
          <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden border border-white/10 md:col-span-2 group shadow-2xl">
            <img
              src="/api/media/arena-6-tables-lounge.jpg"
              alt="6 Premium Pool & Snooker Tables Lounge"
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080A0A] via-[#080A0A]/40 to-transparent" />
            <div className="absolute top-4 right-4">
              <Badge className="bg-[#D6B36A]/20 text-[#D6B36A] border border-[#D6B36A]/40 backdrop-blur-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                VIP Arena
              </Badge>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-3xl md:text-4xl font-bold font-space-grotesk text-[#D6B36A] drop-shadow">
                  6 Premium Tables
                </p>
                <p className="text-sm md:text-base text-[#F4F1E8]/90 mt-1">
                  Pool &amp; Snooker • Shadow-Free Linear Canopy Lighting &amp; Luxury Lounge
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
