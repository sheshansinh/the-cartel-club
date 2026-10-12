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
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  RefreshCw,
  ArrowUpDown,
  History,
  FolderPlus,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminInventory() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [movements, setMovements] = useState([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalCostValue: 0,
    totalRetailValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState('products')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  // Product Add/Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    purchaseCost: '',
    sellingPrice: '',
    currentStock: '0',
    minStockLevel: '10',
    unit: 'piece',
    description: '',
  })

  // Stock Movement Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [adjustForm, setAdjustForm] = useState({
    movementType: 'PURCHASE',
    quantity: '1',
    reason: '',
  })

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    sortOrder: '1',
  })

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true)
      const [prodRes, movRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/inventory/movements'),
      ])

      if (prodRes.ok) {
        const data = await prodRes.json()
        setProducts(data.products || [])
        setCategories(data.categories || [])
        if (data.summary) setSummary(data.summary)
      }

      if (movRes.ok) {
        const movData = await movRes.json()
        setMovements(movData.movements || [])
      }
    } catch (err) {
      console.error('Failed to load inventory:', err)
      toast.error('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'LOW_STOCK'
        ? item.isLowStock
        : item.categoryId === selectedCategory)
    return matchesSearch && matchesCategory
  })

  const lowStockItems = products.filter((item) => item.isLowStock)

  const openAddProductModal = () => {
    setEditingProduct(null)
    setProductForm({
      name: '',
      sku: '',
      categoryId: categories[0]?.id || '',
      purchaseCost: '',
      sellingPrice: '',
      currentStock: '0',
      minStockLevel: '10',
      unit: 'piece',
      description: '',
    })
    setIsProductModalOpen(true)
  }

  const openEditProductModal = (prod) => {
    setEditingProduct(prod)
    setProductForm({
      name: prod.name || '',
      sku: prod.sku || '',
      categoryId: prod.categoryId || categories[0]?.id || '',
      purchaseCost: String(prod.purchaseCost ?? 0),
      sellingPrice: String(prod.sellingPrice ?? 0),
      currentStock: String(prod.currentStock ?? 0),
      minStockLevel: String(prod.minStockLevel ?? 10),
      unit: prod.unit || 'piece',
      description: prod.description || '',
    })
    setIsProductModalOpen(true)
  }

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.categoryId) {
      toast.error('Product name and category are required')
      return
    }
    try {
      setSubmitting(true)
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products'
      const method = editingProduct ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          purchaseCost: Number(productForm.purchaseCost || 0),
          sellingPrice: Number(productForm.sellingPrice || 0),
          currentStock: Number(productForm.currentStock || 0),
          minStockLevel: Number(productForm.minStockLevel || 0),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save product')

      toast.success(editingProduct ? 'Product updated' : 'Product added to inventory')
      setIsProductModalOpen(false)
      fetchInventoryData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openAdjustModal = (prod, defaultType = 'PURCHASE') => {
    setAdjustProduct(prod)
    setAdjustForm({
      movementType: defaultType,
      quantity: '1',
      reason: '',
    })
    setIsAdjustModalOpen(true)
  }

  const handleConfirmAdjustment = async () => {
    if (!adjustProduct) return
    const qty = Number(adjustForm.quantity)
    if (!Number.isFinite(qty) || qty === 0) {
      toast.error('Enter a valid non-zero quantity')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustProduct.id,
          movementType: adjustForm.movementType,
          quantity: qty,
          reason:
            adjustForm.reason.trim() ||
            `${adjustForm.movementType} update via Inventory panel`,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock')

      toast.success(
        `Stock updated for ${adjustProduct.name} (${data.movement.previousStock} → ${data.movement.newStock})`
      )
      setIsAdjustModalOpen(false)
      fetchInventoryData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivateProduct = async (prod) => {
    if (!confirm(`Deactivate "${prod.name}" from active catalog?`)) return
    try {
      const res = await fetch(`/api/admin/products/${prod.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to deactivate product')
      toast.success(`"${prod.name}" deactivated`)
      fetchInventoryData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save category')

      toast.success(`Category "${data.category.name}" saved`)
      setIsCategoryModalOpen(false)
      setCategoryForm({ name: '', description: '', sortOrder: '1' })
      fetchInventoryData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Inventory & Stock Ledger
          </h1>
          <p className="text-[#929B95] mt-1">
            Real-time products, low-stock alerts, and auditable stock movements
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchInventoryData}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Category
          </Button>
          <Button
            onClick={openAddProductModal}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-400 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alert ({lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below minimum threshold)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-[#080A0A]/80 border border-red-500/20 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium text-[#F4F1E8]">{item.name}</div>
                    <div className="text-xs text-[#929B95]">
                      Min: {item.minStockLevel} {item.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-sm font-bold">
                      {item.currentStock} {item.unit}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => openAdjustModal(item, 'PURCHASE')}
                      className="h-7 px-2 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 text-xs"
                    >
                      Restock
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Active Products
            </CardTitle>
            <Package className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {summary.totalProducts}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Across {categories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {summary.lowStockCount}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Needs restock / PO
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Inventory Cost Value
            </CardTitle>
            <Package className="w-4 h-4 text-[#D6B36A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              ₹{Number(summary.totalCostValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">At purchase cost</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Retail Value
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#B6F36B]">
              ₹{Number(summary.totalRetailValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">At POS selling price</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Button
          variant={activeSubTab === 'products' ? 'default' : 'ghost'}
          onClick={() => setActiveSubTab('products')}
          className={
            activeSubTab === 'products'
              ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
              : 'text-[#929B95] hover:text-[#F4F1E8]'
          }
        >
          <Package className="w-4 h-4 mr-2" />
          Products Catalog ({products.length})
        </Button>
        <Button
          variant={activeSubTab === 'movements' ? 'default' : 'ghost'}
          onClick={() => setActiveSubTab('movements')}
          className={
            activeSubTab === 'movements'
              ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
              : 'text-[#929B95] hover:text-[#F4F1E8]'
          }
        >
          <History className="w-4 h-4 mr-2" />
          Stock Movements ({movements.length})
        </Button>
      </div>

      {activeSubTab === 'products' ? (
        <>
          {/* Filter Bar */}
          <Card className="bg-[#111615] border-white/10">
            <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <Input
                placeholder="Search by product name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#080A0A] border-white/20 text-[#F4F1E8] md:max-w-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('ALL')}
                  className={
                    selectedCategory === 'ALL'
                      ? 'bg-[#B6F36B] text-[#080A0A]'
                      : 'border-white/15 text-[#929B95]'
                  }
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={selectedCategory === 'LOW_STOCK' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('LOW_STOCK')}
                  className={
                    selectedCategory === 'LOW_STOCK'
                      ? 'bg-red-500 text-white'
                      : 'border-red-500/30 text-red-400'
                  }
                >
                  Low Stock ({lowStockItems.length})
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={
                      selectedCategory === cat.id
                        ? 'bg-[#B6F36B] text-[#080A0A]'
                        : 'border-white/15 text-[#929B95]'
                    }
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="bg-[#111615] border-white/10">
            <CardContent className="p-6">
              {loading ? (
                <div className="text-center py-8 text-[#929B95]">
                  Loading inventory...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-[#929B95]">
                  No products match your filter.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-[#929B95]">SKU / Product</TableHead>
                      <TableHead className="text-[#929B95]">Category</TableHead>
                      <TableHead className="text-[#929B95]">Stock</TableHead>
                      <TableHead className="text-[#929B95]">Min Level</TableHead>
                      <TableHead className="text-[#929B95]">Cost</TableHead>
                      <TableHead className="text-[#929B95]">Selling Price</TableHead>
                      <TableHead className="text-[#929B95]">Status</TableHead>
                      <TableHead className="text-[#929B95] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((item) => (
                      <TableRow key={item.id} className="border-white/10">
                        <TableCell>
                          <div className="text-[#F4F1E8] font-medium">{item.name}</div>
                          {item.sku && (
                            <div className="text-xs text-[#929B95] font-mono">
                              {item.sku}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-[#929B95]">
                          {item.category?.name || '—'}
                        </TableCell>
                        <TableCell className="text-[#F4F1E8] font-semibold">
                          {item.currentStock} <span className="text-xs text-[#929B95] font-normal">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-[#929B95]">
                          {item.minStockLevel} {item.unit}
                        </TableCell>
                        <TableCell className="text-[#929B95]">
                          ₹{item.purchaseCost}
                        </TableCell>
                        <TableCell className="text-[#B6F36B] font-semibold">
                          ₹{item.sellingPrice}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              item.isLowStock
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {item.isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustModal(item, 'PURCHASE')}
                              className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                              Adjust Stock
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProductModal(item)}
                              className="text-[#929B95] hover:text-[#F4F1E8]"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateProduct(item)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Stock Movements Ledger */
        <Card className="bg-[#111615] border-white/10">
          <CardHeader>
            <CardTitle className="text-[#F4F1E8]">
              Recent Stock Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="text-center py-8 text-[#929B95]">
                No stock movements recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Date & Time</TableHead>
                    <TableHead className="text-[#929B95]">Product</TableHead>
                    <TableHead className="text-[#929B95]">Type</TableHead>
                    <TableHead className="text-[#929B95]">Change</TableHead>
                    <TableHead className="text-[#929B95]">Stock (Before → After)</TableHead>
                    <TableHead className="text-[#929B95]">Reason / Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => {
                    const isPositive = Number(mov.quantity) > 0
                    return (
                      <TableRow key={mov.id} className="border-white/10">
                        <TableCell className="text-xs text-[#929B95]">
                          {new Date(mov.createdAt).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-[#F4F1E8] font-medium">
                          {mov.product?.name || 'Product'}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-[#F4F1E8]">
                            {mov.movementType}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isPositive ? `+${mov.quantity}` : mov.quantity}
                        </TableCell>
                        <TableCell className="text-[#929B95] text-sm">
                          {mov.previousStock} →{' '}
                          <span className="text-[#F4F1E8] font-medium">
                            {mov.newStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-[#929B95]">
                          {mov.reason}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Product Dialog */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-[#929B95] mb-1 block">Product Name *</label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="bg-[#080A0A] border-white/20"
                  placeholder="e.g. Red Bull 250ml"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-[#929B95] mb-1 block">SKU Code</label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  className="bg-[#080A0A] border-white/20"
                  placeholder="e.g. BEV-RB-250"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Category *</label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) =>
                    setProductForm({ ...productForm, categoryId: e.target.value })
                  }
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Unit</label>
                <select
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  <option value="piece">piece</option>
                  <option value="can">can</option>
                  <option value="bottle">bottle</option>
                  <option value="plate">plate</option>
                  <option value="pack">pack</option>
                  <option value="box">box</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Purchase Cost (₹)</label>
                <Input
                  type="number"
                  value={productForm.purchaseCost}
                  onChange={(e) =>
                    setProductForm({ ...productForm, purchaseCost: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">POS Selling Price (₹)</label>
                <Input
                  type="number"
                  value={productForm.sellingPrice}
                  onChange={(e) =>
                    setProductForm({ ...productForm, sellingPrice: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!editingProduct && (
                <div>
                  <label className="text-xs text-[#929B95] mb-1 block">Opening Stock</label>
                  <Input
                    type="number"
                    value={productForm.currentStock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, currentStock: e.target.value })
                    }
                    className="bg-[#080A0A] border-white/20"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">
                  Minimum Stock Alert Level
                </label>
                <Input
                  type="number"
                  value={productForm.minStockLevel}
                  onChange={(e) =>
                    setProductForm({ ...productForm, minStockLevel: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>

            <Button
              disabled={submitting}
              onClick={handleSaveProduct}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting
                ? 'Saving...'
                : editingProduct
                ? 'Save Changes'
                : 'Create Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>
              Adjust Stock — {adjustProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#080A0A] border border-white/10 text-sm flex justify-between">
              <span className="text-[#929B95]">Current Stock:</span>
              <span className="font-bold text-[#B6F36B]">
                {adjustProduct?.currentStock} {adjustProduct?.unit}
              </span>
            </div>

            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Movement Type</label>
              <select
                value={adjustForm.movementType}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, movementType: e.target.value })
                }
                className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
              >
                <option value="PURCHASE">PURCHASE (+ Add Stock)</option>
                <option value="RETURN">RETURN (+ Customer / Restock Return)</option>
                <option value="WASTAGE">WASTAGE (- Damaged / Expired)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (+/- Audit Correction)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#929B95] mb-1 block">
                Quantity ({adjustProduct?.unit})
              </label>
              <Input
                type="number"
                value={adjustForm.quantity}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, quantity: e.target.value })
                }
                className="bg-[#080A0A] border-white/20"
              />
            </div>

            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Reason / Notes *</label>
              <Input
                value={adjustForm.reason}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, reason: e.target.value })
                }
                className="bg-[#080A0A] border-white/20"
                placeholder="e.g. Weekly stock replenishment"
              />
            </div>

            <Button
              disabled={submitting}
              onClick={handleConfirmAdjustment}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Updating...' : 'Record Stock Movement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>Create Product Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Category Name *</label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                className="bg-[#080A0A] border-white/20"
                placeholder="e.g. Energy Drinks"
              />
            </div>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Description</label>
              <Input
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                className="bg-[#080A0A] border-white/20"
                placeholder="Optional description"
              />
            </div>
            <Button
              disabled={submitting}
              onClick={handleCreateCategory}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Saving...' : 'Save Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
