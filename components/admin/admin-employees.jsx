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
  Users,
  UserPlus,
  CalendarCheck,
  Clock,
  Wallet,
  RefreshCw,
  CheckCircle2,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'

const STAFF_ROLES = [
  'MANAGER',
  'RECEPTIONIST',
  'CASHIER',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
  'SUPPORT_AGENT',
  'BUSINESS_OWNER',
]

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [shifts, setShifts] = useState([])
  const [salaryRecords, setSalaryRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('directory') // 'directory' | 'attendance' | 'shifts' | 'payroll'
  const [submitting, setSubmitting] = useState(false)

  // Add / Edit Employee Modal
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST',
    phone: '',
    address: '',
    salary: '20000',
  })

  // Shift Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '12:00',
    endTime: '20:00',
    notes: '',
  })

  // Payroll Modal
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    baseSalary: '',
    bonus: '0',
    deductions: '0',
    markPaid: true,
    notes: '',
  })

  const fetchHRData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/employees')
      if (!res.ok) throw new Error('Failed to load HR data')
      const data = await res.json()
      setEmployees(data.employees || [])
      setAttendance(data.attendance || [])
      setShifts(data.shifts || [])
      setSalaryRecords(data.salaryRecords || [])
    } catch (err) {
      console.error('Error loading HR:', err)
      toast.error('Failed to load employees & HR data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHRData()
  }, [fetchHRData])

  const openAddEmployee = () => {
    setEditingEmp(null)
    setEmpForm({
      name: '',
      email: '',
      password: '',
      role: 'RECEPTIONIST',
      phone: '',
      address: '',
      salary: '20000',
    })
    setIsEmpModalOpen(true)
  }

  const openEditEmployee = (emp) => {
    setEditingEmp(emp)
    setEmpForm({
      name: emp.user?.name || '',
      email: emp.user?.email || '',
      password: '',
      role: emp.user?.role || 'RECEPTIONIST',
      phone: emp.phone || '',
      address: emp.address || '',
      salary: String(emp.salary || 0),
    })
    setIsEmpModalOpen(true)
  }

  const handleSaveEmployee = async () => {
    if (!empForm.name.trim() || !empForm.phone.trim()) {
      toast.error('Employee name and phone number are required')
      return
    }
    try {
      setSubmitting(true)
      const url = editingEmp
        ? `/api/admin/employees/${editingEmp.id}`
        : '/api/admin/employees'
      const method = editingEmp ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...empForm,
          salary: Number(empForm.salary || 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save employee')

      toast.success(editingEmp ? 'Employee updated' : 'Staff member added')
      setIsEmpModalOpen(false)
      fetchHRData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkAttendance = async (employeeId, status) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_ATTENDANCE',
          employeeId,
          date: today,
          status,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to mark attendance')

      toast.success(`Attendance marked as ${status}`)
      fetchHRData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleCreateShift = async () => {
    if (!shiftForm.employeeId || !shiftForm.date) {
      toast.error('Select an employee and date')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_SHIFT',
          ...shiftForm,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to schedule shift')

      toast.success('Shift scheduled')
      setIsShiftModalOpen(false)
      fetchHRData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openPayrollModal = (emp = null) => {
    const target = emp || employees[0]
    setPayrollForm({
      employeeId: target?.id || '',
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      baseSalary: String(target?.salary || 20000),
      bonus: '0',
      deductions: '0',
      markPaid: true,
      notes: '',
    })
    setIsPayrollModalOpen(true)
  }

  const handleProcessSalary = async () => {
    if (!payrollForm.employeeId) {
      toast.error('Select an employee')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROCESS_SALARY',
          ...payrollForm,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process payroll')

      toast.success('Salary payroll processed & logged to Expenses')
      setIsPayrollModalOpen(false)
      fetchHRData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const monthlyPayrollLiability = employees
    .filter((e) => e.isActive)
    .reduce((sum, e) => sum + Number(e.salary || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk text-[#F4F1E8]">
            Employees, Attendance &amp; Payroll
          </h1>
          <p className="text-[#929B95] mt-1">
            Staff roles, daily attendance check-ins, shift rosters, and monthly salary disbursement
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchHRData}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShiftForm({
                ...shiftForm,
                employeeId: employees[0]?.id || '',
              })
              setIsShiftModalOpen(true)
            }}
            className="border-white/15 text-[#F4F1E8] hover:bg-white/10"
          >
            <Clock className="w-4 h-4 mr-2" />
            Assign Shift
          </Button>
          <Button
            variant="outline"
            onClick={() => openPayrollModal()}
            className="border-white/15 text-[#D6B36A] hover:bg-white/10"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Run Payroll
          </Button>
          <Button
            onClick={openAddEmployee}
            className="bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Active Staff Members
            </CardTitle>
            <Users className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {employees.filter((e) => e.isActive).length}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Role-based ERP access accounts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Monthly Payroll Base
            </CardTitle>
            <Wallet className="w-4 h-4 text-[#D6B36A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#D6B36A]">
              ₹{monthlyPayrollLiability.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Combined monthly base salaries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111615] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#929B95]">
              Scheduled Shifts
            </CardTitle>
            <Clock className="w-4 h-4 text-[#B6F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#F4F1E8]">
              {shifts.length}
            </div>
            <p className="text-xs text-[#929B95] mt-1">
              Upcoming &amp; recent shift slots
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'directory', label: `Staff Directory (${employees.length})`, icon: Users },
          { id: 'attendance', label: `Attendance Log (${attendance.length})`, icon: CalendarCheck },
          { id: 'shifts', label: `Shifts Roster (${shifts.length})`, icon: Clock },
          { id: 'payroll', label: `Salary Payroll (${salaryRecords.length})`, icon: Wallet },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? 'bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90'
                  : 'text-[#929B95] hover:text-[#F4F1E8]'
              }
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {activeTab === 'directory' && (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8 text-[#929B95]">Loading staff...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Employee</TableHead>
                    <TableHead className="text-[#929B95]">ERP Role</TableHead>
                    <TableHead className="text-[#929B95]">Phone &amp; Address</TableHead>
                    <TableHead className="text-[#929B95]">Monthly Salary</TableHead>
                    <TableHead className="text-[#929B95]">Quick Today Attendance</TableHead>
                    <TableHead className="text-[#929B95] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id} className="border-white/10">
                      <TableCell>
                        <div className="text-[#F4F1E8] font-semibold">
                          {emp.user?.name}
                        </div>
                        <div className="text-xs text-[#929B95]">{emp.user?.email}</div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#B6F36B]/15 text-[#B6F36B]">
                          {emp.user?.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-[#F4F1E8]">{emp.phone}</div>
                        <div className="text-xs text-[#929B95]">{emp.address}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-[#D6B36A]">
                        ₹{Number(emp.salary || 0).toLocaleString('en-IN')}/mo
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAttendance(emp.id, 'PRESENT')}
                            className="h-7 px-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAttendance(emp.id, 'LATE')}
                            className="h-7 px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                          >
                            Late
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAttendance(emp.id, 'ABSENT')}
                            className="h-7 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                          >
                            Absent
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPayrollModal(emp)}
                            className="border-white/15 text-[#F4F1E8] hover:bg-white/10 text-xs"
                          >
                            Pay Salary
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditEmployee(emp)}
                            className="text-[#929B95] hover:text-[#F4F1E8]"
                          >
                            <Edit className="w-4 h-4" />
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
      )}

      {activeTab === 'attendance' && (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            {attendance.length === 0 ? (
              <p className="text-center py-8 text-[#929B95]">
                No attendance logs recorded yet. Use the quick buttons in the Staff Directory to mark today&apos;s attendance.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Date</TableHead>
                    <TableHead className="text-[#929B95]">Employee</TableHead>
                    <TableHead className="text-[#929B95]">Role</TableHead>
                    <TableHead className="text-[#929B95]">Check-In</TableHead>
                    <TableHead className="text-[#929B95]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((rec) => (
                    <TableRow key={rec.id} className="border-white/10">
                      <TableCell className="text-[#F4F1E8]">
                        {new Date(rec.date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-[#F4F1E8] font-medium">
                        {rec.employee?.user?.name}
                      </TableCell>
                      <TableCell className="text-xs text-[#929B95]">
                        {rec.employee?.user?.role}
                      </TableCell>
                      <TableCell className="text-xs text-[#929B95]">
                        {rec.checkInTime
                          ? new Date(rec.checkInTime).toLocaleTimeString('en-IN')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rec.status === 'PRESENT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : rec.status === 'LATE'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'shifts' && (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            {shifts.length === 0 ? (
              <p className="text-center py-8 text-[#929B95]">
                No shifts scheduled yet. Click &quot;Assign Shift&quot; to create a shift roster.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Date</TableHead>
                    <TableHead className="text-[#929B95]">Employee</TableHead>
                    <TableHead className="text-[#929B95]">Shift Window</TableHead>
                    <TableHead className="text-[#929B95]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((s) => (
                    <TableRow key={s.id} className="border-white/10">
                      <TableCell className="text-[#F4F1E8]">
                        {new Date(s.date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-[#F4F1E8] font-medium">
                        {s.employee?.user?.name} ({s.employee?.user?.role})
                      </TableCell>
                      <TableCell className="text-[#B6F36B] font-medium text-sm">
                        {new Date(s.startTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        –{' '}
                        {new Date(s.endTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-[#929B95]">
                        {s.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payroll' && (
        <Card className="bg-[#111615] border-white/10">
          <CardContent className="p-6">
            {salaryRecords.length === 0 ? (
              <p className="text-center py-8 text-[#929B95]">
                No salary slips processed yet. Click &quot;Run Payroll&quot; to disburse salaries.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-[#929B95]">Month / Year</TableHead>
                    <TableHead className="text-[#929B95]">Employee</TableHead>
                    <TableHead className="text-[#929B95]">Base Salary</TableHead>
                    <TableHead className="text-[#929B95]">Bonus</TableHead>
                    <TableHead className="text-[#929B95]">Deductions</TableHead>
                    <TableHead className="text-[#929B95]">Net Paid</TableHead>
                    <TableHead className="text-[#929B95]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryRecords.map((sr) => (
                    <TableRow key={sr.id} className="border-white/10">
                      <TableCell className="text-[#F4F1E8] font-mono">
                        {String(sr.month).padStart(2, '0')}/{sr.year}
                      </TableCell>
                      <TableCell className="text-[#F4F1E8] font-medium">
                        {sr.employee?.user?.name}
                      </TableCell>
                      <TableCell className="text-[#929B95]">
                        ₹{sr.baseSalary.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-emerald-400">
                        +₹{sr.bonus.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-red-400">
                        -₹{sr.deductions.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="font-bold text-[#B6F36B]">
                        ₹{sr.netSalary.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sr.paidAt
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {sr.paidAt ? 'PAID' : 'PENDING'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Employee Dialog */}
      <Dialog open={isEmpModalOpen} onOpenChange={setIsEmpModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEmp ? 'Edit Staff Member' : 'Add Staff Member'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Full Name *</label>
              <Input
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            {!editingEmp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#929B95] mb-1 block">Login Email *</label>
                  <Input
                    type="email"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="bg-[#080A0A] border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#929B95] mb-1 block">Password</label>
                  <Input
                    type="password"
                    value={empForm.password}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, password: e.target.value })
                    }
                    placeholder="Default: Staff@2026!"
                    className="bg-[#080A0A] border-white/20"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">ERP Role *</label>
                <select
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Monthly Salary (₹)</label>
                <Input
                  type="number"
                  value={empForm.salary}
                  onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })}
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Phone Number *</label>
              <Input
                value={empForm.phone}
                onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Address</label>
              <Input
                value={empForm.address}
                onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <Button
              disabled={submitting}
              onClick={handleSaveEmployee}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Saving...' : 'Save Staff Profile'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog */}
      <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Staff Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Employee *</label>
              <select
                value={shiftForm.employeeId}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, employeeId: e.target.value })
                }
                className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.user?.name} ({e.user?.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Shift Date *</label>
              <Input
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, startTime: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, endTime: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Notes</label>
              <Input
                value={shiftForm.notes}
                onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                placeholder="e.g. Evening peak shift"
                className="bg-[#080A0A] border-white/20"
              />
            </div>
            <Button
              disabled={submitting}
              onClick={handleCreateShift}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              {submitting ? 'Scheduling...' : 'Save Shift'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Run Payroll Dialog */}
      <Dialog open={isPayrollModalOpen} onOpenChange={setIsPayrollModalOpen}>
        <DialogContent className="bg-[#111615] border-white/20 text-[#F4F1E8] max-w-md">
          <DialogHeader>
            <DialogTitle>Process Monthly Salary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#929B95] mb-1 block">Employee *</label>
              <select
                value={payrollForm.employeeId}
                onChange={(e) => {
                  const emp = employees.find((x) => x.id === e.target.value)
                  setPayrollForm({
                    ...payrollForm,
                    employeeId: e.target.value,
                    baseSalary: emp ? String(emp.salary || 0) : payrollForm.baseSalary,
                  })
                }}
                className="w-full h-10 rounded-md bg-[#080A0A] border border-white/20 px-3 text-sm text-[#F4F1E8]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.user?.name} (₹{e.salary}/mo)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Month (1–12)</label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={payrollForm.month}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, month: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Year</label>
                <Input
                  type="number"
                  value={payrollForm.year}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, year: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Base (₹)</label>
                <Input
                  type="number"
                  value={payrollForm.baseSalary}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, baseSalary: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Bonus (+₹)</label>
                <Input
                  type="number"
                  value={payrollForm.bonus}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, bonus: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-[#929B95] mb-1 block">Deduct (-₹)</label>
                <Input
                  type="number"
                  value={payrollForm.deductions}
                  onChange={(e) =>
                    setPayrollForm({ ...payrollForm, deductions: e.target.value })
                  }
                  className="bg-[#080A0A] border-white/20"
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#080A0A] border border-white/10 flex justify-between items-center">
              <span className="text-xs text-[#929B95]">Net Disbursable Salary</span>
              <span className="text-lg font-bold text-[#B6F36B]">
                ₹
                {Math.max(
                  0,
                  Number(payrollForm.baseSalary || 0) +
                    Number(payrollForm.bonus || 0) -
                    Number(payrollForm.deductions || 0)
                ).toLocaleString('en-IN')}
              </span>
            </div>
            <Button
              disabled={submitting}
              onClick={handleProcessSalary}
              className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90 font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {submitting ? 'Processing...' : 'Disburse Salary & Log Expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

