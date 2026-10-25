import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { Empty, ErrorPanel, Status } from './components'
import {
  ArrowRight, BarChart3, Check, CheckCheck, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardCheck, Clock3, Copy, Files, History, LayoutDashboard,
  LoaderCircle, Menu, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  X, XCircle,
} from 'lucide-react'

/**
 * DCCMP / Staff dashboard — frontend-only, drop-in replacement.
 * Uses the existing /api/staff routes, shared components, and index.css tokens.
 * No backend, role permissions, decision payloads, or routes are changed.
 */
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pending', label: 'Pending Approvals', icon: ClipboardCheck },
  { id: 'requests', label: 'All Requests', icon: Files },
  { id: 'history', label: 'Decision History', icon: History },
  { id: 'search', label: 'Student Search', icon: Search },
]
const freshFilters = (section = 'requests') => ({
  roll: '', name: '', branch: '', status: '', sort: section === 'pending' ? 'oldest' : 'newest',
})
const params = (values) => new URLSearchParams(
  Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ''),
).toString()
const parseDate = (value) => {
  if (!value) return null
  const text = String(value)
  const date = new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(text) ? text : `${text}+05:30`)
  return Number.isNaN(date.getTime()) ? null : date
}
const formatDate = (value, withTime = true) => {
  const date = parseDate(value)
  if (!date) return '—'
  const options = {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  }
  return `${new Intl.DateTimeFormat('en-GB', options).format(date)}${withTime ? ' IST' : ''}`
}
const pendingTime = (value) => {
  const date = parseDate(value)
  if (!date) return '—'
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000))
  return `${Math.floor(hours / 24)} days, ${hours % 24} hours`
}
const avgTime = (minutes) => {
  if (minutes === undefined || minutes === null || !Number.isFinite(Number(minutes))) return 'N/A'
  const value = Math.max(0, Number(minutes))
  return value < 1440
    ? `${Math.floor(value / 60)} hours, ${Math.round(value % 60)} minutes`
    : `${Math.floor(value / 1440)} days, ${Math.round((value % 1440) / 60)} hours`
}
const todayIST = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
const mutedButton = 'btn btn-muted'
const mainButton = 'btn btn-primary'
const textButton = 'inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900'
const sectionHeading = 'text-[16px] font-semibold text-slate-900'

