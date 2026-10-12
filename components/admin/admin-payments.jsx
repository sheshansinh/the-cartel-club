"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Search, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/payments')
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      console.error('Error loading payments:', err)
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      String(payment.customerName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      String(payment.transactionId || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      String(payment.bookingId || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPayments = filteredPayments.slice(startIndex, endIndex)

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'REFUNDED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const handleRefund = async (payment) => {
    if (!payment.rawBookingId) {
      toast.error('Only booking payments can be refunded from here. Use POS History to void POS sales.')
      return
    }
    if (!confirm(`Are you sure you want to refund ₹${payment.amount}?`)) return
    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: payment.rawBookingId,
          reason: 'Refunded by Admin',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')
      toast.success('Payment refunded')
      fetchPayments()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const totalRevenue = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const pendingAmount = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const refundedAmount = payments
    .filter((p) => p.status === 'REFUNDED')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Payments Ledger
          </h1>
          <p className="text-[#929B95] mt-1">
            Central transaction log across bookings, gaming sessions, and POS sales
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchPayments}
          className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Total Collected
            </CardTitle>
            <Download className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              From {payments.filter((p) => p.status === 'PAID').length} paid transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Pending
            </CardTitle>
            <RefreshCw className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              ₹{pendingAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              {payments.filter((p) => p.status === 'PENDING').length} pending orders
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Refunded
            </CardTitle>
            <RefreshCw className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              ₹{refundedAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              {payments.filter((p) => p.status === 'REFUNDED').length} refunds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929B95]" />
              <Input
                placeholder="Search by customer, transaction ID, or reference..."
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
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-[#929B95]">Loading...</div>
          ) : currentPayments.length === 0 ? (
            <div className="text-center py-8 text-[#929B95]">
              No payment transactions recorded yet.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Transaction ID</TableHead>
                    <TableHead className="text-[#929B95]">Type / Ref</TableHead>
                    <TableHead className="text-[#929B95]">Customer</TableHead>
                    <TableHead className="text-[#929B95]">Amount</TableHead>
                    <TableHead className="text-[#929B95]">Method</TableHead>
                    <TableHead className="text-[#929B95]">Status</TableHead>
                    <TableHead className="text-[#929B95]">Date</TableHead>
                    <TableHead className="text-[#929B95]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPayments.map((payment) => (
                    <TableRow key={payment.id} className="border-white/10">
                      <TableCell className="text-[#F4F1E8] font-mono text-xs">
                        {payment.transactionId}
                      </TableCell>
                      <TableCell className="text-xs text-[#929B95]">
                        <div className="text-[#F4F1E8] font-medium">
                          {payment.paymentType?.replace(/_/g, ' ')}
                        </div>
                        <div className="font-mono">{payment.bookingId}</div>
                      </TableCell>
                      <TableCell className="text-[#F4F1E8]">
                        {payment.customerName}
                      </TableCell>
                      <TableCell className="text-[#B6F36B] font-semibold">
                        ₹{payment.amount}
                      </TableCell>
                      <TableCell className="text-[#929B95] text-xs">
                        {payment.paymentMethod}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            payment.status
                          )}`}
                        >
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#929B95] text-xs">
                        {new Date(payment.createdAt).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {payment.status === 'PAID' && payment.rawBookingId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefund(payment)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
