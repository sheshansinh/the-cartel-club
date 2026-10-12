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
  Truck,
  Plus,
  CheckCircle2,
  FileText,
  Building2,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSuppliers() {
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders') // 'orders' | 'suppliers'
  const [submitting, setSubmitting] = useState(false)

  // New Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
    notes: '',
  })

  // New Purchase Order Modal
  const [isPOModalOpen, setIsPOModalOpen] = useState(false)
  const [poForm, setPoForm] = useState({
    supplierId: '',
    expectedDate: '',
    taxAmount: '0',
    paidAmount: '0',
    notes: '',
    items: [{ productId: '', orderedQuantity: '10', unitPrice: '' }],
  })

  // Receive PO Modal
  const [receiveTarget, setReceiveTarget] = useState(null)
  const [receiveQuantities, setReceiveQuantities] = useState({})
  const [receivePaidAmount, setReceivePaidAmount] = useState('0')

  const fetchSuppliersAndPOs = useCallback(async () => {
    try {
      setLoading(true)
      const [poRes, supRes] = await Promise.all([
        fetch('/api/admin/purchase-orders'),
        fetch('/api/admin/suppliers'),
      ])

      if (poRes.ok) {
        const data = await poRes.json()
        setPurchaseOrders(data.purchaseOrders || [])
        setProducts(data.products || [])
      }
      if (supRes.ok) {
        const supData = await supRes.json()
        setSuppliers(supData.suppliers || [])
      }
    } catch (err) {
      console.error('Error loading suppliers & POs:', err)
      toast.error('Failed to load suppliers and purchase orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuppliersAndPOs()
  }, [fetchSuppliersAndPOs])

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      toast.error('Supplier name and phone number are required')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create supplier')

      toast.success(`Supplier "${data.supplier.name}" added`)
      setIsSupplierModalOpen(false)
      setSupplierForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstNumber: '',
        address: '',
        notes: '',
      })
      fetchSuppliersAndPOs()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openCreatePOModal = () => {
    const firstSupplier = suppliers[0]?.id || ''
    const firstProduct = products[0]
    setPoForm({
      supplierId: firstSupplier,
      expectedDate: new Date().toISOString().split('T')[0],
      taxAmount: '0',
      paidAmount: '0',
      notes: '',
      items: [
        {
          productId: firstProduct?.id || '',
          orderedQuantity: '10',
          unitPrice: firstProduct ? String(firstProduct.purchaseCost) : '0',
        },
      ],
    })
    setIsPOModalOpen(true)
  }

  const addPOItemRow = () => {
    const firstProduct = products[0]
    setPoForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: firstProduct?.id || '',
          orderedQuantity: '5',
          unitPrice: firstProduct ? String(firstProduct.purchaseCost) : '0',
        },
      ],
    }))
  }

  const updatePOItemRow = (index, field, value) => {
    setPoForm((prev) => {
      const nextItems = [...prev.items]
      const current = { ...nextItems[index], [field]: value }
      if (field === 'productId') {
        const matched = products.find((p) => p.id === value)
        if (matched) {
          current.unitPrice = String(matched.purchaseCost || 0)
        }
      }
      nextItems[index] = current
      return { ...prev, items: nextItems }
    })
  }

  const removePOItemRow = (index) => {
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }))
  }

  const handleCreatePO = async () => {
    if (!poForm.supplierId) {
      toast.error('Please select a supplier')
      return
    }
    const validItems = poForm.items.filter(
      (i) => i.productId && Number(i.orderedQuantity) > 0
    )
    if (validItems.length === 0) {
      toast.error('Add at least one valid product line item')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          expectedDate: poForm.expectedDate || null,
          taxAmount: Number(poForm.taxAmount || 0),
          paidAmount: Number(poForm.paidAmount || 0),
          notes: poForm.notes || null,
          items: validItems.map((i) => ({
            productId: i.productId,
            orderedQuantity: Number(i.orderedQuantity),
            unitPrice: Number(i.unitPrice || 0),
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create PO')

      toast.success(`Purchase Order ${data.purchaseOrder.orderNumber} created`)
      setIsPOModalOpen(false)
      fetchSuppliersAndPOs()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openReceiveModal = (po) => {
    const map = {}
    for (const item of po.items || []) {
      const remaining = Math.max(
        0,
        Number(item.orderedQuantity) - Number(item.receivedQuantity || 0)
      )
      map[item.id] = String(remaining)
    }
    setReceiveQuantities(map)
    setReceivePaidAmount(String(po.totalAmount || 0))
    setReceiveTarget(po)
  }

  const handleConfirmReceive = async () => {
    if (!receiveTarget) return
    try {
      setSubmitting(true)
      const receivedItems = (receiveTarget.items || []).map((item) => ({
        itemId: item.id,
        productId: item.productId,
        receiveQty: Number(receiveQuantities[item.id] || 0),
      }))

      const res = await fetch(`/api/admin/purchase-orders/${receiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVE',
          receivedItems,
          paidAmount: Number(receivePaidAmount || 0),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to receive PO')

      toast.success(
        `PO ${receiveTarget.orderNumber} received — inventory stock updated!`
      )
      setReceiveTarget(null)
      fetchSuppliersAndPOs()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelPO = async (po) => {
    if (!confirm(`Cancel Purchase Order ${po.orderNumber}?`)) return
    try {
      const res = await fetch(`/api/admin/purchase-orders/${po.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel PO')
      toast.success(`PO ${po.orderNumber} cancelled`)
      fetchSuppliersAndPOs()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const poSubtotal = poForm.items.reduce(
    (sum, i) => sum + Number(i.orderedQuantity || 0) * Number(i.unitPrice || 0),
    0
  )
  const poGrandTotal = poSubtotal + Number(poForm.taxAmount || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Suppliers & Purchase Orders
          </h1>
          <p className="text-[#929B95] mt-1">
            Manage vendor directory, issue purchase orders, and receive stock into inventory
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchSuppliersAndPOs}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsSupplierModalOpen(true)}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
          <Button
            onClick={openCreatePOModal}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Button
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('orders')}
          className={
            activeTab === 'orders'
              ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
              : 'text-[#929B95] hover:text-[#F4F1E8]'
          }
        >
          <FileText className="w-4 h-4 mr-2" />
          Purchase Orders ({purchaseOrders.length})
        </Button>
        <Button
          variant={activeTab === 'suppliers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('suppliers')}
          className={
            activeTab === 'suppliers'
              ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
              : 'text-[#929B95] hover:text-[#F4F1E8]'
          }
        >
          <Truck className="w-4 h-4 mr-2" />
          Suppliers Directory ({suppliers.length})
        </Button>
      </div>

      {activeTab === 'orders' ? (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8 text-[#929B95]">
                Loading purchase orders...
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-[#929B95]">
                  No purchase orders created yet. Create a PO to restock products from a supplier.
                </p>
                <Button
                  onClick={openCreatePOModal}
                  className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Purchase Order
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">PO Number</TableHead>
                    <TableHead className="text-[#929B95]">Supplier</TableHead>
                    <TableHead className="text-[#929B95]">Order Date</TableHead>
                    <TableHead className="text-[#929B95]">Items</TableHead>
                    <TableHead className="text-[#929B95]">Total</TableHead>
                    <TableHead className="text-[#929B95]">Paid</TableHead>
                    <TableHead className="text-[#929B95]">Status</TableHead>
                    <TableHead className="text-[#929B95] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => {
                    const canReceive =
                      po.status !== 'RECEIVED' && po.status !== 'CANCELLED'
                    return (
                      <TableRow key={po.id} className="border-white/10">
                        <TableCell className="font-mono text-xs text-[#F4F1E8] font-semibold">
                          {po.orderNumber}
                        </TableCell>
                        <TableCell className="text-[#F4F1E8]">
                          {po.supplier?.name || 'Supplier'}
                        </TableCell>
                        <TableCell className="text-xs text-[#929B95]">
                          {new Date(po.orderDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="text-xs text-[#929B95]">
                          {(po.items || [])
                            .map(
                              (i) =>
                                `${i.product?.name || 'Item'} (${i.receivedQuantity}/${i.orderedQuantity})`
                            )
                            .join(', ')}
                        </TableCell>
                        <TableCell className="font-semibold text-[#F4F1E8]">
                          ₹{po.totalAmount}
                        </TableCell>
                        <TableCell className="text-[#B6F36B]">
                          ₹{po.paidAmount}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              po.status === 'RECEIVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : po.status === 'CANCELLED'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {po.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {canReceive && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => openReceiveModal(po)}
                                className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 text-xs font-semibold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Receive Stock
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelPO(po)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Suppliers Directory */
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-[#929B95]">Supplier Name</TableHead>
                  <TableHead className="text-[#929B95]">Contact Person</TableHead>
                  <TableHead className="text-[#929B95]">Phone & Email</TableHead>
                  <TableHead className="text-[#929B95]">GSTIN</TableHead>
                  <TableHead className="text-[#929B95]">Address / Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((sup) => (
                  <TableRow key={sup.id} className="border-white/10">
                    <TableCell className="text-[#F4F1E8] font-semibold">
                      {sup.name}
                    </TableCell>
                    <TableCell className="text-[#929B95]">
                      {sup.contactPerson || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[#F4F1E8]">{sup.phone}</div>
                      {sup.email && (
                        <div className="text-xs text-[#929B95]">{sup.email}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#D6B36A]">
                      {sup.gstNumber || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[#929B95] max-w-xs">
                      <div>{sup.address}</div>
                      {sup.notes && (
                        <div className="text-[#B6F36B]/80 mt-0.5">{sup.notes}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Supplier Modal */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Company Name *</label>
              <Input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                className="bg-[#080A0A] border-white/20"
                placeholder="e.g. Ahmedabad Beverage Distributors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Contact Person</label>
                <Input
                  value={supplierForm.contactPerson}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, contactPerson: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Phone *</label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                  placeholder="+91 98..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Email</label>
                <Input
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, email: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">GST Number</label>
                <Input
                  value={supplierForm.gstNumber}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, gstNumber: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Address</label>
              <Input
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <Button
              disabled={submitting}
              onClick={handleCreateSupplier}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Saving...' : 'Save Supplier'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Order Modal */}
      <Dialog open={isPOModalOpen} onOpenChange={setIsPOModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Supplier *</label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Expected Delivery Date</label>
                <Input
                  type="date"
                  value={poForm.expectedDate}
                  onChange={(e) =>
                    setPoForm({ ...poForm, expectedDate: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#F4F1E8]">
                  Order Line Items
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addPOItemRow}
                  className="h-7 text-xs border-white/20 text-[#B6F36B]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {poForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-[#080A0A] p-2 rounded-lg border border-white/10"
                  >
                    <div className="col-span-6">
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          updatePOItemRow(idx, 'productId', e.target.value)
                        }
                        className="w-full h-9 rounded bg-[#111615] border border-white/15 px-2 text-xs text-[#F4F1E8]"
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.currentStock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.orderedQuantity}
                        onChange={(e) =>
                          updatePOItemRow(idx, 'orderedQuantity', e.target.value)
                        }
                        className="h-9 bg-[#111615] border-white/15 text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Unit Cost ₹"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updatePOItemRow(idx, 'unitPrice', e.target.value)
                        }
                        className="h-9 bg-[#111615] border-white/15 text-xs"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      {poForm.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePOItemRow(idx)}
                          className="h-8 w-8 p-0 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">GST / Tax Amount (₹)</label>
                <Input
                  type="number"
                  value={poForm.taxAmount}
                  onChange={(e) => setPoForm({ ...poForm, taxAmount: e.target.value })}
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Advance Paid (₹)</label>
                <Input
                  type="number"
                  value={poForm.paidAmount}
                  onChange={(e) => setPoForm({ ...poForm, paidAmount: e.target.value })}
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#080A0A] border border-white/10 flex justify-between items-center">
              <span className="text-sm text-[#929B95]">PO Grand Total</span>
              <span className="text-lg font-bold text-[#B6F36B]">
                ₹{poGrandTotal.toFixed(2)}
              </span>
            </div>

            <Button
              disabled={submitting}
              onClick={handleCreatePO}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Creating PO...' : 'Issue Purchase Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive PO Stock Modal */}
      <Dialog open={Boolean(receiveTarget)} onOpenChange={() => setReceiveTarget(null)}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Receive Stock — {receiveTarget?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {receiveTarget && (
            <div className="space-y-4">
              <p className="text-xs text-[#929B95]">
                Confirm the quantities received from{' '}
                <span className="text-[#F4F1E8] font-medium">
                  {receiveTarget.supplier?.name}
                </span>
                . Each received item will automatically increment product inventory stock.
              </p>

              <div className="space-y-2">
                {(receiveTarget.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#080A0A] border border-white/10"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#F4F1E8]">
                        {item.product?.name}
                      </div>
                      <div className="text-xs text-[#929B95]">
                        Ordered: {item.orderedQuantity} • Already Received:{' '}
                        {item.receivedQuantity}
                      </div>
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        value={receiveQuantities[item.id] ?? '0'}
                        onChange={(e) =>
                          setReceiveQuantities({
                            ...receiveQuantities,
                            [item.id]: e.target.value,
                          })
                        }
                        className="h-9 bg-[#111615] border-white/20 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-[#929B95] mb-1 block">
                  Total Amount Paid to Supplier (₹)
                </label>
                <Input
                  type="number"
                  value={receivePaidAmount}
                  onChange={(e) => setReceivePaidAmount(e.target.value)}
                  className="bg-[#080A0A] border-white/20"
                />
              </div>

              <Button
                disabled={submitting}
                onClick={handleConfirmReceive}
                className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
              >
                {submitting
                  ? 'Receiving & Updating Stock...'
                  : 'Confirm Receipt & Add to Stock'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

