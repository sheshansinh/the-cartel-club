"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  ChevronUp,
  ChevronDown,
  Clock,
  IndianRupee,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

function buildDefaultTiers(hourlyRate = 200) {
  const rate = Number(hourlyRate) > 0 ? Number(hourlyRate) : 200
  return [
    { durationHours: 0.5, price: Math.round(rate * 0.5) },
    { durationHours: 1, price: Math.round(rate * 1) },
    { durationHours: 1.5, price: Math.round(rate * 1.5) },
    { durationHours: 2, price: Math.round(rate * 2) },
    { durationHours: 3, price: Math.round(rate * 3) },
  ]
}

function formatDurationBadgeLabel(hours) {
  const h = Number(hours)
  if (h === 0.5) return '30m (0.5h)'
  if (h === 1) return '1 Hr'
  return `${h} Hrs`
}

export default function AdminTables() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [applyPricingToSameType, setApplyPricingToSameType] = useState(false)

  const [formData, setFormData] = useState({
    tableNumber: '',
    name: '',
    type: 'POOL',
    status: 'AVAILABLE',
    hourlyRate: 200,
    description: '',
    pricingTiers: buildDefaultTiers(200),
  })

  const fetchTables = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/admin/tables', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load tables')
      }
      setTables(data.tables || [])
    } catch (err) {
      toast.error(err.message || 'Could not load tables')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const openAddDialog = () => {
    setEditingTable(null)
    setApplyPricingToSameType(false)
    const nextNum = tables.length + 1
    setFormData({
      tableNumber: `T${nextNum}`,
      name: `Pool Table ${nextNum}`,
      type: 'POOL',
      status: 'AVAILABLE',
      hourlyRate: 200,
      description: '',
      pricingTiers: buildDefaultTiers(200),
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (table) => {
    setEditingTable(table)
    setApplyPricingToSameType(false)
    const rate = Number(table.hourlyRate || 200)
    const existingTiers =
      Array.isArray(table.pricingTiers) && table.pricingTiers.length > 0
        ? table.pricingTiers.map((t) => ({
            durationHours: Number(t.durationHours),
            price: Number(t.price),
          }))
        : buildDefaultTiers(rate)

    setFormData({
      tableNumber: table.tableNumber || '',
      name: table.name || '',
      type: String(table.type || 'POOL').toUpperCase(),
      status: table.status === 'OCCUPIED' ? 'AVAILABLE' : table.status || 'AVAILABLE',
      hourlyRate: rate,
      description: table.description || '',
      pricingTiers: existingTiers,
    })
    setIsDialogOpen(true)
  }

  const handleBaseRateChange = (val) => {
    const numRate = Number(val)
    setFormData((prev) => {
      const updatedTiers = prev.pricingTiers.map((tier) =>
        Number(tier.durationHours) === 1 && !Number.isNaN(numRate) && numRate >= 0
          ? { ...tier, price: numRate }
          : tier
      )
      return {
        ...prev,
        hourlyRate: val,
        pricingTiers: updatedTiers,
      }
    })
  }

  const autoCalculateTiersFromBaseRate = () => {
    const base = Number(formData.hourlyRate)
    if (Number.isNaN(base) || base <= 0) {
      toast.error('Enter a valid 1-Hour base rate first')
      return
    }
    setFormData((prev) => ({
      ...prev,
      pricingTiers: prev.pricingTiers.map((t) => ({
        ...t,
        price: Math.round(Number(t.durationHours || 1) * base),
      })),
    }))
    toast.success(`Recalculated all duration prices from ₹${base}/hr`)
  }

  const updateTierRow = (index, field, value) => {
    setFormData((prev) => {
      const updated = prev.pricingTiers.map((tier, idx) =>
        idx === index ? { ...tier, [field]: value } : tier
      )
      const oneHr = updated.find((t) => Number(t.durationHours) === 1)
      return {
        ...prev,
        hourlyRate:
          field === 'price' && oneHr && Number(updated[index].durationHours) === 1
            ? value
            : prev.hourlyRate,
        pricingTiers: updated,
      }
    })
  }

  const addTierRow = (presetHours = null) => {
    setFormData((prev) => {
      const base = Number(prev.hourlyRate) > 0 ? Number(prev.hourlyRate) : 200
      const existingHours = prev.pricingTiers.map((t) => Number(t.durationHours) || 0)
      let nextHours = presetHours
      if (!nextHours) {
        const maxH = existingHours.length > 0 ? Math.max(...existingHours) : 1
        nextHours = Number((maxH + 0.5).toFixed(1))
      }
      if (existingHours.includes(Number(nextHours))) {
        toast.info(`${nextHours} Hour tier already exists — you can edit its price directly`)
        return prev
      }
      const nextPrice = Math.round(nextHours * base)
      return {
        ...prev,
        pricingTiers: [
          ...prev.pricingTiers,
          { durationHours: nextHours, price: nextPrice },
        ],
      }
    })
  }

  const removeTierRow = (index) => {
    setFormData((prev) => {
      if (prev.pricingTiers.length <= 1) {
        toast.error('At least one duration & price tier is required')
        return prev
      }
      return {
        ...prev,
        pricingTiers: prev.pricingTiers.filter((_, idx) => idx !== index),
      }
    })
  }

  const handleSaveTable = async () => {
    if (!formData.name || !String(formData.name).trim()) {
      toast.error('Please enter a table name')
      return
    }

    const cleanedTiers = formData.pricingTiers
      .map((t) => ({
        durationHours: Number(t.durationHours),
        price: Number(t.price),
      }))
      .filter(
        (t) =>
          !Number.isNaN(t.durationHours) &&
          t.durationHours > 0 &&
          !Number.isNaN(t.price) &&
          t.price >= 0
      )
      .sort((a, b) => a.durationHours - b.durationHours)

    if (cleanedTiers.length === 0) {
      toast.error('Please configure at least one valid duration & price')
      return
    }

    const oneHrTier = cleanedTiers.find((t) => t.durationHours === 1)
    const effectiveHourlyRate = oneHrTier
      ? oneHrTier.price
      : Number(formData.hourlyRate || 200)

    try {
      setSaving(true)
      const method = editingTable ? 'PATCH' : 'POST'
      const payload = {
        ...(editingTable ? { id: editingTable.id } : {}),
        tableNumber: formData.tableNumber,
        name: formData.name.trim(),
        type: formData.type,
        status: formData.status,
        hourlyRate: effectiveHourlyRate,
        description: formData.description,
        pricingTiers: cleanedTiers,
        applyPricingToSameType,
      }

      const res = await fetch('/api/admin/tables', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save table')
      }

      toast.success(
        editingTable
          ? applyPricingToSameType
            ? `Updated ${formData.name} and applied duration prices to all ${formData.type} tables!`
            : `Updated ${formData.name} duration & pricing settings!`
          : `Added ${formData.name} with custom duration pricing!`
      )
      setIsDialogOpen(false)
      setEditingTable(null)
      await fetchTables(true)
    } catch (err) {
      toast.error(err.message || 'Failed to save table')
    } finally {
      setSaving(false)
    }
  }

  const toggleTableActive = async (table) => {
    try {
      const nextActive = !table.isActive
      const res = await fetch('/api/admin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: table.id,
          isActive: nextActive,
          status: nextActive ? 'AVAILABLE' : 'INACTIVE',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to toggle table')
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? data.table : t))
      )
      toast.success(
        `${table.name} is now ${nextActive ? 'Active (Available)' : 'Inactive'}`
      )
    } catch (err) {
      toast.error(err.message || 'Failed to update table active state')
    }
  }

  const updateTableStatus = async (tableId, newStatus) => {
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tableId,
          status: newStatus,
          isActive: newStatus !== 'INACTIVE',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? data.table : t))
      )
      toast.success('Table status updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const deleteTable = async (table) => {
    if (!confirm(`Are you sure you want to delete "${table.name}"?`)) return
    try {
      const res = await fetch(
        `/api/admin/tables?id=${encodeURIComponent(table.id)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete table')

      if (data.mode === 'ARCHIVED') {
        toast.info(
          `${table.name} has past session history, so it was marked Inactive.`
        )
      } else {
        toast.success(`${table.name} deleted`)
      }
      await fetchTables(true)
    } catch (err) {
      toast.error(err.message || 'Failed to delete table')
    }
  }

  const moveSequence = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= tables.length) return

    const currentTable = tables[index]
    const swapTable = tables[targetIndex]

    const updatedList = [...tables]
    updatedList[index] = { ...swapTable, sequence: index + 1 }
    updatedList[targetIndex] = { ...currentTable, sequence: targetIndex + 1 }
    setTables(updatedList)

    try {
      await fetch('/api/admin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REORDER_TABLES',
          items: updatedList.map((t, idx) => ({
            id: t.id,
            sequence: idx + 1,
          })),
        }),
      })
    } catch {
      toast.error('Failed to save table order')
      fetchTables(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Tables
          </h1>
          <p className="text-[#929B95] mt-1">
            Manage pool and snooker tables, custom durations (0.5h, 1h, 1.5h, 2h, etc.), and package prices
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => fetchTables()}
            className="border-white/15 bg-[#111615] text-[#F4F1E8] hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={openAddDialog}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Add / Edit Table & Duration Pricing Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-space-grotesk flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#B6F36B]" />
              {editingTable
                ? `Manage Table & Duration Prices — ${editingTable.name}`
                : 'Add New Table & Duration Prices'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Row 1: Table Name, Code & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="text-xs font-medium text-[#929B95]">
                  Table Name *
                </label>
                <Input
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  placeholder="e.g., Pool Table 1, VIP Snooker"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-[#929B95]">
                  Table Code
                </label>
                <Input
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  placeholder="e.g., T1"
                  value={formData.tableNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, tableNumber: e.target.value })
                  }
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-[#929B95]">
                  Table Type *
                </label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111615] border-white/20 text-[#F4F1E8]">
                    <SelectItem value="POOL">Pool</SelectItem>
                    <SelectItem value="SNOOKER">Snooker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Base 1-Hour Rate & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="text-xs font-medium text-[#929B95]">
                  Standard 1-Hour Rate (₹) *
                </label>
                <Input
                  className="mt-1 bg-[#080A0A] border-white/20 text-[#B6F36B] font-bold"
                  type="number"
                  min="0"
                  placeholder="200"
                  value={formData.hourlyRate}
                  onChange={(e) => handleBaseRateChange(e.target.value)}
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-xs font-medium text-[#929B95]">
                  Default Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="mt-1 bg-[#080A0A] border-white/20 text-[#F4F1E8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111615] border-white/20 text-[#F4F1E8]">
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={autoCalculateTiersFromBaseRate}
                  className="w-full border-[#B6F36B]/30 bg-[#B6F36B]/10 text-[#B6F36B] hover:bg-[#B6F36B]/20 text-xs h-10"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Auto-Fill Prices
                </Button>
              </div>
            </div>

            {/* Row 3: Custom Duration & Price Packages Editor */}
            <div className="p-4 rounded-xl bg-[#080A0A] border border-[#B6F36B]/25 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#F4F1E8] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#B6F36B]" />
                    Duration &amp; Price Packages (1h, 1.5h, 2h &amp; Custom)
                  </h3>
                  <p className="text-[11px] text-[#929B95]">
                    Set exact prices for each duration (e.g. 1 Hour = ₹200, 1.5 Hours = ₹280, 2 Hours = ₹350). Add as many durations as you want!
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addTierRow()}
                  className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 h-8 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Duration &amp; Price
                </Button>
              </div>

              {/* Quick Preset Duration Adders */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-[#929B95] mr-1">
                  Quick Add:
                </span>
                {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6].map((h) => {
                  const exists = formData.pricingTiers.some(
                    (t) => Number(t.durationHours) === h
                  )
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => addTierRow(h)}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                        exists
                          ? 'bg-[#B6F36B]/15 border-[#B6F36B]/40 text-[#B6F36B]'
                          : 'bg-[#111615] border-white/10 text-[#929B95] hover:text-[#F4F1E8] hover:border-white/30'
                      }`}
                    >
                      {exists ? `✓ ${h}h` : `+ ${h}h`}
                    </button>
                  )
                })}
              </div>

              {/* Tier Rows */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 pt-1">
                {formData.pricingTiers.map((tier, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2.5 items-center bg-[#111615] p-2.5 rounded-lg border border-white/10"
                  >
                    <div className="col-span-5">
                      <label className="text-[10px] text-[#929B95] block mb-0.5">
                        Duration (Hours)
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.25"
                          min="0.25"
                          value={tier.durationHours}
                          onChange={(e) =>
                            updateTierRow(index, 'durationHours', e.target.value)
                          }
                          className="h-8 bg-[#080A0A] border-white/15 text-[#F4F1E8] text-xs pr-12"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#929B95]">
                          {Number(tier.durationHours) === 1 ? 'Hour' : 'Hours'}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-5">
                      <label className="text-[10px] text-[#929B95] block mb-0.5">
                        Package Price (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#B6F36B]">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="10"
                          min="0"
                          value={tier.price}
                          onChange={(e) =>
                            updateTierRow(index, 'price', e.target.value)
                          }
                          className="h-8 bg-[#080A0A] border-white/15 text-[#B6F36B] font-bold text-xs pl-6"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 flex justify-end items-end h-full pb-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTierRow(index)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Remove duration tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Apply to all tables of same type checkbox */}
              <label className="flex items-center gap-2.5 pt-2 border-t border-white/10 cursor-pointer text-xs text-[#F4F1E8]">
                <input
                  type="checkbox"
                  checked={applyPricingToSameType}
                  onChange={(e) => setApplyPricingToSameType(e.target.checked)}
                  className="rounded border-white/20 bg-[#080A0A] text-[#B6F36B]"
                />
                <span>
                  Also apply these Duration &amp; Price packages to all{' '}
                  <strong className="text-[#B6F36B]">
                    {formData.type === 'SNOOKER' ? 'Snooker' : 'Pool'}
                  </strong>{' '}
                  tables
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-white/15 bg-transparent text-[#929B95] hover:text-[#F4F1E8]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleSaveTable}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold px-6"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {saving
                  ? 'Saving...'
                  : editingTable
                  ? 'Save Table & Prices'
                  : 'Create Table'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Tables List */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-12 text-[#929B95]">
              Loading tables &amp; pricing packages...
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-[#929B95]">No tables configured yet.</p>
              <Button
                onClick={openAddDialog}
                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Table
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-[#929B95] w-20">Order</TableHead>
                  <TableHead className="text-[#929B95]">Table Name</TableHead>
                  <TableHead className="text-[#929B95]">Type</TableHead>
                  <TableHead className="text-[#929B95]">Status</TableHead>
                  <TableHead className="text-[#929B95]">1-Hr Rate</TableHead>
                  <TableHead className="text-[#929B95]">
                    Duration &amp; Price Packages (1h, 1.5h, 2h, etc.)
                  </TableHead>
                  <TableHead className="text-[#929B95] text-center">
                    Active
                  </TableHead>
                  <TableHead className="text-[#929B95] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table, index) => {
                  const tiers = Array.isArray(table.pricingTiers)
                    ? table.pricingTiers
                    : buildDefaultTiers(table.hourlyRate)
                  return (
                    <TableRow key={table.id} className="border-white/10">
                      {/* Sequence Order */}
                      <TableCell className="text-[#F4F1E8] font-medium">
                        <div className="flex items-center gap-1">
                          <span className="w-6 text-center font-mono text-xs">
                            {index + 1}
                          </span>
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSequence(index, -1)}
                              disabled={index === 0}
                              className="h-4 w-4 p-0 text-[#929B95] hover:text-[#F4F1E8]"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSequence(index, 1)}
                              disabled={index === tables.length - 1}
                              className="h-4 w-4 p-0 text-[#929B95] hover:text-[#F4F1E8]"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>

                      {/* Table Name & Code */}
                      <TableCell>
                        <div className="font-semibold text-[#F4F1E8]">
                          {table.name}
                        </div>
                        <div className="text-[11px] text-[#929B95] font-mono">
                          Code: {table.tableNumber}
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            table.type === 'SNOOKER'
                              ? 'border-[#D6B36A]/40 bg-[#D6B36A]/10 text-[#D6B36A]'
                              : 'border-[#B6F36B]/40 bg-[#B6F36B]/10 text-[#B6F36B]'
                          }
                        >
                          {table.type === 'SNOOKER' ? 'Snooker' : 'Pool'}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Select
                          value={table.status}
                          onValueChange={(value) =>
                            updateTableStatus(table.id, value)
                          }
                        >
                          <SelectTrigger className="w-36 bg-[#080A0A] border-white/20 text-[#F4F1E8] text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111615] border-white/20 text-[#F4F1E8]">
                            <SelectItem value="AVAILABLE">Available</SelectItem>
                            <SelectItem value="OCCUPIED">Occupied</SelectItem>
                            <SelectItem value="MAINTENANCE">
                              Maintenance
                            </SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* 1-Hr Rate */}
                      <TableCell className="text-[#B6F36B] font-bold">
                        ₹{table.hourlyRate}/hr
                      </TableCell>

                      {/* Duration & Price Packages */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                          {tiers.map((tier, idx) => (
                            <span
                              key={idx}
                              onClick={() => openEditDialog(table)}
                              title="Click to modify duration & price"
                              className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#080A0A] border border-white/15 hover:border-[#B6F36B]/60 text-[11px] transition-colors"
                            >
                              <span className="text-[#929B95]">
                                {formatDurationBadgeLabel(tier.durationHours)}:
                              </span>
                              <span className="font-bold text-[#B6F36B]">
                                ₹{tier.price}
                              </span>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => openEditDialog(table)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#B6F36B]/15 border border-[#B6F36B]/30 text-[#B6F36B] hover:bg-[#B6F36B]/25 text-[11px] font-semibold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Edit / Add Hours
                          </button>
                        </div>
                      </TableCell>

                      {/* Active Toggle */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTableActive(table)}
                          className={
                            table.isActive ? 'text-green-400' : 'text-red-400'
                          }
                          title={
                            table.isActive
                              ? 'Table is Active (Click to disable)'
                              : 'Table is Inactive (Click to enable)'
                          }
                        >
                          {table.isActive ? (
                            <Power className="w-4 h-4" />
                          ) : (
                            <PowerOff className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(table)}
                            className="h-8 border-white/15 bg-[#080A0A] text-[#F4F1E8] hover:border-[#B6F36B] hover:text-[#B6F36B] text-xs"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            Manage
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTable(table)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
