"use client"

import { useState } from 'react'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import BookingModal from '@/components/booking-modal'

export default function AboutPage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  return (
    <main className="min-h-screen bg-[#080A0A]">
      <Navbar />
      <div className="grain-overlay" />
      
      {/* Hero */}
      <section className="pt-32 pb-24 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold font-space-grotesk text-[#F4F1E8] mb-6">
              OUR STORY
            </h1>
            <p className="text-xl text-[#929B95]">
              More than just a pool hall. A destination for those who appreciate the art of billiards.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-24 bg-[#111615]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-square bg-black border border-white/10 rounded-2xl flex items-center justify-center p-12 shadow-2xl"
            >
              <img
                src="/images/logo.jpg"
                alt="The Cartel Club Official Crest"
                className="w-full h-full object-contain"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-bold font-space-grotesk text-[#F4F1E8]">
                The Beginning
              </h2>
              <p className="text-[#929B95] text-lg">
                The Cartel Club was born from a simple idea: create a space where billiards enthusiasts 
                could experience the game at its finest. We envisioned a place that combines 
                professional-grade equipment with a sophisticated atmosphere.
              </p>
              <p className="text-[#929B95] text-lg">
                Since opening our doors, we&apos;ve welcomed thousands of players — from beginners 
                learning their first shot to seasoned competitors honing their skills.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-24 bg-[#080A0A]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <h2 className="text-4xl font-bold font-space-grotesk text-[#F4F1E8] mb-6">
              Our Philosophy
            </h2>
            <p className="text-[#929B95] text-lg">
              We believe that every shot tells a story. Our mission is to provide the perfect 
              canvas for those stories—a space where skill meets style, and competition meets camaraderie.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Quality', desc: 'Professional equipment maintained to tournament standards.' },
              { title: 'Atmosphere', desc: 'A sophisticated environment that enhances the gaming experience.' },
              { title: 'Community', desc: 'A welcoming space for players of all skill levels.' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-lg border border-white/10 bg-[#111615]/50"
              >
                <h3 className="text-2xl font-semibold text-[#B6F36B] mb-3">{item.title}</h3>
                <p className="text-[#929B95]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#111615]">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold font-space-grotesk text-[#F4F1E8] mb-6">
              Experience It Yourself
            </h2>
            <p className="text-[#929B95] text-lg mb-8 max-w-2xl mx-auto">
              The best way to understand The Cartel Club is to visit us. Book your table today.
            </p>
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 px-8 py-6 text-lg font-semibold"
            >
              Book Your Table
              <ArrowRight className="ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      <Footer />
    </main>
  )
}
