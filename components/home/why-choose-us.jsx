"use client"

import { motion } from 'framer-motion'
import { Sparkles, Shield, Zap, Heart } from 'lucide-react'

export default function WhyChooseUs() {
  const features = [
    {
      icon: Sparkles,
      title: 'Premium Ambience',
      description: 'A sophisticated atmosphere designed for comfort and style.',
    },
    {
      icon: Shield,
      title: 'Quality Gaming Tables',
      description: 'Professional-grade equipment maintained to the highest standards.',
    },
    {
      icon: Zap,
      title: 'Easy Online Booking',
      description: 'Reserve your table in seconds with our seamless online system.',
    },
    {
      icon: Heart,
      title: 'Great Music & Atmosphere',
      description: 'Curated playlists and lighting that enhance your gaming experience.',
    },
  ]

  return (
    <section className="py-24 bg-[#080A0A] overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            WHY CHOOSE US?
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            We&apos;re committed to delivering an exceptional billiards experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-6 p-6 rounded-lg border border-white/10 bg-[#111615]/50 hover:border-[#B6F36B]/30 transition-all"
            >
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-lg bg-[#B6F36B]/20 flex items-center justify-center">
                  <feature.icon className="text-[#B6F36B] w-7 h-7" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#F4F1E8] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#929B95]">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
