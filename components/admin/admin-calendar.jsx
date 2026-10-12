"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

export default function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    // TODO: Fetch bookings from API
    const mockBookings = [
      { id: 1, date: new Date(2026, 9, 10), customer: 'John Doe', table: 'Table 1', time: '6:00 PM' },
      { id: 2, date: new Date(2026, 9, 10), customer: 'Jane Smith', table: 'Table 2', time: '7:00 PM' },
      { id: 3, date: new Date(2026, 9, 12), customer: 'Bob Johnson', table: 'Table 3', time: '8:00 PM' },
      { id: 4, date: new Date(2026, 9, 15), customer: 'Alice Brown', table: 'Table 1', time: '6:30 PM' },
      { id: 5, date: new Date(2026, 9, 15), customer: 'Charlie Wilson', table: 'Table 4', time: '9:00 PM' },
    ]
    setBookings(mockBookings)
  }, [])

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, isCurrentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true })
    }
    return days
  }

  const getBookingsForDay = (day) => {
    if (!day) return []
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date)
      return bookingDate.getDate() === day &&
             bookingDate.getMonth() === currentDate.getMonth() &&
             bookingDate.getFullYear() === currentDate.getFullYear()
    })
  }

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">Calendar</h1>
          <p className="text-[#929B95] mt-1">Visual booking schedule</p>
        </div>
      </div>

      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#F4F1E8] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(-1)}
                className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(1)}
                className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-[#929B95] py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayBookings = getBookingsForDay(day.day)
              const isToday = day.day === new Date().getDate() &&
                             day.isCurrentMonth &&
                             currentDate.getMonth() === new Date().getMonth() &&
                             currentDate.getFullYear() === new Date().getFullYear()

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 rounded-lg border ${
                    day.isCurrentMonth
                      ? 'bg-[#080A0A] border-white/10 hover:border-[#B6F36B]/50 cursor-pointer'
                      : 'bg-transparent border-transparent'
                  } ${isToday ? 'border-[#B6F36B]' : ''}`}
                >
                  {day.day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-[#B6F36B]' : 'text-[#F4F1E8]'
                      }`}>
                        {day.day}
                      </div>
                      <div className="space-y-1">
                        {dayBookings.slice(0, 2).map(booking => (
                          <div
                            key={booking.id}
                            className="text-xs p-1 rounded bg-[#B6F36B]/20 text-[#B6F36B] truncate"
                          >
                            {booking.time} - {booking.table}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-xs text-[#929B95]">
                            +{dayBookings.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Bookings */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8]">Today&apos;s Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getBookingsForDay(new Date().getDate()).length > 0 ? (
              getBookingsForDay(new Date().getDate()).map(booking => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-[#080A0A] rounded-lg border border-white/10"
                >
                  <div>
                    <p className="text-[#F4F1E8] font-medium">{booking.customer}</p>
                    <p className="text-sm text-[#929B95]">{booking.table} • {booking.time}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
                  >
                    View Details
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-[#929B95] py-4">No bookings for today</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
