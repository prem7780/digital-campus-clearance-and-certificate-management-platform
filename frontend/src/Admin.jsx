import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { api, downloadPdf } from './api'
import { AppCard, CHECKS, Empty, ErrorPanel, Field, Status } from './components'
import {
  ArrowLeft, ArrowRight, BarChart3, Building2, Check, CheckCircle2,
  ClipboardCheck, Download, FileCheck2, FileDown, History, LayoutDashboard,
  LoaderCircle, LockKeyhole, Mail, Menu, Pencil, RefreshCw, Search,
  ShieldCheck, UserPlus, Users, X,
} from 'lucide-react'

/**
 * DCCMP Admin — frontend-only replacement.
 * Uses the existing /admin and /public endpoints and request structures.
 * Works with Quiet Campus index.css / components.jsx; backend stays untouched.
 */
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'applications', label: 'Applications', icon: ClipboardCheck },
  { id: 'staff', label: 'Employee Accounts', icon: Users },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'details', label: 'Application Details', icon: FileCheck2 },
]
const FRESH_ACCOUNT = { code: '', name: '', password: '', role: 'ADMIN', departmentId: null, active: true }
const csvType = 'text/csv;charset=utf-8'
const exportTypes = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: csvType,
}
const number = (v) => Number(v ?? 0).toLocaleString('en-IN')
const rows = (v) => Array.isArray(v) ? v : []
const dateText = (value) => {
  if (!value) return '—'
  const input = String(value)
  const instant = new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(input) ? input : `${input}+05:30`)
  return Number.isNaN(instant.getTime()) ? '—' : `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(instant)} IST`
}
const cleanStatus = (status) => String(status || 'PENDING').replaceAll('_', ' ')

