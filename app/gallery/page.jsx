"use client"

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ZoomIn, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function GalleryPage() {
  const categories = ['All', 'Pool', 'Snooker', 'Interior', 'Events']
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/gallery?category=${selectedCategory}`)
        const data = await response.json()
        setImages(data.images || [])
      } catch (error) {
        console.error('Error fetching gallery:', error)
        // Fallback to placeholder images if API fails
        setImages([
          { category: 'Pool', color: 'from-[#1a472a] to-[#0d2818]' },
          { category: 'Snooker', color: 'from-[#2d1f1f] to-[#1a1414]' },
          { category: 'Interior', color: 'from-[#1f2d1f] to-[#141a14]' },
          { category: 'Events', color: 'from-[#2d2d1f] to-[#1a1a14]' },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [selectedCategory])

  const filteredImages = images

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
              GALLERY
            </h1>
            <p className="text-xl text-[#929B95]">
              A visual journey through our premium billiards experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-[#111615]">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-[#B6F36B] text-[#080A0A]'
                    : 'bg-[#080A0A] text-[#929B95] hover:text-[#F4F1E8]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <motion.div
                  key={image.id || index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`aspect-square bg-gradient-to-br ${image.color || 'from-[#1a472a] to-[#0d2818]'} rounded-lg overflow-hidden relative group cursor-pointer`}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {image.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.imageUrl} alt={image.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl">🎱</span>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-[#F4F1E8] font-semibold text-sm">{image.category}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="text-white w-8 h-8" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
