"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react'
import BookingModal from '@/components/booking-modal'

export default function Footer() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  return (
    <footer className="bg-[#111615] border-t border-white/10">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src="/images/logo.jpg"
                alt="The Cartel Club Logo"
                className="w-11 h-11 rounded-xl object-contain bg-black border border-white/15 p-0.5 shrink-0"
              />
              <h3 className="text-xl font-bold font-space-grotesk text-[#B6F36B] tracking-tight">
                THE CARTEL CLUB
              </h3>
            </Link>
            <p className="text-sm text-[#929B95]">
              The Cartel Club — Premium Pool &amp; Snooker Lounge. Where Every Shot Tells a Story.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F4F1E8]">Quick Links</h4>
            <ul className="space-y-2 text-sm text-[#929B95]">
              <li>
                <Link href="/about" className="hover:text-[#B6F36B] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-[#B6F36B] transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(true)}
                  className="hover:text-[#B6F36B] transition-colors text-left"
                >
                  Book Your Table
                </button>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#B6F36B] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F4F1E8]">Contact</h4>
            <ul className="space-y-3 text-sm text-[#929B95]">
              <li className="flex items-center gap-2">
                <Phone size={16} />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <span>hello@thecartelclub.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5" />
                <span>123 Premium Street, City Center</span>
              </li>
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h4 className="font-semibold mb-4 text-[#F4F1E8]">Opening Hours</h4>
            <ul className="space-y-2 text-sm text-[#929B95]">
              <li>Mon - Thu: 12 PM - 11 PM</li>
              <li>Fri - Sat: 12 PM - 1 AM</li>
              <li>Sunday: 2 PM - 10 PM</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#929B95]">
            © {new Date().getFullYear()} The Cartel Club. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-[#929B95] hover:text-[#B6F36B] transition-colors" aria-label="The Cartel Club Instagram">
              <Instagram size={20} />
            </a>
            <a href="#" className="text-[#929B95] hover:text-[#B6F36B] transition-colors" aria-label="The Cartel Club Facebook">
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </footer>
  )
}
