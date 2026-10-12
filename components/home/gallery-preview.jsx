"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, ZoomIn } from 'lucide-react'
import Link from 'next/link'

export default function GalleryPreview() {
  const images = [
    {
      category: 'Interior',
      label: 'Luxury Lounge & 6 Tables',
      src: '/api/media/arena-6-tables-lounge.jpg',
    },
    {
      category: 'Pool',
      label: '8-Ball Championship',
      src: '/api/media/arena-8ball-closeup.jpg',
    },
    {
      category: 'Snooker',
      label: 'Pro Snooker Tables',
      src: '/api/media/snooker-table-pro.jpg',
    },
    {
      category: 'Action',
      label: 'Tournament Break',
      src: '/api/media/about-billiards-club.jpg',
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
            VISUAL GALLERY
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            A glimpse into our premium billiards experience.
          </p>
        </motion.div>

        {/* Asymmetrical Gallery Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Large featured image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="col-span-2 row-span-2 aspect-square rounded-xl overflow-hidden relative group cursor-pointer border border-white/10"
          >
            <img
              src="/api/media/arena-6-tables-lounge.jpg"
              alt="Featured Billiards Arena"
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080A0A]/80 via-black/20 to-transparent group-hover:via-black/10 transition-colors" />
            <div className="absolute bottom-4 left-4">
              <span className="text-xs uppercase tracking-wider text-[#B6F36B] font-bold block">
                Featured Arena
              </span>
              <span className="text-[#F4F1E8] font-bold text-lg font-space-grotesk">
                Championship Pool &amp; Snooker Hall
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="text-white w-8 h-8 drop-shadow" />
            </div>
          </motion.div>

          {/* Smaller images */}
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer border border-white/10"
            >
              <img
                src={image.src}
                alt={image.label}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080A0A]/85 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-[10px] uppercase tracking-wider text-[#B6F36B] block">
                  {image.category}
                </span>
                <span className="text-[#F4F1E8] font-semibold text-sm">
                  {image.label}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="text-white w-6 h-6 drop-shadow" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/gallery">
            <Button
              variant="outline"
              className="border-white/20 text-[#F4F1E8] hover:bg-white/10 px-8 py-6 text-lg"
            >
              View Full Gallery
              <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
