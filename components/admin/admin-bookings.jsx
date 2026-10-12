"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  MoreVertical,
  Eye,
  Check,
  X,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/bookings')
      if (!res.ok) throw new Error('Failed to load bookings')
      const data = await res.json()
      const list = Array.isArray(data) ? data : data.bookings || []
      setBookings(list)
    } catch (err) {
      console.error('Error loading bookings:', err)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const filteredBookings = bookings.filter((booking) => {
    const tableName = booking.table?.name || ''
    const matchesSearch =
      String(booking.customerName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      String(booking.phone || '').includes(searchTerm) ||
      String(booking.bookingRef || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      tableName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || booking.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentBookings = filteredBookings.slice(startIndex, endIndex)

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'CHECKED_IN':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'PENDING_PAYMENT':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'CANCELLED':
      case 'EXPIRED':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500/20 text-green-400'
      case 'UNPAID':
        return 'bg-red-500/20 text-red-400'
      case 'REFUNDED':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      toast.success(`Booking marked as ${newStatus}`)
      fetchBookings()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Bookings
          </h1>
          <p className="text-[#929B95] mt-1">
            Live table reservations, holds, and check-ins
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchBookings}
          className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929B95]" />
              <Input
                placeholder="Search by customer name, phone, booking ref, or table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#080A0A] border-white/20 text-[#F4F1E8] placeholder:text-[#929B95]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#080A0A] border-white/20 text-[#F4F1E8]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-[#111615] border-white/20">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-[#929B95]">Loading...</div>
          ) : currentBookings.length === 0 ? (
            <div className="text-center py-8 text-[#929B95]">
              No bookings found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Booking Ref</TableHead>
                    <TableHead className="text-[#929B95]">Customer</TableHead>
                    <TableHead className="text-[#929B95]">Table</TableHead>
                    <TableHead className="text-[#929B95]">Date &amp; Time</TableHead>
                    <TableHead className="text-[#929B95]">Duration</TableHead>
                    <TableHead className="text-[#929B95]">Status</TableHead>
                    <TableHead className="text-[#929B95]">Payment</TableHead>
                    <TableHead className="text-[#929B95]">Amount</TableHead>
                    <TableHead className="text-[#929B95]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBookings.map((booking) => (
                    <TableRow key={booking.id} className="border-white/10">
                      <TableCell className="text-[#F4F1E8] font-mono text-xs">
                        {booking.bookingRef || booking.id.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#F4F1E8] font-medium">
                            {booking.customerName}
                          </p>
                          <p className="text-xs text-[#929B95]">{booking.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#F4F1E8]">
                        {booking.table?.name || 'Table'} ({booking.table?.type || ''})
                      </TableCell>
                      <TableCell className="text-[#F4F1E8] text-xs">
                        {new Date(booking.bookingDate).toLocaleDateString('en-IN')}
                        <br />
                        <span className="text-[#929B95]">
                          {booking.startTime} – {booking.endTime}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#F4F1E8]">
                        {Number(booking.durationHours || 1)}h
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                            booking.paymentStatus
                          )}`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#B6F36B] font-semibold">
                        ₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#929B95] hover:text-[#F4F1E8]"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#111615] border-white/20">
                            <DropdownMenuItem
                              onClick={() => setSelectedBooking(booking)}
                              className="text-[#F4F1E8] hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {booking.status === 'PENDING_PAYMENT' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(booking.id, 'CONFIRMED')
                                }
                                className="text-green-400 hover:bg-green-500/10"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Confirm Booking
                              </DropdownMenuItem>
                            )}
                            {booking.status === 'CONFIRMED' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(booking.id, 'CHECKED_IN')
                                }
                                className="text-[#B6F36B] hover:bg-white/10"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Mark Checked In
                              </DropdownMenuItem>
                            )}
                            {booking.status !== 'CANCELLED' &&
                              booking.status !== 'COMPLETED' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(booking.id, 'CANCELLED')
                                  }
                                  className="text-red-400 hover:bg-red-500/10"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel Booking
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={() => setSelectedBooking(null)}
      >
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8]">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#929B95]">Booking Reference</p>
                  <p className="font-mono font-medium">
                    {selectedBooking.bookingRef}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#929B95]">Customer Name</p>
                  <p className="font-medium">{selectedBooking.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-[#929B95]">Phone</p>
                  <p className="font-medium">{selectedBooking.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-[#929B95]">Email</p>
                  <p className="font-medium">{selectedBooking.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#929B95]">Table</p>
                  <p className="font-medium">
                    {selectedBooking.table?.name} ({selectedBooking.table?.type})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#929B95]">Date &amp; Time</p>
                  <p className="font-medium">
                    {new Date(selectedBooking.bookingDate).toLocaleDateString('en-IN')}{' '}
                    ({selectedBooking.startTime} – {selectedBooking.endTime})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#929B95]">Duration</p>
                  <p className="font-medium">
                    {Number(selectedBooking.durationHours || 1)} Hours
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#929B95]">Total Amount</p>
                  <p className="font-bold text-[#B6F36B]">
                    ₹{Number(selectedBooking.totalAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
