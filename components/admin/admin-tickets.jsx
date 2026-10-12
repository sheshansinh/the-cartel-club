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
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Send,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Reply / Update state inside modal
  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/tickets')
      if (!res.ok) throw new Error('Failed to load support tickets')
      const data = await res.json()
      setTickets(data.tickets || [])
      setStaff(data.staff || [])
    } catch (err) {
      console.error('Error loading tickets:', err)
      toast.error('Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const filteredTickets = tickets.filter(
    (t) => statusFilter === 'ALL' || t.status === statusFilter
  )

  const handleSendReplyOrUpdate = async (overrides = {}) => {
    if (!selectedTicket) return
    try {
      setSubmitting(true)
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyMessage: replyText.trim() || undefined,
          isInternal: isInternalNote,
          ...overrides,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket')

      toast.success('Ticket updated')
      setReplyText('')
      setSelectedTicket(data.ticket)
      fetchTickets()
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
            Support Tickets &amp; Helpdesk
          </h1>
          <p className="text-[#929B95] mt-1">
            Manage customer inquiries, booking disputes, and refund requests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md bg-[#111615] border border-white/20 px-3 text-sm text-[#F4F1E8]"
          >
            <option value="ALL">All Statuses ({tickets.length})</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <Button
            variant="outline"
            onClick={fetchTickets}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tickets Table */}
      <Card className="bg-[#111615] border-white/10">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-[#929B95]">
              Loading support tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-[#929B95]">
              No support tickets in this queue. Customers can submit tickets from their Customer Portal (`/tickets`).
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-[#929B95]">Ticket #</TableHead>
                  <TableHead className="text-[#929B95]">Customer</TableHead>
                  <TableHead className="text-[#929B95]">Subject &amp; Category</TableHead>
                  <TableHead className="text-[#929B95]">Priority</TableHead>
                  <TableHead className="text-[#929B95]">Assigned To</TableHead>
                  <TableHead className="text-[#929B95]">Status</TableHead>
                  <TableHead className="text-[#929B95] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-white/10">
                    <TableCell className="font-mono text-xs text-[#F4F1E8]">
                      {ticket.ticketNumber}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[#F4F1E8] font-medium">
                        {ticket.customer?.user?.name || 'Customer'}
                      </div>
                      <div className="text-xs text-[#929B95]">
                        {ticket.customer?.user?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-[#F4F1E8] font-medium">
                        {ticket.subject}
                      </div>
                      <div className="text-xs text-[#929B95]">
                        {ticket.category} • {ticket.messages?.length || 0} messages
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          ticket.priority === 'URGENT' || ticket.priority === 'HIGH'
                            ? 'bg-red-500/20 text-red-400'
                            : ticket.priority === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/10 text-[#929B95]'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[#929B95]">
                      {ticket.assignedToUser?.user?.name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : ticket.status === 'OPEN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                        className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Open Thread
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ticket Thread & Resolution Modal */}
      <Dialog
        open={Boolean(selectedTicket)}
        onOpenChange={() => setSelectedTicket(null)}
      >
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedTicket?.ticketNumber} — {selectedTicket?.subject}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {/* Assignment & Status Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#080A0A] border border-white/10">
                <div>
                  <label className="text-[11px] text-[#929B95] block mb-1">
                    Status
                  </label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) =>
                      handleSendReplyOrUpdate({ status: e.target.value })
                    }
                    className="w-full h-8 rounded bg-[#111615] border border-white/15 px-2 text-xs text-[#F4F1E8]"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#929B95] block mb-1">
                    Priority
                  </label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) =>
                      handleSendReplyOrUpdate({ priority: e.target.value })
                    }
                    className="w-full h-8 rounded bg-[#111615] border border-white/15 px-2 text-xs text-[#F4F1E8]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#929B95] block mb-1">
                    Assign Staff
                  </label>
                  <select
                    value={selectedTicket.assignedTo || ''}
                    onChange={(e) =>
                      handleSendReplyOrUpdate({ assignedTo: e.target.value || null })
                    }
                    className="w-full h-8 rounded bg-[#111615] border border-white/15 px-2 text-xs text-[#F4F1E8]"
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.user?.name} ({s.user?.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversation Thread */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto p-3 rounded-lg bg-[#080A0A] border border-white/10">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs text-[#929B95] mb-1">
                    <span className="font-semibold text-[#F4F1E8]">
                      {selectedTicket.customer?.user?.name || 'Customer'}
                    </span>
                    <span>
                      {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-sm text-[#F4F1E8]">
                    {selectedTicket.description}
                  </p>
                </div>

                {(selectedTicket.messages || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg border ${
                      msg.isInternal
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-[#B6F36B]/10 border-[#B6F36B]/25'
                    }`}
                  >
                    <div className="flex justify-between text-xs text-[#929B95] mb-1">
                      <span className="font-semibold text-[#F4F1E8] flex items-center gap-1">
                        {msg.isInternal && <Lock className="w-3 h-3 text-amber-400" />}
                        {msg.senderName || 'Support'}
                        {msg.isInternal && (
                          <span className="text-amber-400 text-[10px] ml-1">
                            (Internal Staff Note)
                          </span>
                        )}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-sm text-[#F4F1E8]">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#929B95]">
                    Write a reply or internal note
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                    />
                    Internal Staff Note (hidden from customer)
                  </label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Add internal note for staff...'
                        : 'Type reply to customer...'
                    }
                    className="bg-[#080A0A] border-white/20"
                  />
                  <Button
                    disabled={submitting || !replyText.trim()}
                    onClick={() => handleSendReplyOrUpdate()}
                    className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

