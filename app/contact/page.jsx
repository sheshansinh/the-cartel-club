"use client"

import { useState } from 'react'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone, Mail, Instagram, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Message sent successfully!')
        setFormData({ name: '', phone: '', email: '', message: '' })
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('Failed to send message')
    }
  }

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
              CONTACT US
            </h1>
            <p className="text-xl text-[#929B95]">
              Have questions? We&apos;d love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-24 bg-[#111615]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="bg-[#080A0A] border-white/10">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold font-space-grotesk text-[#F4F1E8] mb-6">
                    Send us a message
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[#929B95] mb-2">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-[#111615] border-white/10"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#929B95] mb-2">
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-[#111615] border-white/10"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#929B95] mb-2">
                        Email (Optional)
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-[#111615] border-white/10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#929B95] mb-2">
                        Message
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full h-32 rounded-md border border-input bg-[#111615] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90">
                      Send Message
                      <MessageSquare className="ml-2 w-4 h-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="p-6 rounded-lg border border-white/10 bg-[#080A0A]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#B6F36B]/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-[#B6F36B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F4F1E8] mb-1">Address</h3>
                    <p className="text-[#929B95]">
                      123 Premium Street<br />
                      City Center
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-white/10 bg-[#080A0A]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#B6F36B]/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="text-[#B6F36B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F4F1E8] mb-1">Phone</h3>
                    <p className="text-[#929B95]">+91 98765 43210</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-white/10 bg-[#080A0A]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#B6F36B]/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="text-[#B6F36B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F4F1E8] mb-1">Email</h3>
                    <p className="text-[#929B95]">hello@thecartelclub.com</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-white/10 bg-[#080A0A]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#B6F36B]/20 flex items-center justify-center flex-shrink-0">
                    <Instagram className="text-[#B6F36B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F4F1E8] mb-1">Instagram</h3>
                    <p className="text-[#929B95]">@thecartelclub</p>
                  </div>
                </div>
              </div>

              {/* Opening Hours */}
              <div className="p-6 rounded-lg border border-white/10 bg-[#080A0A]">
                <h3 className="font-semibold text-[#F4F1E8] mb-4">Opening Hours</h3>
                <ul className="space-y-2 text-[#929B95]">
                  <li>Mon - Thu: 12 PM - 11 PM</li>
                  <li>Fri - Sat: 12 PM - 1 AM</li>
                  <li>Sunday: 2 PM - 10 PM</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="py-24 bg-[#080A0A]">
        <div className="container mx-auto px-4">
          <div className="aspect-video bg-[#111615] rounded-lg border border-white/10 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="text-[#B6F36B] w-12 h-12 mx-auto mb-4" />
              <p className="text-[#929B95]">Google Maps integration coming soon</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
