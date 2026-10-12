"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, ArrowRight, Loader2 } from 'lucide-react'
import BookingModal from '@/components/booking-modal'

function formatShortDuration(hours) {
  const h = Number(hours)
  if (h === 0.5) return '30m'
  return `${h}h`
}

export default function BookingSection() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/tables', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setTables(data.tables || [])
        }
      } catch (err) {
        console.error('Failed to load tables for Reserve Your Spot:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTables()
  }, [])

  const getStatusBadge = (table) => {
    switch (table.status) {
      case 'AVAILABLE':
        return {
          label: 'Available',
          color: 'bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30',
        }
      case 'OCCUPIED':
      case 'BOOKED':
        return {
          label: 'Playing Now',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        }
      case 'MAINTENANCE':
        return {
          label: 'Maintenance',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        }
      default:
        return {
          label: table.status || 'Unavailable',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        }
    }
  }

  const handleBookTable = (table) => {
    if (table.status === 'MAINTENANCE' || table.status === 'INACTIVE') return
    setSelectedTable(table)
    setIsBookingModalOpen(true)
  }

  return (
    <section className="py-24 bg-[#111615]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk text-[#F4F1E8] mb-4">
            Reserve Your Spot
          </h2>
          <p className="text-lg text-[#929B95] max-w-2xl mx-auto">
            Choose your table and time. Book online for a seamless experience.
          </p>
        </motion.div>

        {/* Quick Booking Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-[#080A0A] border-white/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#B6F36B]/20 flex items-center justify-center">
                <Calendar className="text-[#B6F36B]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#F4F1E8]">Select Date</h3>
                <p className="text-sm text-[#929B95]">Choose your preferred day</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#080A0A] border-white/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D6B36A]/20 flex items-center justify-center">
                <Clock className="text-[#D6B36A]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#F4F1E8]">Pick Time &amp; Duration</h3>
                <p className="text-sm text-[#929B95]">Custom hour packages &amp; live rates</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#080A0A] border-white/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#B6F36B]/20 flex items-center justify-center">
                <Users className="text-[#B6F36B]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#F4F1E8]">Choose Table</h3>
                <p className="text-sm text-[#929B95]">Pool or Snooker</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Admin-Managed Table Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {tables.map((table, index) => {
              const badge = getStatusBadge(table)
              const canBook =
                table.status !== 'MAINTENANCE' && table.status !== 'INACTIVE'
              const displayCode =
                table.tableNumber ||
                String(index + 1).padStart(2, '0')
              const typeLabel =
                String(table.type || '').toUpperCase() === 'SNOOKER'
                  ? 'Snooker'
                  : 'Pool'
              const tiers = Array.isArray(table.pricingTiers)
                ? table.pricingTiers
                : []

              return (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Card
                    className={`bg-[#080A0A] border-white/10 overflow-hidden transition-all ${
                      canBook
                        ? 'cursor-pointer hover:border-[#B6F36B]/60'
                        : 'opacity-60 cursor-not-allowed'
                    } ${
                      selectedTable?.id === table.id ? 'border-[#B6F36B]' : ''
                    }`}
                    onClick={() => canBook && handleBookTable(table)}
                  >
                    <div className="h-48 bg-[#0d2818] flex items-center justify-center relative overflow-hidden group">
                      <img
                        src={
                          typeLabel === 'Snooker'
                            ? '/api/media/snooker-table-pro.jpg'
                            : '/api/media/arena-8ball-closeup.jpg'
                        }
                        alt={table.name}
                        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 opacity-75"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080A0A] via-black/40 to-black/20" />
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-32 h-16 bg-black/65 backdrop-blur-md rounded-xl border-2 border-[#B6F36B]/50 flex flex-col items-center justify-center shadow-lg">
                          <span className="text-xl font-bold text-[#B6F36B]">
                            {displayCode}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-[#F4F1E8]/90">
                            {typeLabel}
                          </span>
                        </div>
                      </div>
                      <Badge className={`absolute top-4 right-4 ${badge.color}`}>
                        {badge.label}
                      </Badge>
                      <div className="absolute bottom-3 left-4 bg-black/75 backdrop-blur-md border border-[#B6F36B]/40 px-2.5 py-1 rounded-md">
                        <span className="text-sm font-bold text-[#B6F36B]">
                          ₹{Number(table.hourlyRate)}/hr
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-semibold text-[#F4F1E8] text-lg">
                            {table.name}
                          </h3>
                          <p className="text-xs text-[#929B95]">
                            {typeLabel} Table • ₹{Number(table.hourlyRate)} per hour
                          </p>
                        </div>
                        {canBook && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBookTable(table)
                            }}
                            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold shrink-0"
                          >
                            Book
                          </Button>
                        )}
                      </div>

                      {/* Duration & Package Prices from Admin Panel */}
                      {tiers.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-[10px] uppercase tracking-wider text-[#929B95] mb-1.5">
                            Duration Packages
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {tiers.map((tier, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#111615] border border-white/10 text-[11px]"
                              >
                                <span className="text-[#929B95]">
                                  {formatShortDuration(tier.durationHours)}:
                                </span>
                                <span className="font-bold text-[#B6F36B]">
                                  ₹{tier.price}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => {
              setSelectedTable(null)
              setIsBookingModalOpen(true)
            }}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 px-8 py-6 text-lg font-semibold"
          >
            View All Tables &amp; Book Now
            <ArrowRight className="ml-2" />
          </Button>
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        initialTable={selectedTable}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </section>
  )
}
