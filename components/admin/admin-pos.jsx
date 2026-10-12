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
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  RefreshCw,
  Search,
  Ban,
  CheckCircle2,
  IndianRupee,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPOS() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [todayStats, setTodayStats] = useState({ salesCount: 0, revenue: 0 })
  const [businessMeta, setBusinessMeta] = useState({
    businessName: 'The Cartel Club',
    businessPhone: '+91 98765 43210',
    businessAddress: 'Ahmedabad',
    taxRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('terminal') // 'terminal' | 'history'

  // Terminal filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  // Cart state
  const [cart, setCart] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  // Receipt Modal
  const [receiptSale, setReceiptSale] = useState(null)

  // Void Modal
  const [voidTarget, setVoidTarget] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const fetchPOSData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pos')
      if (!res.ok) throw new Error('Failed to load POS data')
      const data = await res.json()
      setProducts(data.products || [])
      setCategories(data.categories || [])
      setSales(data.sales || [])
      setCustomers(data.customers || [])
      if (data.todayStats) setTodayStats(data.todayStats)
      setBusinessMeta({
        businessName: data.businessName || 'The Cartel Club',
        businessPhone: data.businessPhone || '+91 98765 43210',
        businessAddress: data.businessAddress || 'Ahmedabad',
        taxRate: Number(data.taxRate || 0),
      })
    } catch (err) {
      console.error('POS load error:', err)
      toast.error('Failed to load POS terminal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPOSData()
  }, [fetchPOSData])

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat =
      selectedCategory === 'ALL' || p.categoryId === selectedCategory
    return matchesSearch && matchesCat
  })

  const addToCart = (product) => {
    if (product.currentStock <= 0) {
      toast.error(`"${product.name}" is out of stock`)
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.quantity + 1 > product.currentStock) {
          toast.error(
            `Only ${product.currentStock} ${product.unit} available for "${product.name}"`
          )
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: Number(product.sellingPrice),
          maxStock: Number(product.currentStock),
          unit: product.unit,
          quantity: 1,
        },
      ]
    })
  }

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item
          const nextQty = item.quantity + delta
          if (nextQty > item.maxStock) {
            toast.error(`Maximum available stock is ${item.maxStock} ${item.unit}`)
            return item
          }
          return { ...item, quantity: nextQty }
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCart = () => {
    setCart([])
    setDiscountAmount('')
    setNotes('')
    setSelectedCustomerId('')
  }

  const subtotal = Number(
    cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
  )
  const cleanDiscount = Math.min(subtotal, Math.max(0, Number(discountAmount || 0)))
  const taxableAmount = Math.max(0, Number((subtotal - cleanDiscount).toFixed(2)))
  const taxAmount = Number(
    ((taxableAmount * Number(businessMeta.taxRate || 0)) / 100).toFixed(2)
  )
  const grandTotal = Number((taxableAmount + taxAmount).toFixed(2))

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one item to the cart')
      return
    }

    try {
      setCheckingOut(true)
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          customerId: selectedCustomerId || null,
          discountAmount: cleanDiscount,
          taxRate: businessMeta.taxRate,
          paymentMethod,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      toast.success(`Sale ${data.sale.saleRef} completed (₹${data.sale.totalAmount})`)
      clearCart()
      setReceiptSale(data.sale)
      fetchPOSData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCheckingOut(false)
    }
  }

  const handleConfirmVoid = async () => {
    if (!voidTarget) return
    if (!voidReason.trim()) {
      toast.error('Please enter a reason for voiding this sale')
      return
    }
    try {
      setVoiding(true)
      const res = await fetch(`/api/pos/${voidTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VOID',
          voidReason: voidReason.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to void sale')

      toast.success(`Sale ${voidTarget.saleRef} voided and stock restored`)
      setVoidTarget(null)
      setVoidReason('')
      fetchPOSData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setVoiding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Point of Sale (POS)
          </h1>
          <p className="text-[#929B95] mt-1">
            Fast counter billing for beverages, snacks, and billiard accessories
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-[#111615] border border-white/10 text-sm flex items-center gap-4">
            <div>
              <span className="text-[#929B95] text-xs block">Today&apos;s Orders</span>
              <span className="font-bold text-[#F4F1E8]">{todayStats.salesCount}</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[#929B95] text-xs block">Today&apos;s POS Revenue</span>
              <span className="font-bold text-[#B6F36B]">
                ₹{Number(todayStats.revenue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#111615] p-1 rounded-lg border border-white/10">
            <Button
              size="sm"
              variant={activeView === 'terminal' ? 'default' : 'ghost'}
              onClick={() => setActiveView('terminal')}
              className={
                activeView === 'terminal'
                  ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
                  : 'text-[#929B95] hover:text-[#F4F1E8]'
              }
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              POS Terminal
            </Button>
            <Button
              size="sm"
              variant={activeView === 'history' ? 'default' : 'ghost'}
              onClick={() => setActiveView('history')}
              className={
                activeView === 'history'
                  ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
                  : 'text-[#929B95] hover:text-[#F4F1E8]'
              }
            >
              <Receipt className="w-4 h-4 mr-1.5" />
              Sales History ({sales.length})
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchPOSData}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {activeView === 'terminal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 cols: Product Grid */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search & Category Pills */}
            <Card className="bg-[#111615] border-white/10">
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#929B95] absolute left-3 top-3" />
                  <Input
                    placeholder="Search item by name, SKU, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-[#080A0A] border-white/20 text-[#F4F1E8]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
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
                    All Items
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

            {/* Product Tiles */}
            {loading ? (
              <div className="text-center py-12 text-[#929B95]">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-[#929B95]">
                No products found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const outOfStock = product.currentStock <= 0
                  const inCart = cart.find((c) => c.productId === product.id)
                  return (
                    <button
                      key={product.id}
                      disabled={outOfStock}
                      onClick={() => addToCart(product)}
                      className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between min-h-[132px] ${
                        outOfStock
                          ? 'bg-[#111615]/50 border-white/5 opacity-50 cursor-not-allowed'
                          : inCart
                          ? 'bg-[#111615] border-[#B6F36B] shadow-md shadow-[#B6F36B]/5'
                          : 'bg-[#111615] border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#929B95]">
                            {product.category?.name || 'Item'}
                          </span>
                          {inCart && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#B6F36B] text-[#080A0A]">
                              ×{inCart.quantity}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-[#F4F1E8] mt-2 line-clamp-2 text-sm">
                          {product.name}
                        </h3>
                      </div>

                      <div className="flex items-end justify-between mt-3 pt-2 border-t border-white/5">
                        <div>
                          <div className="text-lg font-bold text-[#B6F36B]">
                            ₹{product.sellingPrice}
                          </div>
                          <div
                            className={`text-[11px] ${
                              outOfStock
                                ? 'text-red-400 font-semibold'
                                : product.isLowStock
                                ? 'text-amber-400'
                                : 'text-[#929B95]'
                            }`}
                          >
                            {outOfStock
                              ? 'Out of Stock'
                              : `${product.currentStock} ${product.unit} left`}
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[#F4F1E8]">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right 4 cols: Active Cart & Checkout */}
          <div className="lg:col-span-4">
            <Card className="bg-[#111615] border-white/10 sticky top-6">
              <CardHeader className="pb-3 border-b border-white/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[#F4F1E8] flex items-center gap-2 text-lg">
                  <ShoppingCart className="w-5 h-5 text-[#B6F36B]" />
                  Current Bill ({cart.reduce((s, i) => s + i.quantity, 0)})
                </CardTitle>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-xs text-red-400 hover:text-red-300 h-7 px-2"
                  >
                    Clear
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Cart Items */}
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-[#929B95] text-sm">
                    Tap any product tile on the left to add items to the bill.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#080A0A] border border-white/10"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-sm font-medium text-[#F4F1E8] truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-[#929B95]">
                            ₹{item.unitPrice} × {item.quantity} ={' '}
                            <span className="text-[#B6F36B] font-semibold">
                              ₹{(item.unitPrice * item.quantity).toFixed(0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQty(item.productId, -1)}
                            className="h-7 w-7 p-0 border-white/20 text-[#F4F1E8]"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-7 text-center text-sm font-semibold text-[#F4F1E8]">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQty(item.productId, 1)}
                            className="h-7 w-7 p-0 border-white/20 text-[#F4F1E8]"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Customer Link (Optional) */}
                <div>
                  <label className="text-xs text-[#929B95] mb-1 block">
                    Link Customer (Optional)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full h-9 rounded-md bg-[#080A0A] border border-white/20 px-3 text-xs text-[#F4F1E8]"
                  >
                    <option value="">Walk-in Counter Guest</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Discount & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#929B95] mb-1 block">
                      Discount (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="0"
                      className="h-9 bg-[#080A0A] border-white/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#929B95] mb-1 block">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-9 rounded-md bg-[#080A0A] border border-white/20 px-2.5 text-xs text-[#F4F1E8]"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="CARD">CARD</option>
                      <option value="RAZORPAY">RAZORPAY</option>
                    </select>
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="p-3 rounded-lg bg-[#080A0A] border border-white/10 space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#929B95]">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {cleanDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span>-₹{cleanDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-[#929B95]">
                      <span>Tax ({businessMeta.taxRate}%)</span>
                      <span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[#F4F1E8] pt-2 border-t border-white/10">
                    <span>Grand Total</span>
                    <span className="text-[#B6F36B]">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  disabled={cart.length === 0 || checkingOut}
                  onClick={handleCheckout}
                  className="w-full h-11 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-bold text-base"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {checkingOut
                    ? 'Processing Sale...'
                    : `Complete Sale • ₹${grandTotal.toFixed(0)}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* POS Sales History View */
        <Card className="bg-[#111615] border-white/10">
          <CardHeader>
            <CardTitle className="text-[#F4F1E8]">
              Recent POS Sales & Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="text-center py-8 text-[#929B95]">
                No POS sales recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Receipt #</TableHead>
                    <TableHead className="text-[#929B95]">Date & Time</TableHead>
                    <TableHead className="text-[#929B95]">Customer</TableHead>
                    <TableHead className="text-[#929B95]">Items</TableHead>
                    <TableHead className="text-[#929B95]">Payment</TableHead>
                    <TableHead className="text-[#929B95]">Total</TableHead>
                    <TableHead className="text-[#929B95]">Status</TableHead>
                    <TableHead className="text-[#929B95] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const isVoided = Boolean(sale.voidedAt)
                    return (
                      <TableRow key={sale.id} className="border-white/10">
                        <TableCell className="font-mono text-xs text-[#F4F1E8]">
                          {sale.saleRef}
                        </TableCell>
                        <TableCell className="text-xs text-[#929B95]">
                          {new Date(sale.saleDate).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-sm text-[#F4F1E8]">
                          {sale.customer?.user?.name || 'Walk-in Guest'}
                        </TableCell>
                        <TableCell className="text-xs text-[#929B95]">
                          {sale.items
                            ?.map((i) => `${i.product?.name || 'Item'} ×${i.quantity}`)
                            .join(', ')}
                        </TableCell>
                        <TableCell className="text-xs text-[#F4F1E8]">
                          {sale.paymentMethod}
                        </TableCell>
                        <TableCell className="font-bold text-[#B6F36B]">
                          ₹{sale.totalAmount}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isVoided
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isVoided ? 'VOIDED' : sale.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReceiptSale(sale)}
                              className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1" />
                              Receipt
                            </Button>
                            {!isVoided && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setVoidTarget(sale)
                                  setVoidReason('')
                                }}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Void
                              </Button>
                            )}
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
      )}

      {/* Printable Receipt Modal */}
      <Dialog open={Boolean(receiptSale)} onOpenChange={() => setReceiptSale(null)}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>POS Receipt — {receiptSale?.saleRef}</span>
            </DialogTitle>
          </DialogHeader>
          {receiptSale && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#080A0A] border border-white/10 font-mono text-xs space-y-3">
                <div className="text-center border-b border-dashed border-white/20 pb-3">
                  <div className="text-base font-bold text-[#F4F1E8]">
                    {businessMeta.businessName}
                  </div>
                  <div className="text-[#929B95]">{businessMeta.businessAddress}</div>
                  <div className="text-[#929B95]">Tel: {businessMeta.businessPhone}</div>
                </div>

                <div className="space-y-1 border-b border-dashed border-white/20 pb-3">
                  <div className="flex justify-between">
                    <span className="text-[#929B95]">Receipt:</span>
                    <span>{receiptSale.saleRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#929B95]">Date:</span>
                    <span>{new Date(receiptSale.saleDate).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#929B95]">Customer:</span>
                    <span>{receiptSale.customer?.user?.name || 'Walk-in'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#929B95]">Payment:</span>
                    <span>{receiptSale.paymentMethod}</span>
                  </div>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-white/20 pb-3">
                  {receiptSale.items?.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.product?.name || 'Item'} ×{item.quantity}
                      </span>
                      <span>₹{Number(item.totalPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[#929B95]">
                    <span>Subtotal</span>
                    <span>₹{Number(receiptSale.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(receiptSale.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span>-₹{Number(receiptSale.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(receiptSale.taxAmount) > 0 && (
                    <div className="flex justify-between text-[#929B95]">
                      <span>Tax</span>
                      <span>₹{Number(receiptSale.taxAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#B6F36B] pt-1">
                    <span>TOTAL PAID</span>
                    <span>₹{Number(receiptSale.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => window.print()}
                  className="flex-1 bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setReceiptSale(null)}
                  className="border-white/20 text-[#F4F1E8]"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Sale Modal */}
      <Dialog open={Boolean(voidTarget)} onOpenChange={() => setVoidTarget(null)}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Void POS Sale — {voidTarget?.saleRef}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#929B95]">
              Voiding this sale will mark it as refunded and automatically restore all sold items back into inventory stock.
            </p>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">
                Void Reason *
              </label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Wrong item punched / customer cancelled"
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <div className="flex gap-2">
              <Button
                disabled={voiding}
                onClick={handleConfirmVoid}
                className="flex-1 bg-red-500 text-white hover:bg-red-600 font-semibold"
              >
                {voiding ? 'Voiding...' : 'Confirm Void & Restore Stock'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setVoidTarget(null)}
                className="border-white/20 text-[#F4F1E8]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

