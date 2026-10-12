"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Calendar, Users, PartyPopper, Briefcase } from 'lucide-react'
import Link from 'next/link'

export default function EventsSection() {
  const eventTypes = [
    {
      icon: PartyPopper,
      title: 'Birthday Parties',
      description: 'Celebrate your special day with friends and games.',
    },
    {
      icon: Briefcase,
      title: 'Corporate Events',
      description: 'Team building and client entertainment in style.',
    },
    {
      icon: Users,
      title: 'Group Gatherings',
      description: 'Perfect for friends who want to play together.',
    },
    {
      icon: Calendar,
      title: 'Private Sessions',
      description: 'Book the entire lounge for exclusive events.',
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
            MAKE IT A MATCH TO REMEMBER
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            Host your next event at The Cartel Club. From birthday parties to corporate gatherings, 
            we create memorable experiences.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {eventTypes.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-lg border border-white/10 bg-[#080A0A] hover:border-[#D6B36A]/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-[#D6B36A]/20 flex items-center justify-center mb-4 group-hover:bg-[#D6B36A]/30 transition-colors">
                <event.icon className="text-[#D6B36A] w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-[#F4F1E8] mb-2">
                {event.title}
              </h3>
              <p className="text-[#929B95] text-sm">
                {event.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/contact">
            <Button className="bg-[#D6B36A] text-[#080A0A] hover:bg-[#D6B36A]/90 px-8 py-6 text-lg font-semibold">
              Plan Your Event
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
