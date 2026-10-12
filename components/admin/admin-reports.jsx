"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Download,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminReports() {
  const [reportType, setReportType] = useState('revenue')
  const [dateRange, setDateRange] = useState('30d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)

  const reportTypes = [
    { id: 'revenue', label: 'Revenue & P&L Report', icon: DollarSign },
    { id: 'bookings', label: 'Bookings & Table Utilization Report', icon: Calendar },
    { id: 'customers', label: 'Customer Activity Report', icon: Users },
    { id: 'performance', label: 'Club Performance Summary', icon: TrendingUp },
  ]

  const fetchReport = useCallback(async () => {
    try {
      setGenerating(true)
      const params = new URLSearchParams({ range: dateRange })
      if (dateRange === 'custom' && fromDate && toDate) {
        params.set('from', fromDate)
        params.set('to', toDate)
      }
      const res = await fetch(`/api/admin/finance?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to generate report')
      const data = await res.json()
      setReportData(data)
    } catch (err) {
      toast.error(err.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }, [dateRange, fromDate, toDate])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExportCSV = (type = reportType) => {
    if (!reportData) {
      toast.error('Generate a report first')
      return
    }
    const kpis = reportData.kpis || {}
    let rows = []

    if (type === 'bookings' || type === 'performance') {
      rows = [
        ['The Cartel Club ERP - Table Utilization & Bookings Report'],
        ['Table', 'Type', 'Bookings & Sessions', 'Hours Played', 'Utilization %'],
        ...(reportData.tableUtilization || []).map((t) => [
          t.table,
          t.type,
          t.bookingsCount,
          t.hoursPlayed,
          `${t.utilization}%`,
        ]),
      ]
    } else {
      rows = [
        ['The Cartel Club ERP - Financial & Revenue Report'],
        ['Metric', 'Value'],
        ['Total Revenue (INR)', kpis.totalRevenue],
        ['Online Bookings Revenue (INR)', kpis.bookingRevenue],
        ['Gaming Sessions Revenue (INR)', kpis.sessionRevenue],
        ['POS Sales Revenue (INR)', kpis.posRevenue],
        ['Total Expenses (INR)', kpis.totalExpenses],
        ['Net Profit (INR)', kpis.netProfit],
        ['Profit Margin (%)', `${kpis.profitMargin}%`],
        [],
        ['Date', 'Revenue (INR)', 'Expenses (INR)', 'Net (INR)'],
        ...(reportData.dailySeries || []).map((d) => [
          d.date,
          d.revenue,
          d.expenses,
          d.net,
        ]),
      ]
    }

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `cue-club-${type}-${dateRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${type.toUpperCase()} CSV report`)
  }

  const kpis = reportData?.kpis || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
          Reports Center
        </h1>
        <p className="text-[#929B95] mt-1">
          Generate and download live operational and financial reports
        </p>
      </div>

      {/* Report Generator */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8]">Generate Live Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-[#929B95] mb-2 block">
                Report Type
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="bg-[#080A0A] border-white/20 text-[#F4F1E8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111615] border-white/20">
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-[#929B95] mb-2 block">
                Date Range
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-[#080A0A] border-white/20 text-[#F4F1E8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111615] border-white/20">
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="text-sm text-[#929B95] mb-2 block">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#929B95] mb-2 block">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={fetchReport}
              disabled={generating}
              className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              <FileText className="w-4 h-4 mr-2" />
              {generating ? 'Refreshing Report...' : 'Refresh Live Report'}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExportCSV(reportType)}
              className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>

            <Button
              variant="outline"
              onClick={() => window.print()}
              className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview Summary */}
      {reportData && (
        <Card className="bg-[#111615] border-white/10">
          <CardHeader>
            <CardTitle className="text-[#F4F1E8]">
              Live Report Preview ({dateRange.toUpperCase()})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#080A0A] border border-white/10">
              <p className="text-xs text-[#929B95]">Gross Revenue</p>
              <p className="text-xl font-bold text-[#B6F36B] mt-1">
                ₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#080A0A] border border-white/10">
              <p className="text-xs text-[#929B95]">Net Profit</p>
              <p className="text-xl font-bold text-[#F4F1E8] mt-1">
                ₹{Number(kpis.netProfit || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#080A0A] border border-white/10">
              <p className="text-xs text-[#929B95]">Bookings &amp; Sessions</p>
              <p className="text-xl font-bold text-[#F4F1E8] mt-1">
                {(kpis.totalBookings || 0) + (kpis.sessionsCount || 0)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#080A0A] border border-white/10">
              <p className="text-xs text-[#929B95]">POS Counter Orders</p>
              <p className="text-xl font-bold text-[#D6B36A] mt-1">
                {kpis.posOrdersCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
