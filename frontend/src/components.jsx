import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { CircleAlert, FileCheck2, LogOut } from 'lucide-react'

/**
 * DCCMP shared frontend components.
 * Drop-in replacement: keeps the existing exports, props, routes and actions.
 * No backend, endpoint, authentication or approval logic is changed here.
 */

// The same three destination links appear on every public portal.
// Active navigation is the only blue-tinted header element.
const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/student', label: 'Student Portal' },
  { to: '/employee', label: 'Employee Portal' },
]

function PortalNavigation({ compact = false }) {
  return (
    <nav aria-label="Portal navigation" className={compact
      ? 'flex min-w-0 items-center gap-1 overflow-x-auto py-1'
      : 'flex items-center gap-1'}>
      {navItems.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `campus-top-link ${isActive ? 'campus-top-active' : ''}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Brand({ dark = false }) {
  return (
    <Link to="/" aria-label="DCCMP — Home" className="campus-brand no-underline">
      <span className="campus-brand-mark" aria-hidden="true">UC</span>
      <span className="min-w-0">
        <span className="campus-brand-name">Usharama College of Engineering and Technology</span>
        <span className="campus-brand-subtitle">Digital Campus Clearance Portal</span>
      </span>
    </Link>
  )
}

export function TopBar({ person, onLogout }) {
  return (
    <header className="campus-topbar relative z-20 bg-white">
      <div className="campus-topbar-inner mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-9">
        <Brand />
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <PortalNavigation />
        </div>
        {person && !person.role && (
          <span className="hidden truncate text-xs text-slate-500 xl:block">
            {person.name || person.rollNumber || 'Student'}
          </span>
        )}
        {onLogout && (
          <button type="button" className="btn btn-muted !min-h-9 !px-3" title="Sign out" aria-label="Sign out" onClick={onLogout}>
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}
      </div>
      <div className="border-t border-slate-100 px-3 sm:px-6 lg:hidden">
        <PortalNavigation compact />
      </div>
    </header>
  )
}

export function Page({ title, subtitle, children, action }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-9">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="section-title">{title}</h1>
          {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      {children}
    </main>
  )
}

export function Field({ label, wide = false, className = '', id, type, ...props }) {
  const inputId = React.useId()
  const actualId = id || inputId
  const controlClass = `field ${type === 'textarea' ? 'min-h-24' : ''} ${className}`.trim()
  return (
    <label htmlFor={actualId} className={`block min-w-0 ${wide ? 'md:col-span-2' : ''}`}>
      {label && <span className="label">{label}</span>}
      {type === 'textarea' ? (
        <textarea id={actualId} className={controlClass} {...props} />
      ) : (
        <input id={actualId} type={type || 'text'} className={controlClass} {...props} />
      )}
    </label>
  )
}

export function SelectField({ label, children, className = '', id, ...props }) {
  const inputId = React.useId()
  const actualId = id || inputId
  return (
    <label htmlFor={actualId} className="block min-w-0">
      {label && <span className="label">{label}</span>}
      <select id={actualId} className={`field ${className}`.trim()} {...props}>
        {children}
      </select>
    </label>
  )
}

export function Status({ value }) {
  const status = String(value || 'PENDING').trim().toUpperCase().replace(/\s+/g, '_')
  return (
    <span className={`pill status-${status}`} title={status.replaceAll('_', ' ')}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export function BusyButton({ busy = false, disabled = false, children, className = '', ...props }) {
  return (
    <button
      className={`btn btn-primary ${className}`.trim()}
      disabled={Boolean(busy || disabled)}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? 'Processing…' : children}
    </button>
  )
}

export function ErrorPanel({ error }) {
  if (!error) return null
  return (
    <div role="alert" className="mb-5 flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50/70 px-4 py-3.5 text-sm leading-6 text-rose-800">
      <CircleAlert size={18} className="mt-0.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 break-words">{error}</span>
    </div>
  )
}

export function Empty({ message = 'No records found' }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
        <FileCheck2 size={23} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <p className="max-w-md text-sm font-medium leading-6 text-slate-500">{message}</p>
    </div>
  )
}

export function Progress({ approved = 0, total = 17 }) {
  const safeTotal = Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : 17
  const safeApproved = Math.max(0, Number(approved) || 0)
  const percent = Math.max(0, Math.min(100, (safeApproved / safeTotal) * 100))
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Department clearance</span>
        <strong className="font-semibold tabular-nums text-slate-700">
          {safeApproved}/{safeTotal} approved
        </strong>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Department clearance progress"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={Math.min(safeTotal, safeApproved)}
      >
        <div
          className="h-full rounded-full bg-[#748d80] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function AppCard({ item, children }) {
  const approvals = Array.isArray(item?.approvals) ? item.approvals : []
  const approved = approvals.filter((approval) => approval.status === 'APPROVED').length
  return (
    <article className="card mb-5 p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold tracking-tight text-slate-900">
            {item?.studentName || 'Student application'}
          </h2>
          <p className="tiny mt-1 break-words">
            {[item?.rollNumber, item?.branch, item?.id != null ? `#${item.id}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <Status value={item?.status} />
      </div>
      <Progress approved={approved} />
      {children}
    </article>
  )
}

// Original physical certificate handover checklist — keys must stay unchanged.
export const CHECKS = [
  ['printed_form', 'Printed approved No Dues form'],
  ['student_identity', 'Student identity confirmed'],
  ['student_id_or_receipt', 'Original Student ID / lost-ID receipt'],
  ['deposit_receipt_or_affidavit', 'Original deposit receipt / affidavit'],
  ['semester_marks', 'All semester mark-sheet photocopies'],
  ['photograph', 'Physical student photograph'],
]
