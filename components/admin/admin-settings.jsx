"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Building, Clock, CreditCard, Bell, Shield } from 'lucide-react'

export default function AdminSettings() {
  const [businessSettings, setBusinessSettings] = useState({
    name: 'The Cartel Club',
    tagline: 'Pool & Snooker Lounge',
    address: '123 Main Street, Ahmedabad',
    phone: '+91 98765 43210',
    email: 'hello@thecartelclub.com',
    openingTime: '6:00 PM',
    closingTime: '1:00 AM',
    poolTableRate: 200,
    snookerTableRate: 300,
    advancePayment: 100,
  })

  const [paymentSettings, setPaymentSettings] = useState({
    razorpayKeyId: '',
    razorpayKeySecret: '',
    currency: 'INR',
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingConfirmations: true,
    paymentAlerts: true,
  })

  const handleSave = (section) => {
    // TODO: Save settings via API
    console.log(`Saving ${section} settings`)
    alert(`${section} settings saved successfully!`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">Settings</h1>
        <p className="text-[#929B95] mt-1">Configure your business settings</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-[#111615] border border-white/10">
          <TabsTrigger value="business" className="data-[state=active]:bg-[#B6F36B] data-[state=active]:text-[#080A0A]">
            <Building className="w-4 h-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-[#B6F36B] data-[state=active]:text-[#080A0A]">
            <Clock className="w-4 h-4 mr-2" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-[#B6F36B] data-[state=active]:text-[#080A0A]">
            <CreditCard className="w-4 h-4 mr-2" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#B6F36B] data-[state=active]:text-[#080A0A]">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <Card className="bg-[#111615] border-white/10">
            <CardHeader>
              <CardTitle className="text-[#F4F1E8]">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-[#929B95]">Business Name</label>
                <Input
                  value={businessSettings.name}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                />
              </div>
              <div>
                <label className="text-sm text-[#929B95]">Tagline</label>
                <Input
                  value={businessSettings.tagline}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, tagline: e.target.value })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                />
              </div>
              <div>
                <label className="text-sm text-[#929B95]">Address</label>
                <Input
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#929B95]">Phone</label>
                  <Input
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                    className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#929B95]">Email</label>
                  <Input
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                    className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#929B95]">Opening Time</label>
                  <Input
                    value={businessSettings.openingTime}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, openingTime: e.target.value })}
                    className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#929B95]">Closing Time</label>
                  <Input
                    value={businessSettings.closingTime}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, closingTime: e.target.value })}
                    className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSave('business')}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Settings */}
        <TabsContent value="pricing">
          <Card className="bg-[#111615] border-white/10">
            <CardHeader>
              <CardTitle className="text-[#F4F1E8]">Pricing Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-[#929B95]">Pool Table Hourly Rate (₹)</label>
                <Input
                  type="number"
                  value={businessSettings.poolTableRate}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, poolTableRate: parseInt(e.target.value) })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                />
              </div>
              <div>
                <label className="text-sm text-[#929B95]">Snooker Table Hourly Rate (₹)</label>
                <Input
                  type="number"
                  value={businessSettings.snookerTableRate}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, snookerTableRate: parseInt(e.target.value) })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                />
              </div>
              <div>
                <label className="text-sm text-[#929B95]">Advance Payment Amount (₹)</label>
                <Input
                  type="number"
                  value={businessSettings.advancePayment}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, advancePayment: parseInt(e.target.value) })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                />
                <p className="text-xs text-[#929B95] mt-1">Amount required to confirm a booking</p>
              </div>
              <Button
                onClick={() => handleSave('pricing')}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card className="bg-[#111615] border-white/10">
            <CardHeader>
              <CardTitle className="text-[#F4F1E8]">Payment Gateway Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-[#929B95]">Razorpay Key ID</label>
                <Input
                  value={paymentSettings.razorpayKeyId}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeyId: e.target.value })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  placeholder="rzp_live_..."
                />
              </div>
              <div>
                <label className="text-sm text-[#929B95]">Razorpay Key Secret</label>
                <Input
                  type="password"
                  value={paymentSettings.razorpayKeySecret}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeySecret: e.target.value })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  placeholder="••••••••••••••••"
                />
              </div>
              <div>
                <label className="text-sm text-[#929B95]">Currency</label>
                <Input
                  value={paymentSettings.currency}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, currency: e.target.value })}
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  disabled
                />
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Warning: These credentials are sensitive. Never share them publicly.
                </p>
              </div>
              <Button
                onClick={() => handleSave('payment')}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="bg-[#111615] border-white/10">
            <CardHeader>
              <CardTitle className="text-[#F4F1E8]">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#F4F1E8] font-medium">Email Notifications</p>
                  <p className="text-sm text-[#929B95]">Receive notifications via email</p>
                </div>
                <button
                  onClick={() => setNotificationSettings({ ...notificationSettings, emailNotifications: !notificationSettings.emailNotifications })}
                  className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.emailNotifications ? 'bg-[#B6F36B]' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#F4F1E8] font-medium">SMS Notifications</p>
                  <p className="text-sm text-[#929B95]">Receive notifications via SMS</p>
                </div>
                <button
                  onClick={() => setNotificationSettings({ ...notificationSettings, smsNotifications: !notificationSettings.smsNotifications })}
                  className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.smsNotifications ? 'bg-[#B6F36B]' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.smsNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#F4F1E8] font-medium">Booking Confirmations</p>
                  <p className="text-sm text-[#929B95]">Send confirmation when booking is confirmed</p>
                </div>
                <button
                  onClick={() => setNotificationSettings({ ...notificationSettings, bookingConfirmations: !notificationSettings.bookingConfirmations })}
                  className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.bookingConfirmations ? 'bg-[#B6F36B]' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.bookingConfirmations ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#F4F1E8] font-medium">Payment Alerts</p>
                  <p className="text-sm text-[#929B95]">Get notified for successful payments</p>
                </div>
                <button
                  onClick={() => setNotificationSettings({ ...notificationSettings, paymentAlerts: !notificationSettings.paymentAlerts })}
                  className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.paymentAlerts ? 'bg-[#B6F36B]' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.paymentAlerts ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <Button
                onClick={() => handleSave('notifications')}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
