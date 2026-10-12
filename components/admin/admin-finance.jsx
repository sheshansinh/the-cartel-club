"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminFinance() {
  const [range, setRange] = useState('30d')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchFinanceReport = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/finance?range=${range}`)
      if (!res.ok) throw new Error('Failed to load financial statement')
      const data = await res.json()
      setReport(data)
    } catch (err) {
      console.error('Error loading financial report:', err)
      toast.error('Failed to load financial statement')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchFinanceReport()
  }, [fetchFinanceReport])

  const kpis = report?.kpis || {
    totalRevenue: 0,
    bookingRevenue: 0,
    sessionRevenue: 0,
    posRevenue: 0,
    totalExpenses: 0,
    pendingExpensesTotal: 0,
    netProfit: 0,
    profitMargin: 0,
  }

  const handleExportCSV = () => {
    if (!report) return
    const rows = [
      ['The Cartel Club ERP - Profit & Loss Statement'],
      ['Period Range', range],
      ['Gross Revenue (INR)', kpis.totalRevenue],
      ['  - Online Bookings Revenue', kpis.bookingRevenue],
      ['  - Gaming Sessions Revenue', kpis.sessionRevenue],
      ['  - POS Counter Sales Revenue', kpis.posRevenue],
      ['Total Approved/Paid Expenses (INR)', kpis.totalExpenses],
      ['Net Profit (INR)', kpis.netProfit],
      ['Profit Margin (%)', `${kpis.profitMargin}%`],
      [],
      ['Date', 'Revenue (INR)', 'Expenses (INR)', 'Net Cashflow (INR)'],
      ...(report.dailySeries || []).map((d) => [
        d.date,
        d.revenue,
        d.expenses,
        d.net,
      ]),
    ]
    const csvContent = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `cue-club-pnl-${range}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('P&L CSV statement downloaded')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Financial Statement &amp; P&amp;L
          </h1>
          <p className="text-[#929B95] mt-1">
            Consolidated revenue streams, operating expenses, and net profit analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#111615] p-1 rounded-lg border border-white/10">
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: '1y', label: '1 Year' },
            ].map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={range === item.id ? 'default' : 'ghost'}
                onClick={() => setRange(item.id)}
                className={
                  range === item.id
                    ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
                    : 'text-[#929B95] hover:text-[#F4F1E8]'
                }
              >
                {item.label}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={fetchFinanceReport}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleExportCSV}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Export P&amp;L CSV
          </Button>
        </div>
      </div>

      {/* Top P&L Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Gross Revenue
            </CardTitle>
            <ArrowUpRight className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#B6F36B]">
              ₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Bookings + Walk-in Sessions + POS
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Operating Expenses
            </CardTitle>
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              ₹{Number(kpis.totalExpenses || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Pending: ₹{Number(kpis.pendingExpensesTotal || 0).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Net Operating Profit
            </CardTitle>
            {kpis.netProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                kpis.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {kpis.netProfit < 0 ? '-' : ''}₹
              {Math.abs(Number(kpis.netProfit || 0)).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Gross Revenue minus Paid Expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Net Profit Margin
            </CardTitle>
            <PieChart className="w-4 h-4 text-[#D6B36A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#D6B36A]">
              {kpis.profitMargin}%
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Operating profitability ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Streams + Payment Mode Split + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Stream */}
        <Card className="bg-[#111615] border-white/10">
          <CardHeader>
            <CardTitle className="text-[#F4F1E8] text-base">
              Revenue by Stream
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: 'Online Table Bookings',
                value: kpis.bookingRevenue,
                color: 'bg-[#B6F36B]',
              },
              {
                label: 'Gaming Sessions (Walk-ins)',
                value: kpis.sessionRevenue,
                color: 'bg-[#D6B36A]',
              },
              {
                label: 'POS Counter Sales (F&B / Gear)',
                value: kpis.posRevenue,
                color: 'bg-emerald-400',
              },
            ].map((stream) => {
              const pct =
                kpis.totalRevenue > 0
                  ? Math.round((stream.value / kpis.totalRevenue) * 100)
                  : 0
              return (
                <div key={stream.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#929B95]">{stream.label}</span>
                    <span className="font-semibold text-[#F4F1E8]">
                      ₹{Number(stream.value || 0).toLocaleString('en-IN')} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-[#080A0A] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stream.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Collections by Payment Mode */}
        <Card className="bg-[#111615] border-white/10">
          <CardHeader>
            <CardTitle className="text-[#F4F1E8] text-base">
              Collections by Payment Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(report?.revenueByMethod || {}).map(([mode, amount]) => (
              <div
                key={mode}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#080A0A] border border-white/10"
              >
                <span className="text-sm text-[#929B95] font-medium">{mode}</span>
                <span className="text-sm font-bold text-[#F4F1E8]">
                  ₹{Number(amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="bg-[#111615] border-white/10">
          <CardHeader>
            <CardTitle className="text-[#F4F1E8] text-base">
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!report?.expensesByCategory ||
            report.expensesByCategory.length === 0 ? (
              <p className="text-sm text-[#929B95] py-6 text-center">
                No expenses logged in this period.
              </p>
            ) : (
              <div className="space-y-2.5">
                {report.expensesByCategory.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#080A0A] border border-white/10"
                  >
                    <span className="text-sm text-[#F4F1E8]">{item.category}</span>
                    <span className="text-sm font-bold text-red-400">
                      ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Cashflow Statement */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8]">
            Daily Cashflow Ledger (Recent 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[#929B95]">
              Calculating daily statement...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-[#929B95]">Date</TableHead>
                  <TableHead className="text-[#929B95]">Inflow (Revenue)</TableHead>
                  <TableHead className="text-[#929B95]">Outflow (Expenses)</TableHead>
                  <TableHead className="text-[#929B95] text-right">Net Cashflow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.dailySeries || []).map((row) => (
                  <TableRow key={row.date} className="border-white/10">
                    <TableCell className="text-[#F4F1E8] font-medium">
                      {row.day}
                    </TableCell>
                    <TableCell className="text-emerald-400 font-medium">
                      +₹{Number(row.revenue || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-red-400 font-medium">
                      -₹{Number(row.expenses || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        row.net >= 0 ? 'text-[#B6F36B]' : 'text-red-400'
                      }`}
                    >
                      {row.net < 0 ? '-' : ''}₹
                      {Math.abs(Number(row.net || 0)).toLocaleString('en-IN')}
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

