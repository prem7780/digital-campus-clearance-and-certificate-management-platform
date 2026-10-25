import React, { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { api } from './api'
import { BusyButton, ErrorPanel, Field, Page, Status, TopBar } from './components'
import Student from './Student'
import Staff from './Staff'
import Principal from './Principal'
import Admin from './Admin'

/*
 * DCCMP / App.jsx — quiet, accessible portal shell.
 * FRONTEND ONLY. No route, API payload, auth rule or backend changes.
 * Works with the previously supplied index.css and components.jsx.
 */

const workflow = [
  { number: '01', title: 'Verify student identity', detail: 'Use your official college email and OTP.' },
  { number: '02', title: 'Complete the required forms', detail: 'Submit Alumni Registration, then No Dues.' },
  { number: '03', title: 'Department clearance', detail: 'All 17 departments review requests in parallel.' },
  { number: '04', title: 'Principal approval', detail: 'The final approved document becomes available.' },
  { number: '05', title: 'Certificate collection', detail: 'Admin verifies documents before handover.' },
]

function SectionEyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {children}
    </span>
  )
}

function PortalCard({ to, Icon, tag, title, description, cta }) {
  return (
    <Link
      to={to}
      className="group card flex min-h-[230px] flex-col justify-between gap-8 p-6 text-inherit no-underline transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:!border-slate-300 hover:shadow-[0_12px_34px_rgba(25,42,58,0.055)] sm:p-7"
    >
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
            {tag}
          </span>
        </div>
        <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
        {cta} <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
      </span>
    </Link>
  )
}

