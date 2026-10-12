"use client"

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Choose Your Table',
      description: 'Browse our selection of premium pool and snooker tables.',
    },
    {
      number: '02',
      title: 'Reserve Your Slot',
      description: 'Select your preferred date, time, and duration.',
    },
    {
      number: '03',
      title: 'Show Up & Break',
      description: 'Arrive at your scheduled time and enjoy the game.',
    },
  ]

  return (
    <section className="py-24 bg-[#080A0A]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            HOW IT WORKS
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            Booking your table is simple and takes just a few minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#B6F36B]/0 via-[#B6F36B]/50 to-[#B6F36B]/0" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative text-center"
            >
              {/* Step number */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 + 0.3 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#111615] border-2 border-[#B6F36B] flex items-center justify-center relative z-10"
              >
                <span className="text-2xl font-bold text-[#B6F36B]">{step.number}</span>
              </motion.div>

              {/* Content */}
              <h3 className="text-2xl font-semibold text-[#F4F1E8] mb-3">
                {step.title}
              </h3>
              <p className="text-[#929B95]">
                {step.description}
              </p>

              {/* Arrow for non-last steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex justify-center mt-8">
                  <ArrowRight className="text-[#B6F36B]/50" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
