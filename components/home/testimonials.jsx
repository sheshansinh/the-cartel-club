"use client"

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Rahul Sharma',
      rating: 5,
      review: 'The best pool hall in the city. Premium tables, great atmosphere, and excellent service. Will definitely come back!',
    },
    {
      name: 'Priya Patel',
      rating: 5,
      review: 'Booked a table for my husband\'s birthday. The staff made it special. The online booking was so easy.',
    },
    {
      name: 'Amit Kumar',
      rating: 4,
      review: 'Love the ambiance here. Perfect place to hang out with friends on weekends. The snooker tables are top-notch.',
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
            WHAT OUR GUESTS SAY
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            Real experiences from our valued customers.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-[#111615] border-white/10 h-full">
                <CardContent className="p-6">
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-[#D6B36A] text-[#D6B36A]" />
                    ))}
                  </div>

                  {/* Review */}
                  <p className="text-[#F4F1E8] mb-6 italic">
                    &ldquo;{testimonial.review}&rdquo;
                  </p>

                  {/* Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#B6F36B]/20 flex items-center justify-center">
                      <span className="text-[#B6F36B] font-semibold">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-[#929B95] font-medium">
                      {testimonial.name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-[#929B95] mt-8">
          * These are placeholder testimonials. Real customer reviews will be added.
        </p>
      </div>
    </section>
  )
}