function Landing() {
  return (
    <div className="campus-public-page min-h-screen">
      <TopBar />
      <main>
        <section className="campus-hero border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14 lg:px-10 lg:py-20">
            <div className="min-w-0">
              <p className="campus-eyebrow">Student services / Academic clearance</p>
              <h1 className="campus-hero-title mt-4 max-w-2xl text-slate-900">
                Digital Campus Clearance &amp; Certificate Management
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                Submit your No Dues application, track departmental approvals and complete
                certificate clearance through the college portal.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/student" className="btn btn-primary">Student Portal <ArrowRight size={16} /></Link>
                <Link to="/employee" className="btn btn-muted !bg-white">Employee Login</Link>
              </div>
            </div>
            <div className="campus-workflow card p-5 sm:p-6">
              <h2 className="text-[16px] font-semibold text-slate-900">Clearance process</h2>
              <p className="mt-1 text-xs text-slate-500">Follow each stage from registration to certificate collection.</p>
              <ol className="mt-5 space-y-0">
                {workflow.map((step, index) => (
                  <li key={step.number} className="flex gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
                    <span className="campus-stage-number">{step.number}</span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[13px] font-semibold text-slate-800">{step.title}</strong>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10" aria-labelledby="services-heading">
          <div className="mb-5">
            <h2 id="services-heading" className="text-xl font-semibold text-slate-900">Available services</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the workspace relevant to your role.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/student" className="campus-service-card card block p-5 no-underline sm:p-6">
              <h3 className="text-[15px] font-semibold text-slate-900">For students</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Alumni Registration, No Dues applications, approval tracking and final clearance documents.</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#344e67]">Open student portal <ArrowRight size={14} /></span>
            </Link>
            <Link to="/employee" className="campus-service-card card block p-5 no-underline sm:p-6">
              <h3 className="text-[15px] font-semibold text-slate-900">For college staff</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Department approvals, Principal review, reports and administrative management.</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#344e67]">Open employee portal <ArrowRight size={14} /></span>
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-xs text-slate-500">
        Usharama College of Engineering and Technology · Digital Campus Clearance Portal
      </footer>
    </div>
  )
}

function EmployeeLogin({ onLogin, sessionMessage }) {
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaNeeded, setCaptchaNeeded] = useState(false)
  const [captchaNonce, setCaptchaNonce] = useState(0)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const person = await api('/auth/login', {
        method: 'POST',
        body: { code: code.trim(), password, captcha },
      })
      setPassword('')
      setCaptcha('')
      onLogin(person)
    } catch (failure) {
      const message = failure.message || 'Sign in failed. Please try again.'
      if (message.includes('CAPTCHA_REQUIRED')) {
        setCaptchaNeeded(true)
        setError(message.replace(/^CAPTCHA_REQUIRED\s*:\s*/i, ''))
      } else {
        setError(message)
      }
      // The backend CAPTCHA is single-use. Refresh it after each failed attempt
      // once CAPTCHA has been requested; never silently resubmit credentials.
      if (captchaNeeded || message.includes('CAPTCHA_REQUIRED')) {
        setCaptcha('')
        setCaptchaNonce((previous) => previous + 1)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="campus-public-page min-h-screen">
      <TopBar />
      <main className="mx-auto grid min-h-[calc(100vh-78px)] max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20 lg:px-10 lg:py-20">
        <div className="max-w-lg">
          <SectionEyebrow>Employee access</SectionEyebrow>
          <h1 className="mt-5 text-[clamp(2rem,3.6vw,2.8rem)] font-bold leading-[1.14] tracking-[-0.05em] text-slate-900">
            Your workspace.
            <span className="block text-slate-500">One secure sign in.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-600">
            Authorized department staff, the Principal, and Admin use this portal.
            Your dashboard opens automatically according to your account role.
          </p>
          <div className="mt-9 space-y-4 border-t border-slate-200 pt-7">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"><LockKeyhole size={18} /></span>
              <div><p className="text-sm font-semibold text-slate-800">Role-based permissions</p><p className="mt-1 text-xs leading-6 text-slate-500">See only the information and actions assigned to your account.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"><BadgeCheck size={18} /></span>
              <div><p className="text-sm font-semibold text-slate-800">Verified decisions</p><p className="mt-1 text-xs leading-6 text-slate-500">Clearance approvals and rejections are preserved in the audit history.</p></div>
            </div>
          </div>
          <Link to="/student" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline">
            Looking for the student portal? <ArrowRight size={16} />
          </Link>
        </div>

        <div className="card mx-auto w-full max-w-[510px] p-6 sm:p-9 lg:p-10">
          <div className="mb-7">
            <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
              <KeyRound size={21} strokeWidth={1.8} />
            </span>
            <h2 className="text-[25px] font-bold tracking-[-0.04em] text-slate-900">Employee sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Enter your assigned staff code and password.</p>
          </div>
          <ErrorPanel error={error || sessionMessage} />
          <form className="space-y-5" onSubmit={submit}>
            <Field
              label="Staff code / Employee ID"
              value={code}
              autoComplete="username"
              placeholder="e.g. HOD_CSE"
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {captchaNeeded && (
              <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.075em] text-slate-600">Security verification</p>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <img
                    alt="Security CAPTCHA: enter the six characters shown"
                    width="205"
                    height="70"
                    className="max-w-full rounded-lg border border-slate-200 bg-white"
                    src={`/api/auth/captcha?refresh=${captchaNonce}`}
                  />
                  <button
                    type="button"
                    className="btn btn-muted"
                    onClick={() => { setCaptcha(''); setCaptchaNonce((previous) => previous + 1) }}
                  >
                    <RefreshCw size={15} /> Refresh code
                  </button>
                </div>
                <Field
                  label="Characters from image (case insensitive)"
                  value={captcha}
                  onChange={(event) => setCaptcha(event.target.value)}
                  maxLength={6}
                  autoComplete="off"
                  required
                />
              </div>
            )}
            <BusyButton type="submit" busy={busy} className="w-full !py-3">
              Sign in securely <ArrowRight size={17} aria-hidden="true" />
            </BusyButton>
          </form>
          <div className="mt-7 border-t border-slate-100 pt-5 text-xs leading-6 text-slate-500">
            <ShieldCheck className="mr-2 inline-block align-[-3px]" size={16} />
            Don't share your password. Contact your DCCMP administrator for account assistance.
          </div>
        </div>
      </main>
    </div>
  )
}

function EmployeePortal({ person, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' })
  const [settingsError, setSettingsError] = useState('')
  const [working, setWorking] = useState(false)
  const settingsRef = useRef(null)

  useEffect(() => {
    let last = 0
    const touch = () => {
      const now = Date.now()
      if (now - last < 30_000) return
      last = now
      api('/auth/touch', { method: 'POST', userActivity: true }).catch(() => {})
    }
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((eventName) => window.addEventListener(eventName, touch, { passive: true }))
    return () => events.forEach((eventName) => window.removeEventListener(eventName, touch))
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    const onClick = (event) => {
      if (!settingsRef.current?.contains(event.target)) setProfileOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('pointerdown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])

  async function changePassword(event) {
    event.preventDefault()
    if (working) return
    setWorking(true)
    setSettingsError('')
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: password,
        userActivity: true,
      })
      setPassword({ currentPassword: '', newPassword: '' })
      await onLogout() // Existing backend ends the session after changing a password.
    } catch (failure) {
      setSettingsError(failure.message || 'Unable to change password.')
    } finally {
      setWorking(false)
    }
  }

  const roleLabel = person.role === 'PRINCIPAL' ? 'Principal Dashboard' : person.role === 'ADMIN' ? 'Admin Dashboard' : 'Department Dashboard'

  return (
    <div className="campus-public-page min-h-screen">
      <TopBar person={person} onLogout={onLogout} />
      <div className="campus-accountbar relative z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[56px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-9">
          <div className="min-w-0">
            <span className="block truncate text-xs font-semibold text-slate-700">{roleLabel}</span>
            <span className="block truncate text-[11px] text-slate-500">Signed in as {person.code}</span>
          </div>
          <div ref={settingsRef} className="relative shrink-0">
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={profileOpen}
              onClick={() => { setSettingsError(''); setProfileOpen((open) => !open) }}
              className="btn btn-muted !min-h-9 !gap-2 !px-3"
            >
              <KeyRound size={15} /> Account settings <ChevronDown size={14} />
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-[min(330px,calc(100vw-30px))] rounded-md border border-slate-200 bg-white p-5 shadow-lg"
                aria-label="Account settings"
              >
                <div className="mb-4 flex items-start justify-between gap-2 border-b border-slate-100 pb-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Account settings</h3>
                    <p className="tiny mt-1 truncate">{person.code} · {person.role}</p>
                  </div>
                  <button type="button" onClick={() => setProfileOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close account settings"><X size={17} /></button>
                </div>
                <p className="mb-3 text-xs font-semibold text-slate-700">Change password</p>
                <ErrorPanel error={settingsError} />
                <form className="space-y-3" onSubmit={changePassword}>
                  <label className="block text-xs font-medium text-slate-600">
                    Current password
                    <input className="field mt-1.5" type="password" autoComplete="current-password" required value={password.currentPassword} onChange={(event) => setPassword((value) => ({ ...value, currentPassword: event.target.value }))} />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    New password
                    <input className="field mt-1.5" type="password" autoComplete="new-password" minLength={8} required value={password.newPassword} onChange={(event) => setPassword((value) => ({ ...value, newPassword: event.target.value }))} />
                  </label>
                  <p className="text-[11px] leading-5 text-slate-500">At least 8 characters, including a letter and a number. Changing your password signs you out.</p>
                  <BusyButton type="submit" busy={working} className="w-full">Update password</BusyButton>
                </form>
                <button type="button" className="btn btn-muted mt-3 w-full" onClick={onLogout}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {person.role === 'ADMIN' ? <Admin /> : person.role === 'PRINCIPAL' ? <Principal /> : <Staff person={person} />}
    </div>
  )
}

function Verify() {
  const token = useLocation().pathname.split('/').at(-1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setData(null)
    api(`/public/verify/${encodeURIComponent(token)}`)
      .then((result) => { if (active) setData(result) })
      .catch((failure) => { if (active) setError(failure.message || 'Verification failed.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  return (
    <div className="campus-public-page min-h-screen">
      <TopBar />
      <main className="mx-auto w-full max-w-xl px-5 py-14 sm:py-20">
        <div className="card px-6 py-9 text-center sm:px-10 sm:py-12">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600"><MailCheck size={26} /></span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">No Dues form verification</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Check the authenticity and status of an issued DCCMP clearance document.</p>
          <div className="mt-6 text-left"><ErrorPanel error={error} /></div>
          {loading && <p className="mt-5 text-sm text-slate-500" role="status">Checking verification ID…</p>}
          {!loading && data && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-6">
              <Status value={data.valid ? 'APPROVED' : 'REJECTED'} />
              <p className="mt-4 text-sm leading-6 text-slate-700">
                {data.valid ? 'This document was issued by DCCMP.' : 'Verification failed or the document has been revoked.'}
              </p>
              {data.valid && (
                <div className="mt-5 space-y-2 border-t border-slate-200 pt-5 text-left text-xs leading-6 text-slate-600">
                  {data.issuedAt && <p><strong className="text-slate-700">Issued:</strong> {new Date(data.issuedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST</p>}
                  <p><strong className="text-slate-700">Original certificate collection:</strong> {String(data.collectionStatus || 'NOT_COLLECTED').replaceAll('_', ' ')}</p>
                  {data.verificationId && <p className="break-all"><strong className="text-slate-700">Verification ID:</strong> {data.verificationId}</p>}
                </div>
              )}
            </div>
          )}
          <Link to="/" className="btn btn-muted mt-7">Return to home <ArrowRight size={15} /></Link>
        </div>
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <div className="campus-public-page min-h-screen">
      <TopBar />
      <Page title="Page not found" subtitle="The address you entered doesn't match an available DCCMP page.">
        <Link to="/" className="btn btn-primary">Go home <ArrowRight size={16} /></Link>
      </Page>
    </div>
  )
}

export default function App() {
  const [person, setPerson] = useState(null)
  const [sessionMessage, setSessionMessage] = useState('')
  const location = useLocation()

  useEffect(() => {
    let active = true
    api('/auth/me')
      .then((result) => { if (active) setPerson(result) })
      .catch(() => { if (active) setPerson(null) })
    return () => { active = false }
  }, [])

  // Navigating back to /employee after using /student may have changed the
  // authenticated server session. Recheck the account instead of displaying
  // a stale employee dashboard (the backend is the source of truth).
  useEffect(() => {
    if (location.pathname !== '/employee') return
    let active = true
    api('/auth/me')
      .then((result) => { if (active) setPerson(result) })
      .catch(() => { if (active) setPerson(null) })
    return () => { active = false }
  }, [location.pathname])

  useEffect(() => {
    const expired = (event) => {
      setPerson(null)
      setSessionMessage(event.detail || 'Your employee session has ended. Please sign in again.')
    }
    window.addEventListener('dccmp-session-expired', expired)
    return () => window.removeEventListener('dccmp-session-expired', expired)
  }, [])

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // The password-change endpoint may have already invalidated the session.
    } finally {
      setPerson(null)
      setSessionMessage('')
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/student" element={<Student />} />
      <Route
        path="/employee"
        element={
          person ? (
            <EmployeePortal person={person} onLogout={logout} />
          ) : (
            <EmployeeLogin
              sessionMessage={sessionMessage}
              onLogin={(result) => { setSessionMessage(''); setPerson(result) }}
            />
          )
        }
      />
      <Route path="/verify/:token" element={<Verify />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
