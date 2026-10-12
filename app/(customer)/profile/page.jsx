"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { User, Mail, Phone, ShieldAlert, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function CustomerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '' })

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const res = await fetch('/api/profile')
        if (res.ok) {
          const data = await res.json()
          setUserData(data.user)
          setProfile(data.profile)
          setForm({
            name: data.user?.name || '',
            phone: data.profile?.phone || '',
          })
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to update profile')
        return
      }
      setUserData(data.user)
      setProfile(data.profile)
      toast.success('Profile updated successfully')
    } catch (err) {
      console.error('Error updating profile:', err)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#B6F36B] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
          My Profile
        </h1>
        <p className="text-sm text-[#929B95] mt-1">
          Manage your personal details and contact information for table reservations.
        </p>
      </div>

      {/* Account Header Card */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {userData?.image ? (
              <img
                src={userData.image}
                alt={userData.name || 'Profile'}
                className="w-16 h-16 rounded-full border-2 border-[#B6F36B]/40 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#B6F36B]/20 border border-[#B6F36B]/40 flex items-center justify-center text-2xl font-bold text-[#B6F36B]">
                {(userData?.name || 'M')[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-[#F4F1E8]">{userData?.name}</h2>
              <p className="text-sm text-[#929B95]">{userData?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-[#D6B36A]/20 text-[#D6B36A] border-[#D6B36A]/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {profile?.membershipTier || 'BRONZE'} TIER
                </Badge>
                <span className="text-xs text-[#929B95]">
                  Member since{' '}
                  {userData?.createdAt
                    ? new Date(userData.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#929B95] mb-2">
                <User className="inline w-4 h-4 mr-2" />
                Full Name
              </label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#929B95] mb-2">
                <Mail className="inline w-4 h-4 mr-2" />
                Email Address (Google Account)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="bg-[#080A0A]/60 border-white/10 text-[#929B95] cursor-not-allowed"
                />
                <Badge className="bg-[#B6F36B]/20 text-[#B6F36B] border-[#B6F36B]/30 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Google Verified
                </Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#929B95]">
                  <Phone className="inline w-4 h-4 mr-2" />
                  Mobile Number (Optional)
                </label>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  Unverified
                </Badge>
              </div>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                  })
                }
                maxLength={10}
                className="bg-[#080A0A] border-white/15 text-[#F4F1E8]"
                placeholder="Enter 10-digit mobile number"
              />
              <p className="text-xs text-[#929B95] mt-1.5">
                Used to pre-fill your table reservations and assist staff at check-in. Phone numbers are stored as unverified contact numbers.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold px-6"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

