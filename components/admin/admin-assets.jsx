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
  ShieldCheck,
  Wrench,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminAssets() {
  const [assets, setAssets] = useState([])
  const [maintenanceRecords, setMaintenanceRecords] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('assets') // 'assets' | 'maintenance'
  const [submitting, setSubmitting] = useState(false)

  // Add Asset Modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'Gaming Tables',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    supplierId: '',
    location: 'Main Arena',
    warrantyEndDate: '',
    warrantyProvider: '',
    notes: '',
  })

  // Log Maintenance Modal
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false)
  const [maintForm, setMaintForm] = useState({
    assetId: '',
    description: '',
    cost: '0',
    status: 'PENDING',
    notes: '',
  })

  const fetchAssetsData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/assets')
      if (!res.ok) throw new Error('Failed to load assets')
      const data = await res.json()
      setAssets(data.assets || [])
      setMaintenanceRecords(data.maintenanceRecords || [])
      setSuppliers(data.suppliers || [])
    } catch (err) {
      console.error('Error loading assets:', err)
      toast.error('Failed to load assets & warranties')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssetsData()
  }, [fetchAssetsData])

  const handleCreateAsset = async () => {
    if (!assetForm.name.trim() || !assetForm.category.trim()) {
      toast.error('Asset name and category are required')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assetForm,
          purchaseCost: Number(assetForm.purchaseCost || 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to register asset')

      toast.success(`Asset "${data.asset.name}" registered`)
      setIsAssetModalOpen(false)
      fetchAssetsData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openMaintenanceModal = (asset = null) => {
    const target = asset || assets[0]
    setMaintForm({
      assetId: target?.id || '',
      description: '',
      cost: '0',
      status: 'PENDING',
      notes: '',
    })
    setIsMaintModalOpen(true)
  }

  const handleLogMaintenance = async () => {
    if (!maintForm.assetId || !maintForm.description.trim()) {
      toast.error('Select an asset and enter a maintenance description')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_MAINTENANCE',
          ...maintForm,
          cost: Number(maintForm.cost || 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to log maintenance')

      toast.success('Maintenance ticket logged')
      setIsMaintModalOpen(false)
      fetchAssetsData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolveMaintenance = async (record) => {
    try {
      const res = await fetch(`/api/admin/assets/${record.assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE_MAINTENANCE',
          maintenanceId: record.id,
        }),
      })
      if (!res.ok) throw new Error('Failed to resolve maintenance')
      toast.success('Maintenance resolved & asset marked OPERATIONAL')
      fetchAssetsData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const totalAssetValue = assets.reduce(
    (sum, a) => sum + Number(a.purchaseCost || 0),
    0
  )
  const expiringWarranties = assets.filter(
    (a) => a.warrantyStatus === 'EXPIRING_SOON' || a.warrantyStatus === 'EXPIRED'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Assets, Warranties &amp; Maintenance
          </h1>
          <p className="text-[#929B95] mt-1">
            Fixed equipment register, warranty expiry tracking, and repair logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchAssetsData}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => openMaintenanceModal()}
            className="border-white/15 text-[#D6B36A] hover:bg-white/10"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Log Maintenance
          </Button>
          <Button
            onClick={() => setIsAssetModalOpen(true)}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Asset
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Total Fixed Assets Value
            </CardTitle>
            <HardDrive className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              ₹{totalAssetValue.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Across {assets.length} registered capital assets
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Warranty Alerts
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {expiringWarranties.length}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Expiring within 30 days or expired
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Under Maintenance
            </CardTitle>
            <Wrench className="w-4 h-4 text-[#D6B36A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              {maintenanceRecords.length} total maintenance logs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Button
          variant={activeTab === 'assets' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('assets')}
          className={
            activeTab === 'assets'
              ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
              : 'text-[#929B95] hover:text-[#F4F1E8]'
          }
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          Assets &amp; Warranties ({assets.length})
        </Button>
        <Button
          variant={activeTab === 'maintenance' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('maintenance')}
          className={
            activeTab === 'maintenance'
              ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
              : 'text-[#929B95] hover:text-[#F4F1E8]'
          }
        >
          <Wrench className="w-4 h-4 mr-2" />
          Maintenance Logs ({maintenanceRecords.length})
        </Button>
      </div>

      {activeTab === 'assets' ? (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8 text-[#929B95]">
                Loading assets...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Asset / Serial</TableHead>
                    <TableHead className="text-[#929B95]">Category &amp; Location</TableHead>
                    <TableHead className="text-[#929B95]">Purchase Cost</TableHead>
                    <TableHead className="text-[#929B95]">Warranty Status</TableHead>
                    <TableHead className="text-[#929B95]">Operational Status</TableHead>
                    <TableHead className="text-[#929B95] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id} className="border-white/10">
                      <TableCell>
                        <div className="text-[#F4F1E8] font-medium">
                          {asset.name}
                        </div>
                        {asset.serialNumber && (
                          <div className="text-xs font-mono text-[#929B95]">
                            SN: {asset.serialNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-[#F4F1E8]">
                          {asset.category}
                        </div>
                        <div className="text-xs text-[#929B95]">
                          {asset.location || 'Main Floor'}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-[#D6B36A]">
                        ₹{Number(asset.purchaseCost || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {asset.latestWarranty ? (
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                asset.warrantyStatus === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : asset.warrantyStatus === 'EXPIRING_SOON'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {asset.warrantyStatus.replace(/_/g, ' ')}
                            </span>
                            <div className="text-xs text-[#929B95] mt-1">
                              Until{' '}
                              {new Date(
                                asset.latestWarranty.endDate
                              ).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#929B95]">No Warranty</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            asset.status === 'OPERATIONAL'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : asset.status === 'UNDER_MAINTENANCE'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {asset.status.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMaintenanceModal(asset)}
                          className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                        >
                          <Wrench className="w-3.5 h-3.5 mr-1" />
                          Service / Repair
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            {maintenanceRecords.length === 0 ? (
              <p className="text-center py-8 text-[#929B95]">
                No maintenance or repair tickets logged yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Date</TableHead>
                    <TableHead className="text-[#929B95]">Asset</TableHead>
                    <TableHead className="text-[#929B95]">Work Description</TableHead>
                    <TableHead className="text-[#929B95]">Cost</TableHead>
                    <TableHead className="text-[#929B95]">Status</TableHead>
                    <TableHead className="text-[#929B95] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRecords.map((rec) => (
                    <TableRow key={rec.id} className="border-white/10">
                      <TableCell className="text-xs text-[#929B95]">
                        {new Date(rec.reportedDate).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-[#F4F1E8] font-medium">
                        {rec.asset?.name}
                      </TableCell>
                      <TableCell className="text-sm text-[#F4F1E8]">
                        {rec.description}
                      </TableCell>
                      <TableCell className="text-[#D6B36A] font-medium">
                        ₹{Number(rec.cost || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rec.status === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.status !== 'RESOLVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleResolveMaintenance(rec)}
                            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 text-xs font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Mark Resolved
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Register Asset Dialog */}
      <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>Register Club Asset &amp; Warranty</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Asset Name *</label>
              <Input
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="e.g. Rasson Ox Pool Table #5"
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Category *</label>
                <select
                  value={assetForm.category}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, category: e.target.value })
                  }
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="Gaming Tables">Gaming Tables</option>
                  <option value="Equipment">Equipment</option>
                  <option value="HVAC & Electrical">HVAC &amp; Electrical</option>
                  <option value="IT & POS">IT &amp; POS</option>
                  <option value="Furniture & Interior">Furniture &amp; Interior</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Serial Number</label>
                <Input
                  value={assetForm.serialNumber}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, serialNumber: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Purchase Cost (₹)</label>
                <Input
                  type="number"
                  value={assetForm.purchaseCost}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, purchaseCost: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Location</label>
                <Input
                  value={assetForm.location}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, location: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Warranty End Date</label>
                <Input
                  type="date"
                  value={assetForm.warrantyEndDate}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, warrantyEndDate: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Warranty Provider</label>
                <Input
                  value={assetForm.warrantyProvider}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, warrantyProvider: e.target.value })
                  }
                  placeholder="Vendor / OEM"
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <Button
              disabled={submitting}
              onClick={handleCreateAsset}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Saving...' : 'Save Asset & Warranty'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Maintenance Dialog */}
      <Dialog open={isMaintModalOpen} onOpenChange={setIsMaintModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>Log Asset Maintenance / Repair</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Asset *</label>
              <select
                value={maintForm.assetId}
                onChange={(e) =>
                  setMaintForm({ ...maintForm, assetId: e.target.value })
                }
                className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">
                Issue / Repair Description *
              </label>
              <Input
                value={maintForm.description}
                onChange={(e) =>
                  setMaintForm({ ...maintForm, description: e.target.value })
                }
                placeholder="e.g. Cloth re-stretching and pocket leather replacement"
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Repair Cost (₹)</label>
                <Input
                  type="number"
                  value={maintForm.cost}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, cost: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Status</label>
                <select
                  value={maintForm.status}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, status: e.target.value })
                  }
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED (Completed)</option>
                </select>
              </div>
            </div>
            <Button
              disabled={submitting}
              onClick={handleLogMaintenance}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Logging...' : 'Save Maintenance Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