function SectionTitle({ eyebrow, title, description, action }) {
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0 max-w-3xl">
      {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.11em] text-slate-400">{eyebrow}</p>}
      <h2 className="text-[19px] font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1.5 text-[13px] leading-6 text-slate-500">{description}</p>}
    </div>
    {action}
  </div>
}
function Panel({ title, description, children, action, className = '' }) {
  return <section className={`card min-w-0 p-5 sm:p-6 ${className}`}>
    {(title || action) && <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {title && <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">{title}</h3>}
        {description && <p className="tiny mt-1">{description}</p>}
      </div>{action}
    </div>}
    {children}
  </section>
}
function Loading({ label = 'Loading administration records…' }) {
  return <div className="card flex min-h-52 items-center justify-center gap-3 p-8 text-sm text-slate-500" role="status">
    <LoaderCircle size={19} className="animate-spin" />{label}
  </div>
}
function Metric({ label, value, icon: Icon, hint }) {
  return <div className="card min-w-0 p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-medium leading-5 text-slate-500">{label}</p>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><Icon size={17} strokeWidth={1.8} /></span>
    </div>
    <p className="metric mt-3">{number(value)}</p>
    {hint && <p className="tiny mt-1.5">{hint}</p>}
  </div>
}
function KeyValue({ label, value }) {
  return <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-[13px] font-medium text-slate-800">{value || '—'}</dd>
  </div>
}
function Dialog({ title, description, children, onClose, onConfirm, confirmLabel, busy, error, danger = false, disableConfirm = false }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
    <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} disabled={busy} />
    <section role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}</div>
        <button type="button" className="btn btn-muted !min-h-9 !px-2.5" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={16} /></button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!busy && !disableConfirm) onConfirm() }}>
        {error && <div className="mt-4"><ErrorPanel error={error} /></div>}
        <div className="mt-5 space-y-4">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className="btn btn-muted" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" disabled={busy || disableConfirm} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}>
            {busy && <LoaderCircle size={15} className="animate-spin" />}{confirmLabel || 'Confirm'}
          </button>
        </div>
      </form>
    </section>
  </div>
}

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [apps, setApps] = useState([])
  const [people, setPeople] = useState([])
  const [departments, setDepartments] = useState([])
  const [dashboard, setDashboard] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [newAccount, setNewAccount] = useState(FRESH_ACCOUNT)
  const [selectedId, setSelectedId] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [checks, setChecks] = useState({})
  const [alternatives, setAlternatives] = useState({})
  const [verifyId, setVerifyId] = useState('')
  const [dialog, setDialog] = useState(null)
  const [dialogValue, setDialogValue] = useState('')

  const selected = useMemo(() => apps.find((item) => item.id === selectedId) || null, [apps, selectedId])
  const departmentById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const filteredApps = useMemo(() => apps.filter((item) => {
    const query = filter.trim().toLowerCase()
    const textMatch = !query || [item.studentName, item.rollNumber, item.branch, String(item.id)]
      .some((value) => String(value || '').toLowerCase().includes(query))
    return textMatch && (!statusFilter || item.status === statusFilter)
  }), [apps, filter, statusFilter])

  const refresh = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true)
    try {
      const [applications, accounts, departmentList, metrics] = await Promise.all([
        api('/admin/applications'), api('/admin/staff'), api('/public/departments'), api('/admin/dashboard'),
      ])
      setApps(rows(applications)); setPeople(rows(accounts)); setDepartments(rows(departmentList)); setDashboard(metrics || {})
      setError('')
    } catch (e) { setError(e.message || 'Unable to load administration records.') }
    finally { setRefreshing(false); setLoading(false) }
  }, [])
  useEffect(() => { refresh(false) }, [refresh])

  const reloadHistory = useCallback(async (id) => {
    setHistoryLoading(true)
    try { setHistory(rows(await api(`/admin/audit/${id}`))) }
    catch (e) { setHistory([]); setError(e.message || 'Unable to load audit events.') }
    finally { setHistoryLoading(false) }
  }, [])
  const go = (page) => { setTab(page); setMenuOpen(false); setError(''); setNotice('') }
  const inspect = (item) => {
    setSelectedId(item.id); setChecks({}); setAlternatives({}); setVerifyId(''); setReason('')
    go('details'); reloadHistory(item.id)
  }
  const act = async (operation, message, { audit = false } = {}) => {
    if (busy) return false
    setBusy(true); setError(''); setNotice('')
    try {
      await operation()
      await refresh()
      if (audit && selectedId != null) await reloadHistory(selectedId)
      setNotice(message || 'Changes saved successfully.')
      return true
    } catch (e) { setError(e.message || 'Action could not be completed.'); return false }
    finally { setBusy(false) }
  }
  const openDialog = (type, target, value = '') => { setDialog({ type, target }); setDialogValue(value); setError('') }
  const closeDialog = () => { if (!busy) { setDialog(null); setDialogValue('') } }
  const saveDialog = async () => {
    if (!dialog) return
    const { type, target } = dialog
    const value = dialogValue.trim()
    let ok = false
    if (type === 'login') ok = await act(() => api(`/admin/staff/${target.id}`, { method: 'PATCH', body: { code: value.toUpperCase() } }), 'Department login renamed. Previous sessions have been invalidated.')
    if (type === 'password') ok = await act(() => api(`/admin/staff/${target.id}`, { method: 'PATCH', body: { password: dialogValue } }), 'Password reset. Previous sessions have been invalidated.')
    if (type === 'accountActive') ok = await act(() => api(`/admin/staff/${target.id}`, { method: 'PATCH', body: { active: !target.active } }), 'Account availability updated.')
    if (type === 'department') ok = await act(() => api(`/admin/departments/${target.id}`, { method: 'PATCH', body: { name: value } }), 'Department display name updated.')
    if (ok) { setDialog(null); setDialogValue('') }
  }
  const downloadReport = async (format) => {
    await act(async () => {
      const data = await api(`/admin/reports?format=${format}`)
      const blob = data instanceof Blob ? data : new Blob([data], { type: exportTypes[format] })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `DCCMP-Department-Analytics.${format}`
      document.body.appendChild(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, `${format.toUpperCase()} report downloaded.`)
  }
  const submitReopening = async (approvalId, principalTarget) => {
    if (!selected || !reason.trim()) return
    await act(() => api('/admin/reopenings', {
      method: 'POST', body: { applicationId: selected.id, approvalId, principalTarget, reason: reason.trim() },
    }), 'Reopening authorized; the responsible department or Principal can decide again.', { audit: true })
  }
  const issueDocument = (path, message) => act(() => api(path, { method: 'POST' }), message, { audit: true })
  const checksComplete = CHECKS.every(([key]) => checks[key])
  const verificationMatches = Boolean(selected?.verificationId && verifyId.trim() === selected.verificationId)

  const overviewStats = [
    ['Applications', dashboard.total, ClipboardCheck],
    ['Pending departments', dashboard.pendingDepartments, History],
    ['Principal queue', dashboard.pendingPrincipal, ShieldCheck],
    ['Approved', dashboard.approved, CheckCircle2],
    ['Action required', dashboard.actionRequired, FileCheck2],
    ['Certificates handed over', dashboard.handedOver, Check],
    ['Departments', dashboard.departments ?? departments.length, Building2],
    ['Accounts', people.length, Users],
  ]
  const currentNav = NAV.find((n) => n.id === tab)

  return <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-9 lg:py-9">
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-slate-400">Employee Portal / Administration</p>
        <h1 className="section-title">Administration centre</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500">Manage college clearance applications, department accounts, document issuance and certificate collection.</p>
      </div>
      <button type="button" className="btn btn-muted" onClick={() => refresh()} disabled={refreshing || busy}>
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh data
      </button>
    </div>

    {error && <ErrorPanel error={error} />}
    {notice && <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-800">
      <span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span>
      <button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button>
    </div>}

    <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
      <button type="button" className="btn btn-muted" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="admin-menu">
        <Menu size={17} /> {currentNav?.label || 'Menu'}
      </button>
      <span className="tiny">Admin workspace</span>
    </div>

    <div className="grid min-w-0 gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
      <aside id="admin-menu" className={`${menuOpen ? 'block' : 'hidden'} self-start rounded-md border border-slate-200 bg-white p-3 lg:sticky lg:top-6 lg:block`} aria-label="Administration sections">
        <div className="border-b border-slate-100 px-3 pb-4 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-slate-400">Workspace</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">Administration</p>
        </div>
        <nav className="mt-3 space-y-1" aria-label="Admin pages">
          {NAV.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => go(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold transition-colors ${tab === id ? 'border border-slate-200 bg-slate-100 text-slate-900' : 'border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Icon size={17} strokeWidth={1.8} /><span className="flex-1">{label}</span>{tab === id && <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />}
          </button>)}
        </nav>
        <p className="mt-5 border-t border-slate-100 px-3 pt-4 text-[11px] leading-5 text-slate-400">Shared department accounts are permanent. Decisions remain attributed to department accounts.</p>
      </aside>

      <div className="min-w-0 space-y-6">
        {loading ? <Loading /> : <>
          {tab === 'overview' && <>
            <SectionTitle eyebrow="At a glance" title="College clearance overview" description="Current application statuses and certificate collection across the college." />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{overviewStats.map(([label, value, Icon]) => <Metric key={label} label={label} value={value} icon={Icon} />)}</div>
            <Panel title="Aggregate analytics reports" description="Only Admin and Principal may download these college-wide reports. Student records are excluded."
              action={<span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">Admin only</span>}>
              <div className="grid gap-3 sm:grid-cols-3">{[['pdf', 'PDF report'], ['xlsx', 'Excel workbook'], ['csv', 'CSV data']].map(([format, title]) =>
                <button key={format} type="button" className="flex min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50 disabled:opacity-50" disabled={busy} onClick={() => downloadReport(format)}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600"><FileDown size={19} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-slate-800">{title}</span><span className="tiny">Download .{format}</span></span>
                  <Download size={16} className="shrink-0 text-slate-400" />
                </button>)}
              </div>
            </Panel>
            <Panel title="Recent applications" description="Latest student submissions and their current clearance status."
              action={<button type="button" className="btn btn-muted !py-2" onClick={() => go('applications')}>View all <ArrowRight size={15} /></button>}>
              {apps.length ? <div className="divide-y divide-slate-100">{apps.slice(0, 8).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0"><p className="text-[13px] font-semibold text-slate-900">{item.studentName || 'Student'}</p><p className="tiny mt-1">{item.rollNumber} · Application #{item.id}</p></div>
                <div className="flex items-center gap-3"><Status value={item.status} /><button type="button" className="btn btn-muted !min-h-9 !py-1.5" onClick={() => inspect(item)}>Review</button></div>
              </div>)}</div> : <Empty message="No applications have been submitted yet." />}
            </Panel>
          </>}

          {tab === 'applications' && <>
            <SectionTitle eyebrow="Applications" title="All student requests" description="Search and review No Dues applications. Open a record to inspect departmental decisions and certificate handover." />
            <Panel>
              <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                <label className="relative block"><span className="sr-only">Search applications</span><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                  <input className="field !pl-10" placeholder="Search name, roll number, branch or ID" value={filter} onChange={(e) => setFilter(e.target.value)} /></label>
                <label className="block"><span className="sr-only">Filter by status</span><select className="field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {['PENDING_DEPARTMENTS', 'ACTION_REQUIRED', 'PENDING_PRINCIPAL', 'PRINCIPAL_ACTION_REQUIRED', 'APPROVED'].map((status) => <option key={status} value={status}>{cleanStatus(status)}</option>)}
                </select></label>
              </div>
              <div className="mb-3 text-xs text-slate-500">{number(filteredApps.length)} of {number(apps.length)} applications</div>
              {filteredApps.length ? <div className="table-wrap"><table><thead><tr><th>Application</th><th>Student</th><th>Roll number</th><th>Clearance</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{filteredApps.map((item) => <tr key={item.id}><td className="font-semibold">#{item.id}</td><td className="font-semibold text-slate-900">{item.studentName}</td><td>{item.rollNumber}</td><td>{rows(item.approvals).filter((x) => x.status === 'APPROVED').length}/17</td><td><Status value={item.status} /></td><td><button type="button" className="btn btn-muted !min-h-9 !py-1.5" onClick={() => inspect(item)}>Open <ArrowRight size={14} /></button></td></tr>)}</tbody>
              </table></div> : <div><Empty message={apps.length ? 'No applications match your filters.' : 'No applications available.'} />{(filter || statusFilter) && <div className="text-center"><button className="btn btn-muted" onClick={() => { setFilter(''); setStatusFilter('') }}>Clear filters</button></div>}</div>}
            </Panel>
          </>}

          {tab === 'staff' && <>
            <SectionTitle eyebrow="Access management" title="Employee accounts" description="Manage permanent shared department logins and create authorized Principal or Admin accounts." />
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(275px,.85fr)_minmax(0,1.6fr)]">
              <Panel title="Create an administrative account" description="Department accounts are already provisioned; no additional department accounts may be created.">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); act(async () => {
                  await api('/admin/staff', { method: 'POST', body: { ...newAccount, departmentId: null } })
                  setNewAccount(FRESH_ACCOUNT)
                }, 'Administrative account created successfully.') }}>
                  <Field label="Login ID" required value={newAccount.code} onChange={(e) => setNewAccount((old) => ({ ...old, code: e.target.value }))} />
                  <Field label="Display name" required value={newAccount.name} onChange={(e) => setNewAccount((old) => ({ ...old, name: e.target.value }))} />
                  <Field label="Initial password" type="password" required minLength={8} value={newAccount.password} onChange={(e) => setNewAccount((old) => ({ ...old, password: e.target.value }))} />
                  <p className="tiny">Use at least 8 characters including one letter and one number.</p>
                  <label className="block"><span className="label">Account role</span><select className="field" value={newAccount.role} onChange={(e) => setNewAccount((old) => ({ ...old, role: e.target.value }))}><option value="ADMIN">Admin</option><option value="PRINCIPAL">Principal</option></select></label>
                  <button type="submit" disabled={busy || !/(?=.*[a-z])(?=.*\d).{8,}/i.test(newAccount.password)} className="btn btn-primary w-full"><UserPlus size={16} /> Create account</button>
                </form>
              </Panel>
              <Panel title="Existing accounts" description={`${number(people.length)} department and administration accounts. Credential changes invalidate previous sessions.`}>
                {people.length ? <div className="table-wrap"><table><thead><tr><th>Login ID</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{people.map((person) => <tr key={person.id}>
                    <td className="font-semibold text-slate-900">{person.code}</td><td>{person.role}</td>
                    <td>{departmentById.get(person.departmentId) || '—'}</td>
                    <td><span className={`pill ${person.active ? 'status-APPROVED' : 'status-REJECTED'}`}>{person.active ? 'Active' : 'Disabled'}</span></td>
                    <td><div className="flex min-w-[180px] flex-wrap gap-2">
                      {person.role === 'STAFF' && <button type="button" className="btn btn-muted !min-h-9 !py-1.5" onClick={() => openDialog('login', person, person.code)}><Pencil size={14} /> Rename login</button>}
                      <button type="button" className="btn btn-muted !min-h-9 !py-1.5" onClick={() => openDialog('password', person)}><LockKeyhole size={14} /> Reset password</button>
                      {person.role !== 'STAFF' && <button type="button" className="btn btn-muted !min-h-9 !py-1.5" onClick={() => openDialog('accountActive', person)}>{person.active ? 'Deactivate' : 'Activate'}</button>}
                    </div></td>
                  </tr>)}</tbody></table></div> : <Empty message="No accounts found." />}
              </Panel>
            </div>
          </>}

          {tab === 'departments' && <>
            <SectionTitle eyebrow="Departments" title="Mandatory clearance departments" description="All 17 departments participate independently in every student's clearance process. You may update display names without changing their identifiers." />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{departments.map((department) => <div key={department.id} className="card flex min-w-0 flex-col justify-between p-5">
              <div><div className="mb-3 flex items-center justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-500"><Building2 size={18} /></span><span className="pill status-APPROVED">Active · Required</span></div>
                <h3 className="text-[15px] font-semibold leading-6 text-slate-900">{department.name}</h3><p className="tiny mt-1">{department.code}</p></div>
              <button type="button" className="btn btn-muted mt-5 self-start !py-2" onClick={() => openDialog('department', department, department.name)}><Pencil size={14} /> Rename display label</button>
            </div>)}</div>
            {!departments.length && <Panel><Empty message="No department records were returned." /></Panel>}
          </>}

          {tab === 'details' && <>
            <SectionTitle eyebrow="Application review" title="Student clearance record" description="Inspect current department decisions, authorize corrections, issue forms, and verify physical certificate handover."
              action={<button type="button" className="btn btn-muted" onClick={() => go('applications')}><ArrowLeft size={16} /> All applications</button>} />
            {!selected ? <Panel><Empty message="Select a student application from Overview or Applications to review it." /></Panel> : <>
              <AppCard item={selected}>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <KeyValue label="Student email" value={selected.email} />
                  <KeyValue label="Phone" value={selected.phone} />
                  <KeyValue label="Submitted" value={dateText(selected.submittedAt)} />
                  <KeyValue label="Principal decision" value={<Status value={selected.principalStatus} />} />
                  <KeyValue label="PDF email" value={<Status value={selected.emailStatus} />} />
                  <KeyValue label="Handover" value={<Status value={selected.handoverStatus} />} />
                </dl>
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <SectionTitle title="Department decisions" description="Each department's latest status, shared account attribution, and recorded remarks." />
                  <div className="grid gap-3 sm:grid-cols-2">{rows(selected.approvals).map((approval) => <div key={approval.id} className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-[13px] font-semibold text-slate-900">{approval.department}</p><Status value={approval.status} /></div>
                    {approval.staffName && <p className="tiny mt-2">{approval.staffName}</p>}
                    {approval.decidedAt && <p className="tiny mt-1">{dateText(approval.decidedAt)}</p>}
                    {approval.remarks && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">{approval.remarks}</p>}
                    {approval.status === 'REJECTED' && <button type="button" className="btn btn-muted mt-4 !py-2" disabled={!reason.trim() || busy} onClick={() => submitReopening(approval.id, false)}>Authorize reopening</button>}
                  </div>)}</div>
                  <div className="mt-5"><Field label="Required reason for reopening" type="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this decision should be reviewed again" /></div>
                  {selected.principalStatus === 'REJECTED' && <button type="button" className="btn btn-muted mt-3" disabled={!reason.trim() || busy} onClick={() => submitReopening(null, true)}>Reopen Principal rejection</button>}
                </div>
              </AppCard>

              {selected.status === 'APPROVED' && <Panel title="Approved clearance form" description={`Verification ID: ${selected.verificationId || 'Not generated yet'}`}>
                <div className="flex flex-wrap gap-3">
                  {selected.pdfReady && <button type="button" disabled={busy} className="btn btn-muted" onClick={() => act(() => downloadPdf(`/admin/forms/${selected.id}/download`, `No-Dues-${selected.id}.pdf`), 'Approved PDF downloaded.')}><Download size={16} /> Download PDF</button>}
                  <button type="button" disabled={busy} className="btn btn-primary" onClick={() => issueDocument(`/admin/forms/${selected.id}/issue`, 'PDF issuance and email delivery attempted.')}><FileCheck2 size={16} /> Issue / recover PDF</button>
                  <button type="button" disabled={busy || !selected.pdfReady} className="btn btn-muted" onClick={() => issueDocument(`/admin/forms/${selected.id}/resend`, 'PDF email delivery retried.')}><Mail size={16} /> Retry email</button>
                </div>
              </Panel>}

              {selected.status === 'APPROVED' && selected.handoverStatus !== 'HANDED_OVER' && <Panel title="Certificate handover verification" description="Admin must physically verify the original documents and matching PDF verification ID before recording the handover.">
                <div className="grid gap-3 sm:grid-cols-2">{CHECKS.map(([key, label]) => <div key={key} className="rounded-md border border-slate-200 p-4">
                  <label className="flex cursor-pointer items-start gap-3 text-[13px] font-medium leading-6 text-slate-700"><input className="mt-1.5" type="checkbox" checked={Boolean(checks[key])} onChange={(e) => setChecks((old) => ({ ...old, [key]: e.target.checked }))} />{label}</label>
                  {['student_id_or_receipt', 'deposit_receipt_or_affidavit'].includes(key) && <input className="field mt-3" placeholder="Alternate receipt / affidavit details (if used)" value={alternatives[key] || ''} onChange={(e) => setAlternatives((old) => ({ ...old, [key]: e.target.value }))} />}
                </div>)}</div>
                <div className="mt-5 max-w-lg"><Field label="Verification ID from printed PDF" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="Enter or scan the exact verification ID" />
                  <p className="tiny mt-2">All physical checks must be completed. The entered ID must match the issued PDF record.</p></div>
                <button type="button" className="btn btn-primary mt-5" disabled={busy || !selected.pdfReady || !checksComplete || !verificationMatches} onClick={() => {
                  if (!window.confirm('Confirm that the student physically received their ORIGINAL certificates? This records a permanent handover.')) return
                  act(() => api('/admin/handovers', { method: 'POST', body: {
                    applicationId: selected.id, verificationId: verifyId.trim(), checklist: checks, alternatives,
                    remarks: 'Verified physically by Administrator',
                  } }), 'Original certificate handover recorded successfully.', { audit: true })
                }}><ShieldCheck size={17} /> Verify & record handover</button>
              </Panel>}
              {selected.handoverStatus === 'HANDED_OVER' && <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-5 text-sm font-semibold text-emerald-800"><CheckCircle2 size={19} /> Original certificates have already been handed over and recorded.</div>}
              <Panel title="Audit history" description="Chronological record of application and administrative actions." action={<button type="button" className="btn btn-muted !py-2" onClick={() => reloadHistory(selected.id)} disabled={historyLoading}><RefreshCw size={15} className={historyLoading ? 'animate-spin' : ''} /> Refresh</button>}>
                {historyLoading ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin" /> Loading audit records…</div>
                  : history.length ? <div className="divide-y divide-slate-100">{history.map((event) => <div key={event.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-[13px] font-semibold text-slate-800">{String(event.action || 'Event').replaceAll('_', ' ')}</p><time className="tiny">{dateText(event.createdAt)}</time></div>
                    <p className="tiny mt-1.5 break-words">{event.actorType || 'System'}{event.details ? ` · ${event.details}` : ''}</p>
                  </div>)}</div> : <Empty message="No audit events recorded for this application." />}
              </Panel>
            </>}
          </>}
        </>}
      </div>
    </div>

    {dialog && <Dialog
      title={dialog.type === 'login' ? 'Rename department login' : dialog.type === 'password' ? 'Reset account password' : dialog.type === 'department' ? 'Rename department label' : dialog.target.active ? 'Deactivate account' : 'Activate account'}
      description={dialog.type === 'password' ? `Set a new password for ${dialog.target.code}. Existing sessions will be invalidated.` : dialog.type === 'login' ? `Rename ${dialog.target.code}. The department, password, permissions and decision history will remain unchanged.` : dialog.type === 'department' ? 'This changes only the display name, not the department assignment.' : `Change account availability for ${dialog.target.code}.`}
      onClose={closeDialog} onConfirm={saveDialog} busy={busy} error={error}
      danger={dialog.type === 'accountActive' && dialog.target.active}
      confirmLabel={dialog.type === 'password' ? 'Reset password' : dialog.type === 'accountActive' ? 'Confirm change' : 'Save changes'}
      disableConfirm={dialog.type === 'password' ? !(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(dialogValue)) : dialog.type === 'login' ? !(/^[A-Z0-9_]{4,30}$/.test(dialogValue.trim().toUpperCase())) : dialog.type === 'department' ? !dialogValue.trim() : false}
    >
      {dialog.type !== 'accountActive' && <label className="block"><span className="label">{dialog.type === 'password' ? 'New password' : dialog.type === 'login' ? 'New login ID' : 'Department name'}</span>
        <input className="field" autoFocus type={dialog.type === 'password' ? 'password' : 'text'} value={dialogValue}
          maxLength={dialog.type === 'login' ? 30 : undefined}
          onChange={(e) => setDialogValue(e.target.value)} autoComplete={dialog.type === 'password' ? 'new-password' : 'off'} />
        {dialog.type === 'password' && <p className="tiny mt-2">At least 8 characters, including one letter and one number.</p>}
        {dialog.type === 'login' && <p className="tiny mt-2">4–30 characters; uppercase letters, numbers and underscores. Reserved IDs are rejected by the server.</p>}
      </label>}
      {dialog.type === 'accountActive' && <p className="text-sm leading-6 text-slate-700">{dialog.target.active ? 'This account will no longer be allowed to log in until reactivated.' : 'This account will be permitted to log in again.'}</p>}
    </Dialog>}
  </main>
}
