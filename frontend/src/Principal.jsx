import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, downloadPdf } from './api'
import { Empty, ErrorPanel, Status } from './components'
import {
  ArrowRight, BarChart3, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardCheck, Clock3, Download, FileDown, Files, GraduationCap, History,
  LayoutDashboard, LoaderCircle, Menu, RefreshCw, Search, ShieldCheck, X,
  XCircle,
} from 'lucide-react'

/**
 * DCCMP Principal dashboard — frontend-only drop-in replacement.
 * Existing /principal endpoints, roles, payloads and actions are unchanged.
 * Compatible with the Quiet Campus UI index.css and shared components.jsx.
 */
const NAVIGATION = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'applications', label: 'Applications', icon: Files },
  { key: 'departments', label: 'Department Analytics', icon: BarChart3 },
  { key: 'search', label: 'Student Search', icon: Search },
  { key: 'reports', label: 'Reports', icon: FileDown },
  { key: 'history', label: 'Approval History', icon: History },
]
const DEFAULT_FILTERS = () => ({ roll: '', name: '', branch: '', status: '', sort: 'newest' })
const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['PENDING_DEPARTMENTS', 'Department pending'],
  ['ACTION_REQUIRED', 'Department rejected'],
  ['PENDING_PRINCIPAL', 'Awaiting Principal'],
  ['APPROVED', 'Approved'],
  ['PRINCIPAL_ACTION_REQUIRED', 'Principal rejected'],
]
const PERIODS = [
  ['all', 'All Time'], ['today', 'Today'], ['week', 'This Week'],
  ['month', 'This Month'], ['year', 'This Year'], ['custom', 'Custom Range'],
]
const qs = (values) => new URLSearchParams(
  Object.entries(values).filter(([, value]) => value !== '' && value !== undefined && value !== null),
).toString()
const parseDate = (value) => {
  if (!value) return null
  const text = String(value)
  const parsed = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(text) ? text : `${text}+05:30`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
const dateLabel = (value, showTime = true) => {
  const date = parseDate(value)
  if (!date) return '—'
  const opts = {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    ...(showTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  }
  return `${new Intl.DateTimeFormat('en-GB', opts).format(date)}${showTime ? ' IST' : ''}`
}
const averageDuration = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'N/A'
  const minutes = Math.max(0, Number(value))
  return minutes < 1440
    ? `${Math.floor(minutes / 60)} hours, ${Math.round(minutes % 60)} minutes`
    : `${Math.floor(minutes / 1440)} days, ${Math.round((minutes % 1440) / 60)} hours`
}
const number = (value) => Number(value || 0).toLocaleString('en-IN')
const safeArray = (value) => Array.isArray(value) ? value : []
const progress = (item) => safeArray(item?.approvals).filter((entry) => entry.status === 'APPROVED').length
const periodValid = (period, range) => {
  if (period !== 'custom') return true
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (type) => parts.find((entry) => entry.type === type)?.value
  const today = `${value('year')}-${value('month')}-${value('day')}`
  return Boolean(range.start && range.end && range.start <= range.end && range.end <= today)
}

function PanelHeader({ kicker, title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        {kicker && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">{kicker}</p>}
        <h2 className="text-[18px] font-semibold text-slate-900 sm:text-[22px]">{title}</h2>
        {description && <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
function Loading({ label = 'Loading dashboard information…' }) {
  return <div className="card flex min-h-44 items-center justify-center gap-3 p-8 text-sm text-slate-500" role="status"><LoaderCircle size={19} className="animate-spin" />{label}</div>
}
function SectionError({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="card space-y-3 p-5" role="alert">
      <ErrorPanel error={error} />
      <button type="button" className="btn btn-muted" onClick={onRetry}><RefreshCw size={15} /> Retry</button>
    </div>
  )
}
function Notice({ text, onClose }) {
  if (!text) return null
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800" role="status">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">{text}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message"><X size={16} /></button>
    </div>
  )
}
function DateControls({ period, setPeriod, range, setRange }) {
  return (
    <div className="card mb-6 flex flex-wrap items-end gap-4 p-4 sm:p-5">
      <label className="min-w-[180px] flex-1 sm:max-w-[255px]">
        <span className="label">Reporting period</span>
        <select className="field" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
      </label>
      {period === 'custom' && <>
        <label className="min-w-[140px] flex-1 sm:max-w-[210px]"><span className="label">Start date</span>
          <input type="date" className="field" value={range.start} max={range.end || undefined} onChange={(e) => setRange((old) => ({ ...old, start: e.target.value }))} />
        </label>
        <label className="min-w-[140px] flex-1 sm:max-w-[210px]"><span className="label">End date</span>
          <input type="date" className="field" value={range.end} min={range.start || undefined} onChange={(e) => setRange((old) => ({ ...old, end: e.target.value }))} />
        </label>
        {!periodValid(period, range) && <p className="w-full text-xs text-amber-700" role="status">Choose valid start and end dates. Future dates are not allowed.</p>}
      </>}
    </div>
  )
}
function Metric({ label, value, icon: Icon, detail }) {
  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><p className="text-[12px] font-medium leading-5 text-slate-500">{label}</p><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><Icon size={17} strokeWidth={1.7}/></span></div>
      <p className="metric mt-3">{number(value)}</p>
      {detail && <p className="tiny mt-2">{detail}</p>}
    </div>
  )
}
function Pagination({ data, onPage }) {
  if (!data) return null
  const page = Math.max(0, Number(data.page) || 0)
  const pages = Math.max(1, Number(data.pages) || 1)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
      <p className="tiny">{number(data.total)} results · Page {page + 1} of {pages}</p>
      {pages > 1 && <nav aria-label="Pagination" className="flex gap-2">
        <button type="button" className="btn btn-muted" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /> Previous</button>
        <button type="button" className="btn btn-muted" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next <ChevronRight size={15} /></button>
      </nav>}
    </div>
  )
}
function KeyValue({ label, value }) {
  return <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-[13px] font-medium text-slate-800">{value ?? '—'}</dd></div>
}
function StudentDetails({ item, onClose, onDecide, busy, onDownload }) {
  if (!item) return null
  const approvals = safeArray(item.approvals)
  const canDecide = item.status === 'PENDING_PRINCIPAL' && approvals.length === 17 && progress(item) === 17
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/40" role="presentation">
      <button type="button" aria-label="Close student details" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative flex h-full w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl md:max-w-2xl" role="dialog" aria-modal="true" aria-label="Student clearance details">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Application details</p><h2 className="mt-1 text-lg font-bold text-slate-900">Student clearance record</h2></div>
          <button type="button" className="btn btn-muted !min-h-9 !px-3" onClick={onClose} aria-label="Close student details"><X size={17} /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">{item.studentName || item.rollNumber}</h3><p className="mt-1 text-sm text-slate-500">{item.rollNumber} · {item.branch || 'Branch not provided'}</p></div><Status value={item.status}/></div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <KeyValue label="Submitted" value={dateLabel(item.submittedAt)} />
              <KeyValue label="Departments approved" value={`${progress(item)} / 17`} />
              <KeyValue label="Email" value={item.email} />
              <KeyValue label="Phone" value={item.phone} />
              <div className="sm:col-span-2"><KeyValue label="Address" value={item.address} /></div>
              {item.principalRemarks && <div className="sm:col-span-2"><KeyValue label="Principal remarks" value={item.principalRemarks} /></div>}
            </dl>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-900">Department clearance</h3><span className="tiny">{progress(item)} of 17 approved</span></div>
            {approvals.length ? <div className="grid gap-3 sm:grid-cols-2">
              {approvals.map((approval, index) => <div key={approval.id ?? `${approval.department}-${index}`} className="rounded-md border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] font-semibold text-slate-800">{approval.department}</p><Status value={approval.status}/></div>
                {approval.remarks && <p className="mt-2 break-words text-[12px] leading-5 text-slate-600">{approval.remarks}</p>}
                <p className="tiny mt-2">{dateLabel(approval.decidedAt)}</p>
              </div>)}
            </div> : <Empty message="No department decisions are available for this application." />}
          </div>
        </div>
        {(canDecide || (item.status === 'APPROVED' && item.pdfReady)) && <footer className="flex flex-wrap gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
          {canDecide && <>
            <button type="button" disabled={busy} className="btn btn-primary flex-1" onClick={() => onDecide(item, true)}><CheckCircle2 size={16} /> Final Approve</button>
            <button type="button" disabled={busy} className="btn btn-danger flex-1" onClick={() => onDecide(item, false)}><XCircle size={16} /> Reject</button>
          </>}
          {item.status === 'APPROVED' && item.pdfReady && <button type="button" className="btn btn-primary w-full" onClick={() => onDownload(item)}><Download size={16} /> Download Final No Dues PDF</button>}
        </footer>}
      </section>
    </div>
  )
}
function DecisionModal({ decision, remark, setRemark, busy, onCancel, onConfirm }) {
  if (!decision) return null
  const eligible = decision.item.status === 'PENDING_PRINCIPAL' && safeArray(decision.item.approvals).length === 17 && progress(decision.item) === 17
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4">
      <section className="card w-full max-w-lg p-6 sm:p-7" role="dialog" aria-modal="true" aria-label={decision.yes ? 'Confirm final approval' : 'Confirm principal rejection'}>
        <div className="mb-4 flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-600">{decision.yes ? <CheckCircle2 size={21}/> : <XCircle size={21}/>}</span><div><h2 className="text-lg font-bold text-slate-900">{decision.yes ? 'Confirm final approval' : 'Confirm rejection'}</h2><p className="mt-1 text-sm text-slate-500">{decision.item.studentName} · {decision.item.rollNumber}</p></div></div>
        <label className="block"><span className="label">{decision.yes ? 'Approval remarks (optional)' : 'Rejection reason (required)'}</span><textarea className="field" rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={decision.yes ? 'Optional remarks for the student' : 'Enter a clear reason for rejection'} /></label>
        {!eligible && <p className="mt-3 text-xs text-amber-700">Final decisions require all 17 department approvals and a pending Principal application.</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" className="btn btn-muted" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy || !eligible || (!decision.yes && !remark.trim())} onClick={onConfirm}>{busy && <LoaderCircle className="animate-spin" size={15}/>} Confirm decision</button></div>
      </section>
    </div>
  )
}

export default function Principal() {
  const [section, setSection] = useState('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [period, setPeriod] = useState('all')
  const [range, setRange] = useState({ start: '', end: '' })
  const [overview, setOverview] = useState(null)
  const [departments, setDepartments] = useState(null)
  const [applications, setApplications] = useState(null)
  const [history, setHistory] = useState(null)
  const [students, setStudents] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [detail, setDetail] = useState(null)
  const [decision, setDecision] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const requestIds = useRef({})
  const validDates = periodValid(period, range)
  const rangeKey = `${period}:${range.start}:${range.end}`

  // Search starts at three characters. Debounce avoids a request for every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(searchText.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [searchText])

  const load = useCallback(async (key, path, onSuccess) => {
    const id = (requestIds.current[key] || 0) + 1
    requestIds.current[key] = id
    setErrors((old) => ({ ...old, [key]: '' }))
    setLoading((old) => ({ ...old, [key]: true }))
    try {
      const response = await api(path)
      if (requestIds.current[key] === id) onSuccess(response)
    } catch (error) {
      if (requestIds.current[key] === id) setErrors((old) => ({ ...old, [key]: error.message || 'Unable to load information.' }))
    } finally {
      if (requestIds.current[key] === id) setLoading((old) => ({ ...old, [key]: false }))
    }
  }, [])

  useEffect(() => {
    if ((section === 'overview' || section === 'departments') && !validDates) return
    const dates = qs({ period, ...range })
    if (section === 'overview') {
      load('overview', `/principal/overview?${dates}`, setOverview)
      load('departments', `/principal/departments?${dates}`, setDepartments)
    } else if (section === 'departments') {
      load('departments', `/principal/departments?${dates}`, setDepartments)
    } else if (section === 'applications') {
      load('applications', `/principal/applications?${qs({ page, ...filters })}`, setApplications)
    } else if (section === 'history') {
      load('history', `/principal/history?${qs({ page })}`, setHistory)
    } else if (section === 'search' && searchDebounced.length >= 3) {
      load('students', `/principal/students?${qs({ roll: searchDebounced })}`, setStudents)
    }
  }, [section, rangeKey, validDates, page, filters, searchDebounced, refreshKey, load])

  const navigate = (next) => {
    setSection(next)
    setMobileNav(false)
    setNotice('')
    setPage(0)
    setFilters(DEFAULT_FILTERS())
    setSearchText('')
    setSearchDebounced('')
    setStudents(null)
    setErrors({})
    setDetail(null)
  }
  const updateFilter = (field, value) => {
    setPage(0)
    setFilters((old) => ({ ...old, [field]: value }))
  }
  const reload = () => setRefreshKey((value) => value + 1)
  const beginDecision = (item, yes) => { setRemarks(''); setDecision({ item, yes }) }
  const confirmDecision = async () => {
    if (!decision || busy) return
    const { item, yes } = decision
    if (item.status !== 'PENDING_PRINCIPAL' || safeArray(item.approvals).length !== 17 || progress(item) !== 17 || (!yes && !remarks.trim())) return
    setBusy(true)
    setErrors((old) => ({ ...old, action: '' }))
    try {
      await api(`/principal/applications/${item.id}/${yes ? 'approve' : 'reject'}`, { method: 'PATCH', body: { remarks: remarks.trim() } })
      setNotice(yes ? 'Final approval recorded successfully.' : 'Principal rejection recorded successfully.')
      setDecision(null)
      setDetail(null)
      setRemarks('')
      reload()
    } catch (error) {
      setErrors((old) => ({ ...old, action: error.message || 'Unable to record the decision.' }))
    } finally {
      setBusy(false)
    }
  }
  const downloadFinalPdf = async (item) => {
    setErrors((old) => ({ ...old, action: '' }))
    try { await downloadPdf(`/principal/forms/${item.id}/download`, `No-Dues-${item.id}.pdf`) }
    catch (error) { setErrors((old) => ({ ...old, action: error.message || 'Unable to download the form.' })) }
  }
  const exportReport = async (format) => {
    if (busy || !validDates) return
    setBusy(true)
    setErrors((old) => ({ ...old, reports: '' }))
    try {
      const response = await api(`/principal/reports?${qs({ format, period, ...range })}`)
      // api() returns Blob for PDF/XLSX and plain text for CSV.
      const mime = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv;charset=utf-8' }[format]
      const blob = response instanceof Blob ? response : new Blob([response], { type: mime })
      const href = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = `DCCMP-Department-Analytics.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(href), 3000)
    } catch (error) {
      setErrors((old) => ({ ...old, reports: error.message || `Unable to download ${format.toUpperCase()} report.` }))
    } finally {
      setBusy(false)
    }
  }
  const active = NAVIGATION.find((entry) => entry.key === section)
  const currentDepartments = safeArray(departments)
  const applicationItems = safeArray(applications?.items)
  const historyItems = safeArray(history?.items)
  const studentItems = safeArray(students?.items)
  const quickDepartments = useMemo(() => currentDepartments.slice(0, 17), [departments])

  return (
    <div className="staff-shell flex min-h-[calc(100vh-75px)] bg-[#f8f9fa]">
      {mobileNav && <button type="button" className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`staff-sidebar fixed inset-y-0 left-0 z-50 w-[248px] -translate-x-full transition-transform duration-200 md:sticky md:top-0 md:h-[calc(100vh-75px)] md:translate-x-0 ${mobileNav ? '!translate-x-0' : ''}`} aria-label="Principal navigation">
        <div className="mb-6 flex items-start justify-between gap-2 px-2 pt-2">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-100 text-slate-600"><ShieldCheck size={20} /></span><div><h2 className="text-sm font-bold text-slate-900">Principal Portal</h2><p className="mt-0.5 text-[11px] text-slate-500">Usharama College</p></div></div>
          <button type="button" className="btn btn-muted md:hidden !min-h-8 !p-1.5" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={17}/></button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Administration</p>
        <nav className="space-y-1" aria-label="Principal sections">
          {NAVIGATION.map(({ key, label, icon: Icon }) => <button type="button" key={key} className={`staff-nav-item ${section === key ? 'staff-nav-active' : ''}`} aria-current={section === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={17} strokeWidth={1.8}/>{label}</button>)}
        </nav>
        <div className="mt-8 rounded-md border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">Secure approvals</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Final approval requires clearance from all 17 departments.</p></div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
        <div className="mx-auto max-w-[1480px]">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="btn btn-muted !min-h-10 !px-3 md:hidden" onClick={() => setMobileNav(true)} aria-label="Open principal navigation"><Menu size={19}/></button>
              <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[.1em] text-slate-400">Principal workspace</p><h1 className="section-title">{active?.label}</h1></div>
            </div>
            {section !== 'reports' && <button type="button" className="btn btn-muted" onClick={reload} disabled={Boolean(loading[section])}><RefreshCw size={16} className={loading[section] ? 'animate-spin' : ''}/> Refresh</button>}
          </header>
          <Notice text={notice} onClose={() => setNotice('')}/>
          <SectionError error={errors.action} onRetry={reload}/>
          {(section === 'overview' || section === 'departments' || section === 'reports') && <DateControls period={period} setPeriod={setPeriod} range={range} setRange={setRange}/>}

          {section === 'overview' && <div className="space-y-7">
            <section>
              <PanelHeader title="Clearance at a glance" description="Current application statuses for the selected submission period." />
              <SectionError error={errors.overview} onRetry={reload}/>
              {loading.overview && !overview ? <Loading/> : overview && <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
                <Metric label="Total submitted" value={overview.total} icon={Files}/>
                <Metric label="Principal approved" value={overview.approved} icon={CheckCircle2}/>
                <Metric label="Awaiting Principal" value={overview.pendingPrincipal} icon={Clock3}/>
                <Metric label="Department pending" value={overview.pendingDepartments} icon={ClipboardCheck}/>
                <Metric label="Unresolved rejected" value={overview.unresolvedRejected} icon={XCircle}/>
              </div>}
            </section>
            <section className="card p-5 sm:p-6">
              <PanelHeader title="Department clearance overview" description="Current decision distribution across all 17 required departments." action={<button type="button" onClick={() => navigate('departments')} className="btn btn-muted">Detailed analytics <ArrowRight size={15}/></button>} />
              <SectionError error={errors.departments} onRetry={reload}/>
              {loading.departments && !departments ? <Loading label="Loading department metrics…"/> : quickDepartments.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {quickDepartments.map((department) => {
                  const total = Math.max(0, Number(department.total) || 0)
                  const approved = Number(department.approved) || 0
                  const rejected = Number(department.rejected) || 0
                  return <div key={department.departmentId ?? department.code} className="rounded-md border border-slate-100 bg-[#fafbfc] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3"><span className="min-w-0 text-[13px] font-semibold text-slate-800">{department.department}</span><span className="shrink-0 text-[11px] text-slate-500">{approved}/{total} approved</span></div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`${approved} approved, ${rejected} rejected, ${department.pending} pending`}>
                      <div className="bg-[#6c9584]" style={{ width: `${total ? Math.min(100, 100 * approved / total) : 0}%` }}/>
                      <div className="bg-[#ca9694]" style={{ width: `${total ? Math.min(100, 100 * rejected / total) : 0}%` }}/>
                    </div>
                    <p className="tiny mt-2">{department.pending} pending · {rejected} rejected</p>
                  </div>
                })}
              </div> : !loading.departments && !errors.departments && <Empty message="No department activity found for this reporting period."/>}
            </section>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card p-6"><span className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-600"><ClipboardCheck size={20}/></span><h3 className="text-[15px] font-semibold text-slate-900">Final approval workflow</h3><p className="mt-2 text-[13px] leading-6 text-slate-500">Review student requests after all 17 department accounts have approved them.</p><button className="btn btn-primary mt-5" type="button" onClick={() => navigate('applications')}>Review applications <ArrowRight size={16}/></button></div>
              <div className="card p-6"><span className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-600"><BarChart3 size={20}/></span><h3 className="text-[15px] font-semibold text-slate-900">Department analytics</h3><p className="mt-2 text-[13px] leading-6 text-slate-500">Compare shared department accounts, approval rates, unresolved requests and processing times.</p><button className="btn btn-muted mt-5" type="button" onClick={() => navigate('departments')}>View analytics <ArrowRight size={16}/></button></div>
            </div>
          </div>}

          {section === 'applications' && <section>
            <PanelHeader title="All No Dues applications" description="Search and review applications before recording final Principal decisions." />
            <div className="card mb-5 grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-5">
              <label><span className="label">Roll number</span><input className="field" placeholder="Search roll number" value={filters.roll} onChange={(e) => updateFilter('roll', e.target.value)}/></label>
              <label><span className="label">Student name</span><input className="field" placeholder="Search student name" value={filters.name} onChange={(e) => updateFilter('name', e.target.value)}/></label>
              <label><span className="label">Branch</span><input className="field" placeholder="Search branch" value={filters.branch} onChange={(e) => updateFilter('branch', e.target.value)}/></label>
              <label><span className="label">Overall status</span><select className="field" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span className="label">Sort by</span><select className="field" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
            </div>
            <SectionError error={errors.applications} onRetry={reload}/>
            {loading.applications && !applications ? <Loading label="Loading student applications…"/> : applications && <>
              <div className="card table-wrap"><table><thead><tr>{['Roll number', 'Student', 'Branch', 'Submitted (IST)', 'Status', 'Department approvals', ''].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{applicationItems.map((item) => <tr key={item.id}><td className="font-semibold text-slate-800">{item.rollNumber}</td><td>{item.studentName}</td><td>{item.branch}</td><td className="whitespace-nowrap">{dateLabel(item.submittedAt)}</td><td><Status value={item.status}/></td><td className="whitespace-nowrap">{progress(item)} / 17</td><td><button type="button" className="btn btn-muted !min-h-9 !py-2" onClick={() => setDetail(item)}>View details <ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>
              {!applicationItems.length && <div className="mt-4"><Empty message="No applications match your filters."/></div>}
              <Pagination data={applications} onPage={setPage}/>
            </>}
          </section>}

          {section === 'departments' && <section>
            <PanelHeader title="Department analytics" description="Department-level statistics and shared-login activity across all 17 mandatory clearances." />
            <SectionError error={errors.departments} onRetry={reload}/>
            {loading.departments && !departments ? <Loading label="Loading department analytics…"/> : departments && <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="card p-5"><p className="text-xs text-slate-500">Active departments</p><p className="metric mt-3">{number(currentDepartments.length)}</p></div>
                <div className="card p-5"><p className="text-xs text-slate-500">Current pending decisions</p><p className="metric mt-3">{number(currentDepartments.reduce((sum, item) => sum + (Number(item.pending) || 0), 0))}</p></div>
                <div className="card p-5"><p className="text-xs text-slate-500">Historical decisions</p><p className="metric mt-3">{number(currentDepartments.reduce((sum, item) => sum + (Number(item.historicalApprovals) || 0) + (Number(item.historicalRejections) || 0), 0))}</p></div>
              </div>
              <div className="card table-wrap mt-5"><table><thead><tr>{['Department', 'Shared login', 'Total', 'Pending', 'Approved', 'Rejected', 'Approval rate', 'Avg processing time', 'Historical decisions'].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{currentDepartments.map((item) => <tr key={item.departmentId ?? item.code}><td className="min-w-40 font-semibold text-slate-800">{item.department}</td><td className="font-mono text-xs">{item.account}</td><td>{number(item.total)}</td><td>{number(item.pending)}</td><td>{number(item.approved)}</td><td>{number(item.rejected)}</td><td className="whitespace-nowrap">{item.approvalRate == null ? 'N/A' : `${Number(item.approvalRate).toFixed(1)}%`}</td><td className="whitespace-nowrap">{averageDuration(item.averageMinutes)}</td><td className="whitespace-nowrap">{number(item.historicalApprovals)} approved / {number(item.historicalRejections)} rejected</td></tr>)}</tbody></table></div>
              {!currentDepartments.length && <div className="mt-4"><Empty message="No department analytics found for this reporting period."/></div>}
              <p className="tiny mt-4">Shared logins identify department accounts, not individual staff members.</p>
            </>}
          </section>}

          {section === 'search' && <section>
            <PanelHeader title="Student search" description="Search by a full or partial roll number, including students who have not submitted a No Dues application." />
            <div className="card mb-5 p-5 sm:p-6"><label htmlFor="principal-student-search" className="label">Roll number (at least 3 characters)</label><form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setSearchDebounced(searchText.trim()); setStudents(null) }}>
              <div className="relative min-w-0 flex-1"><Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input id="principal-student-search" className="field !pl-11" placeholder="Enter roll number" autoComplete="off" value={searchText} onChange={(e) => { setSearchText(e.target.value); setStudents(null) }}/></div>
              <button className="btn btn-primary" type="submit" disabled={searchText.trim().length < 3}><Search size={15}/> Search students</button>
            </form></div>
            {searchText.trim().length < 3 ? <div className="card flex items-center gap-3 p-6 text-sm text-slate-500"><GraduationCap size={19}/> Enter at least 3 roll-number characters to search students.</div> : <>
              <SectionError error={errors.students} onRetry={reload}/>
              {(loading.students || searchDebounced !== searchText.trim()) ? <Loading label="Searching students…"/> : students && (studentItems.length ? <div className="space-y-4">{studentItems.map((student) => <div key={student.rollNumber} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[15px] font-bold text-slate-900">{student.rollNumber}</p><p className="mt-1 break-words text-[13px] text-slate-500">{student.email || 'Email not available'}</p></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{safeArray(student.applications).length} No Dues application(s)</span></div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]"><span className="text-slate-500">Alumni registration</span><span className={`pill ${student.alumni ? 'status-APPROVED' : 'status-PENDING'}`}>{student.alumni ? 'Submitted' : 'Not submitted'}</span></div>
                {student.alumni && <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-4"><p className="mb-2 text-[12px] font-semibold text-slate-700">Alumni registration details</p><dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">{Object.entries(student.alumni).filter(([key, value]) => !['id', 'studentId'].includes(key) && value != null && typeof value !== 'object').map(([key, value]) => <div className="flex min-w-0 gap-2" key={key}><dt className="min-w-0 shrink-0 capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1')}:</dt><dd className="min-w-0 break-all font-medium text-slate-700">{String(value)}</dd></div>)}</dl></div>}
                {safeArray(student.applications).length ? <div className="mt-4 space-y-2">{student.applications.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3"><div><p className="text-[13px] font-semibold text-slate-800">{item.studentName} · {item.branch}</p><p className="tiny mt-1">Submitted {dateLabel(item.submittedAt)}</p></div><div className="flex flex-wrap items-center gap-2"><Status value={item.status}/><button type="button" className="btn btn-muted !min-h-9 !py-2" onClick={() => setDetail(item)}>View details</button></div></div>)}</div> : <p className="mt-4 text-[13px] text-slate-500">No Dues application has been submitted.</p>}
              </div>)}</div> : !errors.students && <Empty message="No students match this roll number."/>)}
            </>}
          </section>}

          {section === 'reports' && <section>
            <PanelHeader title="Official analytics reports" description="Download aggregate statistics for all 17 departments. Individual student records are excluded." />
            <SectionError error={errors.reports} onRetry={() => setErrors((old) => ({ ...old, reports: '' }))}/>
            <div className="card max-w-4xl overflow-hidden">
              <div className="border-b border-slate-100 p-6 sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-600"><FileDown size={22}/></span><h3 className="mt-4 text-[17px] font-bold text-slate-900">Department clearance analytics</h3><p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500">Official Usharama College of Engineering and Technology reports include department metrics, current status totals, approval rates, and available historical aggregates.</p></div>
              <div className="grid gap-3 p-6 sm:grid-cols-3 sm:p-8">
                {[
                  ['pdf', 'Download PDF', 'Print-ready report'],
                  ['xlsx', 'Download Excel', 'Spreadsheet analysis'],
                  ['csv', 'Download CSV', 'Numeric data export'],
                ].map(([format, title, caption]) => <button type="button" key={format} disabled={busy || !validDates} onClick={() => exportReport(format)} className="group flex min-h-32 flex-col items-start gap-2 rounded-md border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"><Download size={18} className="text-slate-500"/><span className="mt-2 text-[13px] font-semibold text-slate-800">{title}</span><span className="tiny">{caption}</span></button>)}
              </div>
              {busy && <p className="px-8 pb-6 text-xs text-slate-500" role="status">Preparing the report…</p>}
            </div>
          </section>}

          {section === 'history' && <section>
            <PanelHeader title="Approval history" description="Historical department and Principal decisions, including authorized reopen events." />
            <SectionError error={errors.history} onRetry={reload}/>
            {loading.history && !history ? <Loading label="Loading approval history…"/> : history && <>
              <div className="card table-wrap"><table><thead><tr>{['Decision / event', 'Department account', 'Date (IST)', 'Details', 'Application'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{historyItems.map((item, index) => <tr key={`${item.applicationId}-${item.at}-${index}`}><td className="min-w-36 font-medium text-slate-800">{String(item.action || '').replaceAll('_', ' ')}</td><td>{item.account}</td><td className="whitespace-nowrap">{dateLabel(item.at)}</td><td className="min-w-40">{item.details || '—'}</td><td>#{item.applicationId}</td></tr>)}</tbody></table></div>
              {!historyItems.length && <div className="mt-4"><Empty message="No approval history is available."/></div>}
              <Pagination data={{ page, total: history.total, pages: Math.ceil((history.total || 0) / 10) }} onPage={setPage}/>
            </>}
          </section>}
        </div>
      </main>
      <StudentDetails item={detail} onClose={() => setDetail(null)} onDecide={beginDecision} busy={busy} onDownload={downloadFinalPdf}/>
      <DecisionModal decision={decision} remark={remarks} setRemark={setRemarks} busy={busy} onCancel={() => { if (!busy) { setDecision(null); setRemarks('') } }} onConfirm={confirmDecision}/>
    </div>
  )
}