function Select({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      {label && <span className="label">{label}</span>}
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  )
}
function PageControls({ data, onPage }) {
  if (!data) return null
  const pages = Math.max(1, Number(data.pages) || 1)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
      <p className="tiny">{data.total ?? 0} records · Page {(data.page ?? 0) + 1} of {pages}</p>
      {pages > 1 && (
        <nav className="flex items-center gap-2" aria-label="Pagination">
          <button type="button" className={mutedButton} disabled={data.page <= 0} onClick={() => onPage(data.page - 1)}>
            <ChevronLeft size={15} /> Previous
          </button>
          <button type="button" className={mutedButton} disabled={data.page >= pages - 1} onClick={() => onPage(data.page + 1)}>
            Next <ChevronRight size={15} />
          </button>
        </nav>
      )}
    </div>
  )
}
function QuietPanel({ title, description, action, children, className = '' }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className={sectionHeading}>{title}</h2>}
            {description && <p className="tiny mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
function StatTile({ label, value, hint, clickable = false, onClick, icon: Icon }) {
  const contents = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium text-slate-500">{label}</span>
        <Icon size={17} strokeWidth={1.7} className="text-slate-400" aria-hidden="true" />
      </div>
      <div className="mt-4 text-[28px] font-semibold tracking-tight tabular-nums leading-none text-slate-900">{value ?? '—'}</div>
      <p className="mt-3 text-[11px] font-medium text-slate-400">{hint || 'Department requests'}</p>
    </>
  )
  const className = `card w-full p-5 text-left transition-colors ${clickable ? 'hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400' : ''}`
  return clickable
    ? <button type="button" className={className} onClick={onClick}>{contents}</button>
    : <div className={className}>{contents}</div>
}
function TrendChart({ trend = [], grouping }) {
  const [active, setActive] = useState(null)
  useEffect(() => setActive(null), [trend, grouping])
  const max = Math.max(1, ...trend.map((entry) => (Number(entry.approvals) || 0) + (Number(entry.rejections) || 0)))
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#719785]" /> Approvals</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#c79291]" /> Rejections</span>
        <span className="ml-auto rounded-md bg-slate-100 px-2.5 py-1 text-slate-600">{grouping || 'Monthly'}</span>
      </div>
      {!trend.length ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-12 text-center text-sm text-slate-500">
          No decisions in this period.
        </div>
      ) : (
        <div className="overflow-x-auto pb-1" aria-label="Department approval and rejection activity chart">
          <div className="flex h-[225px] items-end gap-2 border-b border-slate-200 pb-3" style={{ minWidth: trend.length > 18 ? `${trend.length * 35}px` : undefined }}>
            {trend.map((entry, index) => {
              const approved = Number(entry.approvals) || 0
              const rejected = Number(entry.rejections) || 0
              return (
                <button
                  type="button" key={`${entry.period}-${index}`} className="group flex h-full min-w-[18px] flex-1 flex-col items-center justify-end gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-slate-500"
                  title={`${entry.period}: ${approved} approvals, ${rejected} rejections`}
                  onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}
                  onClick={() => setActive(active === index ? null : index)}
                >
                  <div className="flex w-full max-w-9 flex-1 flex-col justify-end gap-[2px]">
                    <div className="min-h-0 rounded-t-[3px] bg-[#719785] group-hover:bg-[#608371]" style={{ height: `${approved ? Math.max(3, (approved / max) * 100) : 0}%` }} />
                    <div className="min-h-0 rounded-b-[3px] bg-[#c79291] group-hover:bg-[#b37d7c]" style={{ height: `${rejected ? Math.max(3, (rejected / max) * 100) : 0}%` }} />
                  </div>
                  <span className="w-full truncate text-center text-[10px] text-slate-400">{String(entry.period).slice(-7)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {active !== null && trend[active] && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <strong className="text-slate-800">{trend[active].period}</strong>
          <span>{trend[active].approvals} approved</span>
          <span>{trend[active].rejections} rejected</span>
          <span>{Number(trend[active].approvals) + Number(trend[active].rejections)} decisions</span>
        </div>
      )}
    </div>
  )
}
function Dialog({ title, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 px-3 py-5 sm:px-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[93vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          <button type="button" className="btn btn-muted !min-h-9 !p-2" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>}
      </section>
    </div>
  )
}
function DetailDrawer({ data, loading, error, onClose, onDecision, busyIds }) {
  const [copied, setCopied] = useState('')
  const copy = async (label, value) => {
    try { await navigator.clipboard.writeText(value); setCopied(label) } catch { setCopied('') }
  }
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/30">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close student details" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-label="Department-scoped student application" className="relative flex h-full w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl md:max-w-[560px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-400">Department records</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Application details</h2>
          </div>
          <button type="button" className={mutedButton + ' !min-h-9 !p-2'} onClick={onClose} aria-label="Close details"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {loading ? <p className="text-sm text-slate-500">Loading student details…</p> : error ? <ErrorPanel error={error} /> : data ? (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">{data.studentName}</h3>
                <p className="mt-1 text-sm text-slate-500">{data.rollNumber} · {data.branch}</p>
                <div className="mt-4"><Status value={data.departmentStatus} /></div>
              </div>
              <h3 className="mb-4 mt-7 text-sm font-semibold text-slate-900">Application information</h3>
              <dl className="divide-y divide-slate-100 rounded-md border border-slate-200 px-4">
                {[
                  ['Submitted', formatDate(data.submittedAt)],
                  ['Pending duration', pendingTime(data.submittedAt)],
                  ['Department decision', formatDate(data.decisionAt)],
                  ['Latest remarks', data.remarks || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                    <dd className="break-words text-sm text-slate-800">{value}</dd>
                  </div>
                ))}
                {[
                  ['Email', data.email], ['Phone', data.phone],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-slate-500">{label}</dt>
                      <dd className="mt-1 break-all text-sm text-slate-800">{value || '—'}</dd>
                    </div>
                    {value && <button type="button" className={mutedButton + ' !min-h-9'} onClick={() => copy(label, value)}>
                      {copied === label ? <Check size={14} /> : <Copy size={14} />}{copied === label ? 'Copied' : 'Copy'}
                    </button>}
                  </div>
                ))}
              </dl>
              {data.departmentStatus === 'PENDING' && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className={mainButton + ' flex-1'} disabled={busyIds.includes(data.approvalId)} onClick={() => onDecision(data, true)}><Check size={16} /> Approve</button>
                  <button type="button" className="btn btn-danger flex-1" disabled={busyIds.includes(data.approvalId)} onClick={() => onDecision(data, false)}><XCircle size={16} /> Reject</button>
                </div>
              )}
              <h3 className="mb-4 mt-8 text-sm font-semibold text-slate-900">Your department's decision history</h3>
              {!data.history?.length && !data.reopenings?.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No previous decisions recorded.</p>}
              <div className="space-y-3">
                {data.history?.map((event) => (
                  <div className="rounded-md border border-slate-200 p-4" key={event.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2"><Status value={event.decision} /><span className="tiny">{formatDate(event.timestamp)}</span></div>
                    <p className="tiny mt-3">Department account: {event.account}</p>
                    {event.remarks && <p className="mt-2 break-words text-sm leading-6 text-slate-700">{event.remarks}</p>}
                  </div>
                ))}
                {data.reopenings?.map((event, index) => (
                  <div className="rounded-md border border-slate-200 p-4" key={`${event.timestamp}-${index}`}>
                    <p className="text-sm font-semibold text-slate-700">Admin reopened request</p>
                    <p className="tiny mt-1">{formatDate(event.timestamp)}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{event.reason}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default function Staff({ person }) {
  const [section, setSection] = useState('overview')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [overview, setOverview] = useState(null)
  const [overviewError, setOverviewError] = useState('')
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [list, setList] = useState(null)
  const [listError, setListError] = useState('')
  const [listLoading, setListLoading] = useState(false)
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [filters, setFilters] = useState(() => freshFilters('overview'))
  const [page, setPage] = useState(0)
  const [period, setPeriod] = useState('all')
  const [range, setRange] = useState({ start: '', end: '' })
  const [grouping, setGrouping] = useState('monthly')
  const [searchInput, setSearchInput] = useState('')
  const [searchRoll, setSearchRoll] = useState('')
  const [selected, setSelected] = useState([])
  const [approvalDialog, setApprovalDialog] = useState(null)
  const [bulkDialog, setBulkDialog] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [detailsId, setDetailsId] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsError, setDetailsError] = useState('')
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState([])
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [highlightId, setHighlightId] = useState(null)
  const [processedRoll, setProcessedRoll] = useState('')
  const latestDetailsId = useRef(null)
  const pendingJump = useRef(null)
  const fetchSeq = useRef(0)

  const navigate = (to, options = {}) => {
    // Reset per-page searches and filters whenever a sidebar page is reopened.
    setSection(to)
    setMobileMenu(false)
    setFilters(freshFilters(to))
    setPage(0)
    setList(null)
    setListError('')
    setHistory(null)
    setHistoryError('')
    setSearchInput('')
    setSearchRoll('')
    setSearchResult(null)
    setSearchError('')
    setSelected([])
    setNotice(uncertain ? 'A previous decision result is unconfirmed. Select Retry Status Check before submitting another decision.' : '')
    setProcessedRoll('')
    setDetailsId(null)
    setDetails(null)
    setHighlightId(options.highlight ?? null)
    pendingJump.current = options.highlight ?? null
    if (to === 'overview') {
      setPeriod('all'); setGrouping('monthly'); setRange({ start: '', end: '' })
    }
  }
  const loadOverview = useCallback(async () => {
    if (period === 'custom' && (!range.start || !range.end)) return
    if (period === 'custom' && (range.start > range.end || range.end > todayIST())) {
      setOverviewError('Choose valid start and end dates that are not in the future.')
      return
    }
    setOverviewLoading(true)
    setOverviewError('')
    try { setOverview(await api('/staff/overview?' + params({ period, start: range.start, end: range.end, grouping }))) }
    catch (error) { setOverviewError(error.message) }
    finally { setOverviewLoading(false) }
  }, [period, range.start, range.end, grouping])

  const loadList = useCallback(async () => {
    const token = ++fetchSeq.current
    setListLoading(true)
    setListError('')
    try {
      const result = await api('/staff/requests?' + params({
        page, status: section === 'pending' ? 'PENDING' : filters.status,
        sort: filters.sort, roll: filters.roll, name: filters.name, branch: filters.branch,
      }))
      if (token !== fetchSeq.current) return
      setList(result)
      if (result.pages > 0 && page >= result.pages) setPage(result.pages - 1)
    } catch (error) {
      if (token === fetchSeq.current) setListError(error.message)
    } finally { if (token === fetchSeq.current) setListLoading(false) }
  }, [section, page, filters])
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try { setHistory(await api('/staff/history?' + params({ page }))) }
    catch (error) { setHistoryError(error.message) }
    finally { setHistoryLoading(false) }
  }, [page])
  const loadSearch = useCallback(async () => {
    if (searchRoll.trim().length < 3) { setSearchResult(null); return }
    setSearchLoading(true)
    setSearchError('')
    try { setSearchResult(await api('/staff/search?' + params({ roll: searchRoll.trim(), page }))) }
    catch (error) { setSearchError(error.message) }
    finally { setSearchLoading(false) }
  }, [searchRoll, page])

  useEffect(() => {
    if (section === 'overview') loadOverview()
    if (section === 'pending' || section === 'requests') loadList()
    if (section === 'history') loadHistory()
    if (section === 'search') loadSearch()
  }, [section, loadOverview, loadList, loadHistory, loadSearch])
  useEffect(() => {
    if (section !== 'search') return undefined
    const timer = setTimeout(() => { setPage(0); setSearchRoll(searchInput.trim()) }, 400)
    return () => clearTimeout(timer)
  }, [section, searchInput])
  useEffect(() => {
    // No special filters or forced first-page jump when opening preview items.
    if (section !== 'pending' || !pendingJump.current || !list?.items?.length) return
    const match = list.items.find((row) => String(row.id) === String(pendingJump.current))
    if (match) {
      setProcessedRoll('')
      setHighlightId(match.id)
      pendingJump.current = null
      const frame = requestAnimationFrame(() => document.getElementById(`staff-request-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      const timeout = setTimeout(() => setHighlightId(null), 4000)
      return () => { cancelAnimationFrame(frame); clearTimeout(timeout) }
    }
    // An Overview preview entry normally appears among the first five in the
    // oldest-first queue. When it disappears, confirm the latest backend status.
    const applicationId = pendingJump.current
    pendingJump.current = null
    let cancelled = false
    api(`/staff/requests/${applicationId}`).then((current) => {
      if (cancelled) return
      if (current.departmentStatus !== 'PENDING') {
        setNotice('This application has already been processed and is no longer pending.')
        setProcessedRoll(current.rollNumber || '')
      }
    }).catch(() => {
      // Leave the freshly loaded queue usable if the detail request fails.
    })
    return () => { cancelled = true }
  }, [section, list])

  const openDetails = async (id) => {
    latestDetailsId.current = id
    setDetailsId(id)
    setDetails(null)
    setDetailsError('')
    setDetailsLoading(true)
    try {
      const result = await api(`/staff/requests/${id}`)
      if (latestDetailsId.current === id) setDetails(result)
    } catch (error) {
      if (latestDetailsId.current === id) setDetailsError(error.message)
    } finally {
      if (latestDetailsId.current === id) setDetailsLoading(false)
    }
  }
  const closeDetails = () => { latestDetailsId.current = null; setDetailsId(null); setDetails(null) }
  const refreshCurrent = async () => {
    if (section === 'overview') await loadOverview()
    if (section === 'pending' || section === 'requests') await loadList()
    if (section === 'history') await loadHistory()
    if (section === 'search') await loadSearch()
  }
  const manualRefresh = () => { setSelected([]); if (!uncertain) setNotice(''); refreshCurrent() }
  const changeFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setSelected([]); setPage(0)
  }
  const startDecision = (item, approved) => {
    if (uncertain) {
      setNotice('Check the result of the previous decision before submitting another one.')
      return
    }
    setApprovalDialog({ item, approved }); setRemarks('')
  }
  const closeDecision = () => { if (!processing) { setApprovalDialog(null); setRemarks('') } }
  const networkAmbiguity = (error) => error instanceof TypeError || /network|fetch|timeout/i.test(error.message || '')
  const submitDecision = async () => {
    if (!approvalDialog || processing || uncertain || (!approvalDialog.approved && !remarks.trim())) return
    const { item, approved } = approvalDialog
    setProcessing(true); setProcessingIds([item.approvalId]); setNotice('')
    try {
      await api(`/staff/approvals/${item.approvalId}/${approved ? 'approve' : 'reject'}`, {
        method: 'PATCH', body: { remarks: remarks.trim() },
      })
      setApprovalDialog(null); setRemarks(''); closeDetails(); setSelected([])
      setNotice('Decision recorded successfully.')
      await refreshCurrent()
    } catch (error) {
      setNotice(error.message)
      if (networkAmbiguity(error)) setUncertain(true)
    } finally { setProcessing(false); setProcessingIds([]) }
  }
  const submitBulk = async () => {
    if (!selected.length || selected.length > 10 || processing || uncertain) return
    setProcessing(true); setProcessingIds([...selected]); setNotice('')
    try {
      await api('/staff/bulk-approve', { method: 'POST', body: { ids: selected, remarks: remarks.trim() } })
      setNotice(`${selected.length} applications approved successfully.`)
      setSelected([]); setBulkDialog(false); setRemarks('')
      await refreshCurrent()
    } catch (error) {
      setNotice(error.message)
      if (networkAmbiguity(error)) setUncertain(true)
    } finally { setProcessing(false); setProcessingIds([]) }
  }
  const toggleSelected = (id) => setSelected((current) => current.includes(id)
    ? current.filter((value) => value !== id)
    : current.length < 10 ? [...current, id] : current)
  const currentItems = list?.items || []
  const bulkStudents = currentItems.filter((row) => selected.includes(row.approvalId))
  const hasActiveFilter = Boolean(filters.roll || filters.name || filters.branch)
  const activeNav = NAV.find((item) => item.id === section) || NAV[0]
  const showOverviewPreview = (row) => navigate('pending', { highlight: row.id })
  const unresolvedResult = async () => {
    setUncertain(false); setNotice(''); setProcessedRoll(''); setApprovalDialog(null); setBulkDialog(false)
    setRemarks(''); setSelected([])
    await refreshCurrent()
    if (detailsId != null) await openDetails(detailsId)
  }

  return (
    <div className="staff-shell flex min-h-[calc(100vh-75px)] bg-[#f8f9fa]">
      <aside className={`staff-sidebar ${mobileMenu ? 'staff-sidebar-open' : ''} shrink-0`}>
        <div className="mb-7 mt-1 flex items-start justify-between gap-2 px-3">
          <div>
            <div className="flex items-center gap-2 text-slate-800"><ShieldCheck size={18} strokeWidth={1.8} /><h2 className="text-[14px] font-semibold">Department portal</h2></div>
            <p className="mt-2 pl-[26px] text-xs text-slate-500">{person?.code || 'Staff account'}</p>
          </div>
          <button type="button" className="btn btn-muted !min-h-9 !p-2 md:hidden" onClick={() => setMobileMenu(false)} aria-label="Close navigation"><X size={17} /></button>
        </div>
        <div className="px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400">Workspace</div>
        <nav className="mt-3" aria-label="Staff dashboard pages">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={`staff-nav-item ${section === id ? 'staff-nav-active' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="mx-3 mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-400">
          Shared department account. Decisions are recorded under <span className="font-semibold text-slate-600">{person?.code || 'this account'}</span>.
        </div>
      </aside>
      {mobileMenu && <button type="button" className="fixed inset-0 z-40 bg-slate-950/30 md:hidden" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
        <div className="mx-auto w-full max-w-[1250px]">
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 pb-6">
            <div className="flex items-center gap-3">
              <button type="button" className="btn btn-muted !min-h-10 !p-2 md:hidden" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={19} /></button>
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-400"><span>Department workspace</span><ChevronRight size={12} /> <span>{activeNav.label}</span></div>
                <h1 className="section-title">{activeNav.label}</h1>
                <p className="mt-1 text-[13px] text-slate-500">{person?.name || 'Department'} <span className="px-1 text-slate-300">/</span> {person?.code || 'Staff'}</p>
              </div>
            </div>
            <button type="button" className={mutedButton} onClick={manualRefresh} disabled={processing} title="Refresh current page"><RefreshCw size={16} /> Refresh</button>
          </header>

          {notice && (
            <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="min-w-0 flex-1 break-words">{notice}</p>
              {uncertain && <button type="button" className={mutedButton} onClick={unresolvedResult}>Retry Status Check</button>}
              {processedRoll && <button type="button" className={mutedButton} onClick={() => { navigate('requests'); setFilters({ ...freshFilters('requests'), roll: processedRoll }) }}>View in All Requests <ArrowRight size={14} /></button>}
            </div>
          )}

          {section === 'overview' && (
            <>
              <div className="mb-5 flex flex-wrap items-end gap-3">
                <Select label="Reporting period" className="min-w-[180px] flex-1 sm:max-w-[230px]" value={period} onChange={setPeriod} options={[
                  ['all', 'All Time'], ['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['custom', 'Custom Range'],
                ]} />
                {period === 'custom' && (
                  <>
                    <label className="min-w-[150px] flex-1 sm:max-w-[200px]"><span className="label">Start date</span><input type="date" className="field" value={range.start} max={todayIST()} onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))} /></label>
                    <label className="min-w-[150px] flex-1 sm:max-w-[200px]"><span className="label">End date</span><input type="date" className="field" value={range.end} max={todayIST()} onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))} /></label>
                  </>
                )}
              </div>
              <ErrorPanel error={overviewError} />
              {overviewError && <button type="button" className={mutedButton + ' mb-4'} onClick={loadOverview}>Retry overview</button>}
              {overviewLoading && !overview && <p className="py-8 text-sm text-slate-500">Loading department analytics…</p>}
              {overview && (
                <>
                  <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile label="Total requests" value={overview.total} icon={Files} hint="Submitted applications" />
                    <StatTile label="Pending" value={overview.pending} icon={Clock3} hint="Open pending queue →" clickable onClick={() => navigate('pending')} />
                    <StatTile label="Approved" value={overview.approved} icon={CheckCircle2} hint="Department approved" />
                    <StatTile label="Rejected" value={overview.rejected} icon={XCircle} hint="Department rejected" />
                  </div>
                  <div className="mb-5 grid gap-4 md:grid-cols-2">
                    <QuietPanel title="Approval rate" description="Approved ÷ (Approved + Rejected)">
                      <p className="mt-2 text-[29px] font-semibold tracking-[-.04em] tabular-nums text-slate-900">{overview.approvalRate == null ? 'N/A' : `${Number(overview.approvalRate).toFixed(1)}%`}</p>
                    </QuietPanel>
                    <QuietPanel title="Average processing time" description="Per completed decision cycle, including Admin reopenings">
                      <p className="mt-2 text-[24px] font-semibold tracking-[-.035em] text-slate-900">{avgTime(overview.averageMinutes)}</p>
                    </QuietPanel>
                  </div>
                  <QuietPanel className="mb-5" title="Approval & rejection trends" description="Historical decisions by event date · Asia/Kolkata" action={
                    <Select value={grouping} onChange={setGrouping} className="w-36" options={[
                      ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly'],
                    ]} />
                  }>
                    <TrendChart trend={overview.trend || []} grouping={overview.grouping || grouping} />
                  </QuietPanel>
                  <QuietPanel title="Oldest pending applications" description="The five longest-waiting requests · Not affected by reporting date filters" action={
                    <button type="button" className={textButton} onClick={() => navigate('pending')}>View All Pending <ArrowRight size={15} /></button>
                  }>
                    {overview.oldestPending?.length ? (
                      <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                        {overview.oldestPending.map((row) => (
                          <button type="button" key={row.id} className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50" onClick={() => showOverviewPreview(row)}>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-800">{row.studentName}</span>
                              <span className="tiny mt-1 block">{row.rollNumber} · {row.branch} · Submitted {formatDate(row.submittedAt, false)}</span>
                            </span>
                            <span className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} /> {pendingTime(row.submittedAt)} <ChevronRight size={14} className="ml-1" /></span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-5 text-center">
                        <CheckCircle2 size={28} className="mx-auto mb-3 text-[#719785]" />
                        <p className="text-sm font-semibold text-slate-800">All caught up! No pending applications.</p>
                        <button type="button" className={textButton + ' mt-3'} onClick={() => navigate('requests')}>View All Requests <ArrowRight size={14} /></button>
                      </div>
                    )}
                  </QuietPanel>
                </>
              )}
            </>
          )}

          {(section === 'pending' || section === 'requests') && (
            <>
              <QuietPanel className="mb-5" title="Find applications" description="Search only the requests visible to your department" action={<SlidersHorizontal size={18} className="text-slate-400" />}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label><span className="label">Roll number</span><input className="field" placeholder="Search roll number" value={filters.roll} onChange={(event) => changeFilter('roll', event.target.value)} /></label>
                  <label><span className="label">Student name</span><input className="field" placeholder="Search student name" value={filters.name} onChange={(event) => changeFilter('name', event.target.value)} /></label>
                  <label><span className="label">Branch</span><input className="field" placeholder="Search branch" value={filters.branch} onChange={(event) => changeFilter('branch', event.target.value)} /></label>
                  {section === 'requests' ? (
                    <Select label="Department status" value={filters.status} onChange={(value) => changeFilter('status', value)} options={[
                      ['', 'All statuses'], ['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'],
                    ]} />
                  ) : (
                    <Select label="Sort by" value={filters.sort} onChange={(value) => changeFilter('sort', value)} options={[
                      ['oldest', 'Oldest first'], ['newest', 'Newest first'], ['name', 'Student name A–Z'], ['roll', 'Roll number A–Z'],
                    ]} />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <button type="button" className={textButton} onClick={() => { setFilters(freshFilters(section)); setSelected([]); setPage(0) }}>Clear Filters</button>
                  {section === 'requests' && <Select value={filters.sort} onChange={(value) => changeFilter('sort', value)} className="w-[190px]" options={[
                    ['newest', 'Newest first'], ['oldest', 'Oldest first'], ['name', 'Student name A–Z'], ['roll', 'Roll number A–Z'],
                  ]} />}
                </div>
              </QuietPanel>
              <ErrorPanel error={listError} />
              {listError && <button type="button" className={mutedButton + ' mb-4'} onClick={loadList}>Retry requests</button>}
              {listLoading && !list && <p className="py-8 text-sm text-slate-500">Loading requests…</p>}
              {list && (
                <>
                  {section === 'pending' ? (
                    <>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700">{list.total} pending applications</p>
                        <p className="tiny">Select up to 10 applications on this page</p>
                      </div>
                      {currentItems.length > 0 ? (
                        <div className="space-y-3">
                          {currentItems.map((item) => (
                            <article id={`staff-request-${item.id}`} key={item.id} className={`card p-4 transition-colors sm:p-5 ${String(highlightId) === String(item.id) ? '!border-slate-400 bg-slate-50 ring-2 ring-slate-200' : ''}`}>
                              <div className="flex gap-3 sm:gap-4">
                                <label className="mt-1 shrink-0" title={`Select ${item.rollNumber}`}>
                                  <input type="checkbox" className="h-4 w-4" aria-label={`Select ${item.rollNumber}`} checked={selected.includes(item.approvalId)}
                                    disabled={processingIds.includes(item.approvalId) || (!selected.includes(item.approvalId) && selected.length >= 10)}
                                    onChange={() => toggleSelected(item.approvalId)} />
                                </label>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0"><h3 className="break-words text-[15px] font-semibold text-slate-900">{item.studentName}</h3><p className="tiny mt-1">{item.rollNumber} · {item.branch}</p></div>
                                    <Status value={item.departmentStatus} />
                                  </div>
                                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-slate-500">
                                    <span>Submitted {formatDate(item.submittedAt)}</span><span>{pendingTime(item.submittedAt)} pending</span>
                                  </div>
                                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                    <button type="button" className={mutedButton} onClick={() => openDetails(item.id)}>View Details</button>
                                    <button type="button" className={mainButton} disabled={processingIds.includes(item.approvalId)} onClick={() => startDecision(item, true)}><Check size={15} /> Approve</button>
                                    <button type="button" className="btn btn-danger" disabled={processingIds.includes(item.approvalId)} onClick={() => startDecision(item, false)}><XCircle size={15} /> Reject</button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <QuietPanel className="text-center">
                          <CheckCircle2 size={30} className="mx-auto mb-3 text-[#719785]" />
                          <h3 className="text-sm font-semibold text-slate-800">{hasActiveFilter ? 'No pending applications match your selected filters.' : 'No pending applications at the moment.'}</h3>
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {hasActiveFilter && <button type="button" className={mutedButton} onClick={() => { setFilters(freshFilters('pending')); setPage(0) }}>Clear Filters</button>}
                            <button type="button" className={mutedButton} onClick={() => navigate('requests')}>View All Requests <ArrowRight size={14} /></button>
                          </div>
                        </QuietPanel>
                      )}
                      {selected.length > 0 && (
                        <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-[0_7px_30px_rgba(31,41,55,.09)]">
                          <span className="text-sm font-semibold text-slate-800">{selected.length} selected</span>
                          <div className="flex gap-2">
                            <button type="button" className={mutedButton} onClick={() => setSelected([])}>Clear</button>
                            <button type="button" className={mainButton} disabled={processing || uncertain} onClick={() => { setRemarks(''); setBulkDialog(true) }}><CheckCheck size={15} /> Approve Selected</button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <QuietPanel title="Submitted applications" description={`${list.total} department-visible records`}>
                      <div className="table-wrap">
                        <table className="min-w-[830px]"><thead><tr>{['Roll Number', 'Student Name', 'Branch', 'Submitted', 'Department Status', 'Decision Date', ''].map((label) => <th key={label}>{label}</th>)}</tr></thead>
                          <tbody>{currentItems.map((item) => <tr key={item.id}>
                            <td className="font-semibold text-slate-800">{item.rollNumber}</td><td>{item.studentName}</td><td>{item.branch}</td><td>{formatDate(item.submittedAt)}</td>
                            <td><Status value={item.departmentStatus} /></td><td>{formatDate(item.decisionAt)}</td>
                            <td><button type="button" className={mutedButton} onClick={() => openDetails(item.id)}>View Details</button></td>
                          </tr>)}</tbody>
                        </table>
                      </div>
                      {!currentItems.length && <Empty message="No applications match the selected filters." />}
                    </QuietPanel>
                  )}
                  <PageControls data={list} onPage={(next) => { setPage(next); setSelected([]) }} />
                </>
              )}
            </>
          )}

          {section === 'history' && (
            <>
              <ErrorPanel error={historyError} />
              {historyError && <button type="button" className={mutedButton + ' mb-4'} onClick={loadHistory}>Retry history</button>}
              {historyLoading && !history && <p className="py-8 text-sm text-slate-500">Loading department decisions…</p>}
              {history && (
                <QuietPanel title="Decision timeline" description="Past decisions recorded under your shared department account">
                  <div className="table-wrap"><table className="min-w-[780px]"><thead><tr>{['Roll Number', 'Student', 'Decision', 'Account', 'Timestamp', 'Remarks'].map((label) => <th key={label}>{label}</th>)}</tr></thead>
                    <tbody>{history.items.map((event) => (
                      <tr tabIndex={0} role="button" aria-label={`View ${event.rollNumber} details`} key={event.id} className="cursor-pointer" onClick={() => openDetails(event.applicationId)} onKeyDown={(e) => { if (e.key === 'Enter') openDetails(event.applicationId) }}>
                        <td className="font-semibold text-slate-800">{event.rollNumber}</td><td>{event.studentName}</td><td><Status value={event.decision} /></td><td>{event.account}</td><td>{formatDate(event.timestamp)}</td><td className="max-w-[250px] break-words">{event.remarks || '—'}</td>
                      </tr>
                    ))}</tbody></table></div>
                  {!history.items.length && <Empty message="No decisions have been recorded by this department yet." />}
                  <PageControls data={history} onPage={setPage} />
                </QuietPanel>
              )}
            </>
          )}

          {section === 'search' && (
            <>
              <QuietPanel className="mb-5" title="Find a student" description="Search submitted No Dues applications using a full or partial roll number">
                <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (searchInput.trim().length >= 3) { setPage(0); setSearchRoll(searchInput.trim()) } }}>
                  <label className="min-w-[180px] flex-1"><span className="label">Roll number</span><input className="field" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Enter at least 3 characters" /></label>
                  <button type="submit" className={mainButton} disabled={searchInput.trim().length < 3}><Search size={16} /> Search</button>
                </form>
                <p className="tiny mt-3">Case-insensitive · Only submitted No Dues applications · Department-scoped</p>
              </QuietPanel>
              {searchInput.trim().length < 3 ? (
                <QuietPanel><Empty message="Enter at least 3 characters to search students." /></QuietPanel>
              ) : (
                <>
                  <ErrorPanel error={searchError} />
                  {searchError && <button type="button" className={mutedButton + ' mb-4'} onClick={loadSearch}>Retry search</button>}
                  {searchLoading && !searchResult && <p className="py-7 text-sm text-slate-500">Searching applications…</p>}
                  {searchResult && (
                    <QuietPanel title="Search results" description={`${searchResult.total} matching applications`}>
                      <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                        {searchResult.items.map((item) => (
                          <button key={item.id} type="button" className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50" onClick={() => openDetails(item.id)}>
                            <div><span className="text-sm font-semibold text-slate-800">{item.studentName}</span><p className="tiny mt-1">{item.rollNumber} · {item.branch}</p></div>
                            <div className="flex items-center gap-3"><Status value={item.departmentStatus} /><ChevronRight size={16} className="text-slate-400" /></div>
                          </button>
                        ))}
                      </div>
                      {!searchResult.items.length && <Empty message="No matching No Dues applications found." />}
                      <PageControls data={searchResult} onPage={setPage} />
                    </QuietPanel>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {detailsId !== null && <DetailDrawer data={details} loading={detailsLoading} error={detailsError} busyIds={processingIds} onClose={closeDetails} onDecision={startDecision} />}
      {approvalDialog && (
        <Dialog title={`Confirm ${approvalDialog.approved ? 'approval' : 'rejection'}`} onClose={closeDecision} footer={
          <>
            <button type="button" className={mutedButton} disabled={processing} onClick={closeDecision}>Cancel</button>
            <button type="button" className={approvalDialog.approved ? mainButton : 'btn btn-danger'} disabled={processing || uncertain || (!approvalDialog.approved && !remarks.trim())} onClick={submitDecision}>
              {processing && <LoaderCircle className="animate-spin" size={16} />} Confirm {approvalDialog.approved ? 'Approval' : 'Rejection'}
            </button>
          </>
        }>
          <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{approvalDialog.item.studentName}</p>
            <p className="tiny mt-1">{approvalDialog.item.rollNumber}</p>
          </div>
          <label><span className="label">{approvalDialog.approved ? 'Approval remark (optional)' : 'Rejection reason (required)'}</span>
            <textarea className="field" rows={4} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder={approvalDialog.approved ? 'Add an optional remark' : 'Describe the unresolved department dues'} />
          </label>
        </Dialog>
      )}
      {bulkDialog && (
        <Dialog title="Confirm bulk approval" onClose={() => { if (!processing) { setBulkDialog(false); setRemarks('') } }} footer={
          <>
            <button type="button" className={mutedButton} disabled={processing} onClick={() => { setBulkDialog(false); setRemarks('') }}>Cancel</button>
            <button type="button" className={mainButton} disabled={processing || uncertain || !selected.length} onClick={submitBulk}>
              {processing && <LoaderCircle className="animate-spin" size={16} />} Approve all {selected.length} selected
            </button>
          </>
        }>
          <p className="mb-4 text-sm font-medium text-slate-700">{selected.length} selected applications (maximum 10)</p>
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
            {bulkStudents.map((row) => <div key={row.id} className="flex flex-wrap gap-2 text-sm text-slate-700"><strong className="text-slate-900">{row.rollNumber}</strong><span>· {row.studentName}</span></div>)}
          </div>
          <label className="mt-5 block"><span className="label">Common approval remark (optional)</span>
            <textarea className="field" rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </label>
          <p className="tiny mt-3">All-or-nothing: if any selected application is no longer eligible, none will be approved.</p>
        </Dialog>
      )}
    </div>
  )
}
