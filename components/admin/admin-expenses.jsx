"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Wallet,
  Clock,
  Receipt,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState({
    totalCount: 0,
    paidTotal: 0,
    pendingTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Add Expense Modal
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    status: 'PAID',
  })

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/expenses')
      if (!res.ok) throw new Error('Failed to load expenses')
      const data = await res.json()
      setExpenses(data.expenses || [])
      setCategories(data.categories || [])
      if (data.summary) setSummary(data.summary)
    } catch (err) {
      console.error('Error loading expenses:', err)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const openAddModal = () => {
    setForm({
      categoryId: categories[0]?.id || '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'CASH',
      referenceNumber: '',
      status: 'PAID',
    })
    setIsAddOpen(true)
  }

  const handleCreateExpense = async () => {
    if (!form.categoryId || !form.description.trim() || Number(form.amount) <= 0) {
      toast.error('Please fill category, description, and a valid amount')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record expense')

      toast.success(`Expense of ₹${data.expense.amount} recorded`)
      setIsAddOpen(false)
      fetchExpenses()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (expenseId, status) => {
    try {
      const res = await fetch(`/api/admin/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')

      toast.success(`Expense marked as ${status}`)
      fetchExpenses()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteExpense = async (expense) => {
    if (!confirm(`Delete expense "${expense.description}" (₹${expense.amount})?`))
      return
    try {
      const res = await fetch(`/api/admin/expenses/${expense.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete expense')
      toast.success('Expense deleted')
      fetchExpenses()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat =
      selectedCategory === 'ALL' || e.categoryId === selectedCategory
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter
    const matchesSearch =
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCat && matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Expenses & Outflows
          </h1>
          <p className="text-[#929B95] mt-1">
            Track rent, utilities, maintenance, salaries, and operational expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchExpenses}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={openAddModal}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Approved & Paid Expenses
            </CardTitle>
            <Wallet className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              ₹{Number(summary.paidTotal || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Deducted from net P&amp;L
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Pending Approval
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              ₹{Number(summary.pendingTotal || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Awaiting manager / owner sign-off
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Total Vouchers Logged
            </CardTitle>
            <Receipt className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {summary.totalCount}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Across {categories.length} expense categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <Input
            placeholder="Search by description, category, or bill reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#080A0A] border-white/20 text-[#F4F1E8] md:max-w-sm"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-[#929B95]">
              Loading expenses...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-[#929B95]">No expenses found for this filter.</p>
              <Button
                onClick={openAddModal}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record First Expense
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-[#929B95]">Date</TableHead>
                  <TableHead className="text-[#929B95]">Category</TableHead>
                  <TableHead className="text-[#929B95]">Description</TableHead>
                  <TableHead className="text-[#929B95]">Method / Ref</TableHead>
                  <TableHead className="text-[#929B95]">Amount</TableHead>
                  <TableHead className="text-[#929B95]">Status</TableHead>
                  <TableHead className="text-[#929B95] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} className="border-white/10">
                    <TableCell className="text-xs text-[#929B95]">
                      {new Date(exp.date).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="text-[#F4F1E8] font-medium">
                      {exp.category?.name || 'General'}
                    </TableCell>
                    <TableCell className="text-sm text-[#F4F1E8]">
                      {exp.description}
                    </TableCell>
                    <TableCell className="text-xs text-[#929B95]">
                      <div>{exp.paymentMethod}</div>
                      {exp.referenceNumber && (
                        <div className="font-mono">{exp.referenceNumber}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-red-400">
                      ₹{Number(exp.amount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          exp.status === 'PAID' || exp.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : exp.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {exp.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(exp.id, 'PAID')}
                              className="h-7 px-2 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 text-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Approve & Pay
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(exp.id, 'REJECTED')}
                              className="h-7 px-2 text-red-400 hover:text-red-300 text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(exp)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Expense Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>Record Business Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Category *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Expense Date *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Description / Particulars *</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Monthly Torrent Power electricity bill"
                className="bg-[#080A0A] border-white/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Amount (₹) *</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Payment Mode</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="CARD">CARD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Bill / Voucher Ref</label>
                <Input
                  value={form.referenceNumber}
                  onChange={(e) =>
                    setForm({ ...form, referenceNumber: e.target.value })
                  }
                  placeholder="Optional invoice #"
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Approval Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="PAID">PAID (Immediate)</option>
                  <option value="PENDING">PENDING APPROVAL</option>
                </select>
              </div>
            </div>

            <Button
              disabled={submitting}
              onClick={handleCreateExpense}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Saving...' : 'Save Expense Voucher'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

