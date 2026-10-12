"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Calendar,
} from 'lucide-react'

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/finance?range=${timeRange}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const kpis = data?.kpis || {
    totalRevenue: 0,
    revenueGrowth: 0,
    totalBookings: 0,
    bookingsGrowth: 0,
    newCustomers: 0,
    customersGrowth: 0,
    avgDuration: 0,
  }

  const peakHours = data?.peakHours || []
  const maxPeak = Math.max(1, ...peakHours.map((p) => p.bookings || 0))
  const tableUtilization = data?.tableUtilization || []
  const revenueByDay = data?.dailySeries || []
  const maxDailyRev = Math.max(1, ...revenueByDay.map((d) => d.revenue || 0))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Analytics
          </h1>
          <p className="text-[#929B95] mt-1">
            Live business insights, peak hours, and table utilization metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] bg-[#111615] border-white/20 text-[#F4F1E8]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111615] border-white/20">
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Total Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              ₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center mt-1">
              {kpis.revenueGrowth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
              )}
              <span
                className={`text-sm ${
                  kpis.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {kpis.revenueGrowth >= 0 ? '+' : ''}
                {kpis.revenueGrowth}%
              </span>
              <span className="text-xs text-[#929B95] ml-2">
                vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Total Bookings
            </CardTitle>
            <Calendar className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {kpis.totalBookings}
            </div>
            <div className="flex items-center mt-1">
              {kpis.bookingsGrowth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
              )}
              <span
                className={`text-sm ${
                  kpis.bookingsGrowth >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {kpis.bookingsGrowth >= 0 ? '+' : ''}
                {kpis.bookingsGrowth}%
              </span>
              <span className="text-xs text-[#929B95] ml-2">
                vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              New Customers
            </CardTitle>
            <Users className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {kpis.newCustomers}
            </div>
            <div className="flex items-center mt-1">
              {kpis.customersGrowth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
              )}
              <span
                className={`text-sm ${
                  kpis.customersGrowth >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {kpis.customersGrowth >= 0 ? '+' : ''}
                {kpis.customersGrowth}%
              </span>
              <span className="text-xs text-[#929B95] ml-2">
                vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Avg Session Duration
            </CardTitle>
            <Clock className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {kpis.avgDuration || 0}h
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Across {kpis.sessionsCount || 0} live sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours Chart */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8]">
            Peak Hours Activity (12 PM – 11 PM)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-[#929B95]">Loading...</div>
          ) : (
            <div className="space-y-3">
              {peakHours.map((item) => (
                <div key={item.hour} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-[#929B95]">{item.hour}</span>
                  <div className="flex-1 bg-[#080A0A] rounded-full h-7 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#B6F36B] to-[#D6B36A] transition-all duration-500"
                      style={{
                        width: `${Math.round((item.bookings / maxPeak) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-sm text-[#F4F1E8] text-right">
                    {item.bookings} games
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Utilization */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8]">Table Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tableUtilization.map((item) => (
              <div key={item.id || item.table} className="flex items-center gap-4">
                <span className="w-32 text-sm text-[#929B95] truncate">
                  {item.table}
                </span>
                <div className="flex-1 bg-[#080A0A] rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      item.utilization >= 75
                        ? 'bg-emerald-500'
                        : item.utilization >= 40
                        ? 'bg-[#B6F36B]'
                        : 'bg-[#D6B36A]'
                    }`}
                    style={{ width: `${Math.max(4, item.utilization)}%` }}
                  />
                </div>
                <span className="w-28 text-xs text-[#F4F1E8] text-right">
                  {item.hoursPlayed}h ({item.utilization}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Day */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8]">Daily Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {revenueByDay.map((item) => (
              <div key={item.date} className="flex items-center gap-4">
                <span className="w-24 text-xs text-[#929B95]">{item.day}</span>
                <div className="flex-1 bg-[#080A0A] rounded-full h-7 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#B6F36B] to-[#D6B36A] transition-all duration-500"
                    style={{
                      width: `${Math.round((item.revenue / maxDailyRev) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-24 text-sm text-[#F4F1E8] text-right">
                  ₹{Number(item.revenue || 0).toLocaleString('en-IN')}
                </span>

              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
