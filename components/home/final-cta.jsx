"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, MapPin, Phone, Instagram } from 'lucide-react'
import Link from 'next/link'
import BookingModal from '@/components/booking-modal'

export default function FinalCTA() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  return (
    <section className="py-24 bg-gradient-to-b from-[#111615] to-[#080A0A]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            READY TO MAKE YOUR BREAK?
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            Book your table now and experience premium billiards like never before.
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Button
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 px-8 py-6 text-lg font-semibold"
          >
            Book Your Table
            <ArrowRight className="ml-2" />
          </Button>
          
          <Button variant="outline" className="border-white/20 text-[#F4F1E8] hover:bg-white/10 px-8 py-6 text-lg">
            <MapPin className="mr-2" />
            Get Directions
          </Button>

          <Link href="/contact">
            <Button variant="outline" className="border-white/20 text-[#F4F1E8] hover:bg-white/10 px-8 py-6 text-lg">
              Contact Us
            </Button>
          </Link>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#B6F36B]/20 flex items-center justify-center">
              <MapPin className="text-[#B6F36B]" />
            </div>
            <h3 className="font-semibold text-[#F4F1E8] mb-2">Address</h3>
            <p className="text-[#929B95] text-sm">
              123 Premium Street<br />City Center
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#B6F36B]/20 flex items-center justify-center">
              <Phone className="text-[#B6F36B]" />
            </div>
            <h3 className="font-semibold text-[#F4F1E8] mb-2">Phone</h3>
            <p className="text-[#929B95] text-sm">
              +91 98765 43210
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#B6F36B]/20 flex items-center justify-center">
              <Instagram className="text-[#B6F36B]" />
            </div>
            <h3 className="font-semibold text-[#F4F1E8] mb-2">Follow Us</h3>
            <p className="text-[#929B95] text-sm">
              @thecartelclub
            </p>
          </div>
        </motion.div>

        {/* Opening Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-block px-6 py-3 rounded-lg border border-white/10 bg-[#111615]/50">
            <p className="text-[#929B95] text-sm">
              <span className="text-[#F4F1E8] font-semibold">Opening Hours:</span> Mon-Thu 12PM-11PM | Fri-Sat 12PM-1AM | Sun 2PM-10PM
            </p>
          </div>
        </motion.div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  )
}
