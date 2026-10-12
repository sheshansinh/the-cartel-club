"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Bell, Clock, Mail, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'

export default function AdminAutomation() {
  const [automations, setAutomations] = useState({
    bookingConfirmation: {
      enabled: true,
      type: 'email',
      timing: 'immediate',
    },
    bookingReminder: {
      enabled: true,
      type: 'email',
      timing: '1h',
    },
    paymentConfirmation: {
      enabled: true,
      type: 'email',
      timing: 'immediate',
    },
    cancellationAlert: {
      enabled: true,
      type: 'email',
      timing: 'immediate',
    },
    dailyReport: {
      enabled: true,
      type: 'email',
      timing: '9am',
    },
    lowStockAlert: {
      enabled: true,
      type: 'email',
      timing: 'immediate',
    },
  })

  const toggleAutomation = (key) => {
    setAutomations({
      ...automations,
      [key]: {
        ...automations[key],
        enabled: !automations[key].enabled,
      },
    })
  }

  const handleSave = () => {
    // TODO: Save automations via API
    console.log('Saving automations:', automations)
    alert('Automation settings saved successfully!')
  }

  const automationItems = [
    {
      key: 'bookingConfirmation',
      title: 'Booking Confirmation',
      description: 'Send confirmation when a booking is made',
      icon: CheckCircle,
    },
    {
      key: 'bookingReminder',
      title: 'Booking Reminder',
      description: 'Remind customers before their booking',
      icon: Clock,
    },
    {
      key: 'paymentConfirmation',
      title: 'Payment Confirmation',
      description: 'Send receipt after successful payment',
      icon: CheckCircle,
    },
    {
      key: 'cancellationAlert',
      title: 'Cancellation Alert',
      description: 'Notify when a booking is cancelled',
      icon: AlertCircle,
    },
    {
      key: 'dailyReport',
      title: 'Daily Revenue Report',
      description: 'Send daily business summary',
      icon: Bell,
    },
    {
      key: 'lowStockAlert',
      title: 'Low Stock Alert',
      description: 'Alert when inventory is low',
      icon: AlertCircle,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">Automation</h1>
        <p className="text-[#929B95] mt-1">Automate your business operations</p>
      </div>

      {/* Automation Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automationItems.map((item) => {
          const Icon = item.icon
          const automation = automations[item.key]
          return (
            <Card key={item.key} className="bg-[#111615] border-white/10">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${automation.enabled ? 'bg-[#B6F36B]/20' : 'bg-gray-500/20'}`}>
                      <Icon className={`w-5 h-5 ${automation.enabled ? 'text-[#B6F36B]' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-[#F4F1E8]">{item.title}</CardTitle>
                      <p className="text-sm text-[#929B95] mt-1">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={() => toggleAutomation(item.key)}
                  />
                </div>
              </CardHeader>
              {automation.enabled && (
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#929B95] w-24">Channel:</span>
                    <div className="flex gap-2">
                      <Button
                        variant={automation.type === 'email' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutomations({
                          ...automations,
                          [item.key]: { ...automation, type: 'email' }
                        })}
                        className={automation.type === 'email' ? 'bg-[#B6F36B] text-[#080A0A]' : 'border-white/20 text-[#F4F1E8]'}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                      <Button
                        variant={automation.type === 'sms' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutomations({
                          ...automations,
                          [item.key]: { ...automation, type: 'sms' }
                        })}
                        className={automation.type === 'sms' ? 'bg-[#B6F36B] text-[#080A0A]' : 'border-white/20 text-[#F4F1E8]'}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        SMS
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#929B95] w-24">Timing:</span>
                    <select
                      value={automation.timing}
                      onChange={(e) => setAutomations({
                        ...automations,
                        [item.key]: { ...automation, timing: e.target.value }
                      })}
                      className="flex-1 bg-[#080A0A] border border-white/20 rounded-lg px-3 py-2 text-[#F4F1E8] text-sm"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="15m">15 minutes before</option>
                      <option value="30m">30 minutes before</option>
                      <option value="1h">1 hour before</option>
                      <option value="2h">2 hours before</option>
                      <option value="24h">24 hours before</option>
                      <option value="9am">9:00 AM daily</option>
                      <option value="6pm">6:00 PM daily</option>
                    </select>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
        >
          Save Automation Settings
        </Button>
      </div>

      {/* Quick Actions */}
      <Card className="bg-[#111615] border-white/10">
        <CardHeader>
          <CardTitle className="text-[#F4F1E8]">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Daily Report Now
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Reminders for Today
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-[#F4F1E8] hover:bg-white/10"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Test Automation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
