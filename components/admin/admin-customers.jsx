"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Mail, Phone, RefreshCw, Award } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/customers')
      if (!res.ok) throw new Error('Failed to load customers')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (err) {
      console.error('Error loading customers:', err)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filteredCustomers = customers.filter(
    (customer) =>
      String(customer.name || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      String(customer.email || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      String(customer.phone || '').includes(searchTerm)
  )

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Customers Directory
          </h1>
          <p className="text-[#929B95] mt-1">
            Live customer profiles, playing hours, loyalty tiers, and lifetime spend
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchCustomers}
          className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929B95]" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#080A0A] border-white/20 text-[#F4F1E8] placeholder:text-[#929B95]"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-[#929B95]">Loading...</div>
          ) : currentCustomers.length === 0 ? (
            <div className="text-center py-8 text-[#929B95]">
              No customer profiles found yet. Customers are created automatically on sign-in, booking, or walk-in session.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-[#929B95]">Customer</TableHead>
                  <TableHead className="text-[#929B95]">Contact</TableHead>
                  <TableHead className="text-[#929B95]">Total Hours (All-Time)</TableHead>
                  <TableHead className="text-[#929B95]">Loyalty Cycle &amp; Bonus</TableHead>
                  <TableHead className="text-[#929B95]">Total Visits</TableHead>
                  <TableHead className="text-[#929B95]">Total Spent</TableHead>
                  <TableHead className="text-[#929B95]">Last Activity</TableHead>
                  <TableHead className="text-[#929B95]">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentCustomers.map((customer) => (
                  <TableRow key={customer.id} className="border-white/10">
                    <TableCell className="text-[#F4F1E8] font-medium">
                      <div>{customer.name}</div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#D6B36A] mt-0.5">
                        <Award className="w-3 h-3" />
                        {customer.membershipTier}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[#929B95]">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#929B95]">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-sm font-bold text-[#F4F1E8]">
                        {customer.totalPlayingHours}h Total
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-[#F4F1E8] font-medium">
                        Cycle: <span className="text-[#B6F36B] font-bold">{customer.milestoneCycleHours ?? customer.totalPlayingHours}h</span>
                      </div>
                      <div className="text-[11px] text-[#929B95] mt-0.5">
                        {Number(customer.rewardBalance || 0) > 0 ? (
                          <span className="text-[#B6F36B] font-semibold">
                            🎁 {customer.rewardBalance}h Free Bonus Ready
                          </span>
                        ) : (
                          <span>0h bonus active</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#F4F1E8]">
                      {customer.totalBookings}
                    </TableCell>
                    <TableCell className="text-[#B6F36B] font-semibold">
                      ₹{Number(customer.totalSpent || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-[#929B95] text-xs">
                      {customer.lastBooking}
                    </TableCell>
                    <TableCell className="text-[#929B95] text-xs">
                      {customer.joinedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
