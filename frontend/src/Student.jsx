import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  Info,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { api, downloadPdf } from './api'
import {
  BusyButton,
  Empty,
  ErrorPanel,
  Field,
  Page,
  Progress,
  Status,
  TopBar,
} from './components'

/*
 * DCCMP Student portal — visual/UI replacement only.
 * Preserves the existing API paths, request bodies, login, registration,
 * 17-department clearance, approval tracking and PDF download flow.
 * No backend modifications are required.
 */

const createAlumniForm = () => ({
  name: '', fatherName: '', yearOfStudy: '', branch: '', address: '',
  mobile: '', hobbies: '', academicAchievements: '', awards: '',
  placementDetails: '', jobDetails: '', futurePlans: '',
  friends: Array.from({ length: 5 }, () => ({ name: '', phone: '' })),
})

const createNoDuesForm = () => ({
  studentName: '', branch: '', address: '', phone: '', declaration: false,
})

const ALUMNI_FIELDS = [
  { key: 'name', label: 'Student name', required: true },
  { key: 'fatherName', label: "Father's name", required: true },
  { key: 'yearOfStudy', label: 'Year of study', required: true },
  { key: 'branch', label: 'Course and branch', required: true },
  { key: 'mobile', label: 'Mobile number', required: true, type: 'tel' },
  { key: 'address', label: 'Permanent address', required: true, wide: true },
  { key: 'hobbies', label: 'Hobbies' },
  { key: 'academicAchievements', label: 'Academic achievements (GRE / TOEFL / GATE / IES)', wide: true },
  { key: 'awards', label: 'Awards achieved' },
  { key: 'placementDetails', label: 'Placement details', wide: true },
  { key: 'jobDetails', label: 'Job details and address', wide: true },
  { key: 'futurePlans', label: 'Future plans', wide: true },
]

const noDuesFields = [
  { key: 'studentName', label: 'Student name' },
  { key: 'branch', label: 'Department / branch' },
  { key: 'address', label: 'Communication address', wide: true },
  { key: 'phone', label: 'Mobile number', type: 'tel' },
]

function isoIstDate(value) {
  if (!value) return null
  const raw = String(value)
  // Spring Boot LocalDateTime values represent IST wall-clock time in this project.
  // Attach the timezone explicitly so devices outside India show the same instant.
  const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(raw)
  const date = new Date(localDateTime ? `${raw}+05:30` : raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatIst(value) {
  const date = isoIstDate(value)
  if (!date) return 'Not available'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).formatToParts(date)
  const part = (type) => parts.find((p) => p.type === type)?.value || ''
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${part('dayPeriod').toUpperCase()} IST`
}

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {children}
    </span>
  )
}

function SectionHeading({ icon: Icon, title, description, aside }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
        </div>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

function Notice({ children }) {
  if (!children) return null
  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-3.5 text-sm leading-6 text-emerald-800">
      <CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

function StepCard({ number, title, subtitle, state, active }) {
  const done = state === 'done'
  return (
    <div className={`card relative min-w-0 p-5 sm:p-6 ${active ? '!border-slate-300' : ''}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-xl border text-xs font-bold ${done ? 'border-[#dcebe0] bg-[#ebf4ee] text-[#4c7d5d]' : active ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
          {done ? <Check size={17} aria-hidden="true" /> : number}
        </span>
        <span className={`text-[11px] font-semibold ${done ? 'text-emerald-700' : active ? 'text-slate-700' : 'text-slate-400'}`}>
          {done ? 'Completed' : active ? 'Current step' : 'Upcoming'}
        </span>
      </div>
      <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{subtitle}</p>
    </div>
  )
}

function StudentLogin({ roll, email, otp, step, busy, error, info, setOtp, onRollChange, onEmailChange, onSend, onVerify, onBack }) {
  return (
    <>
      <TopBar />
      <main className="min-h-[calc(100vh-76px)] bg-[#f8f9fa]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.94fr] lg:items-center lg:gap-20 lg:px-10 lg:py-24">
          <section className="min-w-0 py-2" aria-labelledby="student-login-heading">
            <Eyebrow>Student portal</Eyebrow>
            <h1 id="student-login-heading" className="mt-6 max-w-xl text-[clamp(2rem,3.6vw,2.8rem)] font-bold leading-[1.12] tracking-[-0.055em] text-slate-900">
              One clear path to <span className="text-slate-500">campus clearance.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-8 text-slate-600">
              Verify your college email, complete Alumni Registration and No Dues,
              and follow your application through all 17 departments.
            </p>
            <div className="mt-9 max-w-lg divide-y divide-slate-100 rounded-md border border-slate-200 bg-white px-5 sm:px-6">
              {[
                { Icon: Mail, title: 'Secure OTP verification', detail: 'Sign in with your roll number and college email.' },
                { Icon: ClipboardCheck, title: 'Guided applications', detail: 'Complete both required forms in the right order.' },
                { Icon: FileCheck2, title: 'Transparent progress', detail: 'View department decisions and your approved document.' },
              ].map(({ Icon, title, detail }) => (
                <div key={title} className="flex gap-3 py-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-7 text-xs text-slate-500">
              Looking for staff or Principal access?{' '}
              <Link to="/employee" className="inline-flex items-center gap-1 font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">
                Employee portal <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </p>
          </section>

          <section className="min-w-0" aria-label="Student identity verification">
            <div className="card mx-auto w-full max-w-[480px] p-6 sm:p-8 lg:p-9">
              <div className="mb-6 flex items-center justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                  <LockKeyhole size={21} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">Secure access</span>
              </div>
              <h2 className="text-[24px] font-bold tracking-[-0.04em] text-slate-900">
                {step === 'send' ? 'Student sign in' : 'Verify your email'}
              </h2>
              <p className="mt-2 mb-7 text-sm leading-6 text-slate-500">
                {step === 'send'
                  ? 'Enter your student details to receive a one-time verification code.'
                  : <>Enter the six-digit code sent to <strong className="break-all font-semibold text-slate-700">{email}</strong>.</>}
              </p>
              <ErrorPanel error={error} />
              <Notice>{info}</Notice>
              {step === 'send' ? (
                <form className="space-y-5" onSubmit={onSend}>
                  <Field label="Roll number" value={roll} onChange={(event) => onRollChange(event.target.value)} placeholder="23NG1A0501" autoComplete="username" required />
                  <Field label="College email" type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="rollnumber@usharama.in" autoComplete="email" required />
                  <BusyButton className="!mt-7 w-full !py-3" busy={busy} type="submit">
                    Send verification code <ArrowRight size={16} aria-hidden="true" />
                  </BusyButton>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={onVerify}>
                  <Field label="Six-digit OTP" value={otp} maxLength={6} minLength={6} inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required />
                  <BusyButton className="w-full !py-3" busy={busy} type="submit" disabled={otp.length !== 6}>
                    Verify and continue <ArrowRight size={16} aria-hidden="true" />
                  </BusyButton>
                  <button type="button" className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900" disabled={busy} onClick={onBack}>
                    Change email or resend code
                  </button>
                </form>
              )}
              <div className="mt-8 flex items-start gap-2.5 border-t border-slate-100 pt-5">
                <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400" />
                <p className="text-xs leading-5 text-slate-500">No student password is needed. The email must correspond to your registered roll number.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function AlumniRegistration({ form, setForm, busy, onSubmit }) {
  function updateField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }
  function updateFriend(index, key, value) {
    setForm((previous) => ({
      ...previous,
      friends: previous.friends.map((friend, slot) =>
        slot === index ? { ...friend, [key]: value } : friend),
    }))
  }
  return (
    <section className="card scroll-mt-8 p-5 sm:p-7 lg:p-9" id="alumni-registration">
      <div className="mb-6"><Eyebrow>Official registration · URCET/7.22/AC 08</Eyebrow></div>
      <SectionHeading
        icon={GraduationCap}
        title="Alumni Registration"
        description="Complete this registration before submitting your No Dues application. Bring your physical photograph when collecting your certificates."
        aside={<span className="pill status-PENDING">Step 1 of 3</span>}
      />
      <form onSubmit={onSubmit}>
        <div className="mb-5">
          <h3 className="text-sm font-bold text-slate-800">Student and academic details</h3>
          <p className="mt-1 text-xs text-slate-500">Fields marked as required must be completed before submission.</p>
        </div>
        <div className="input-grid">
          {ALUMNI_FIELDS.map(({ key, label, required, wide, type }) => (
            <Field
              key={key}
              label={label}
              type={type}
              wide={wide}
              value={form[key]}
              required={required}
              onChange={(event) => updateField(key, event.target.value)}
            />
          ))}
        </div>
        <div className="mt-9 border-t border-slate-100 pt-7">
          <h3 className="text-sm font-bold text-slate-900">Five best friends in your class</h3>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">Please enter each friend's full name and phone number, as required in the official form.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {form.friends.map((friend, index) => (
              <div key={index} className="rounded-md border border-slate-200 bg-[#fafbfc] p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <UsersRound size={16} aria-hidden="true" /> Friend {index + 1}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" value={friend.name} required onChange={(event) => updateFriend(index, 'name', event.target.value)} />
                  <Field label="Phone" type="tel" value={friend.phone} required onChange={(event) => updateFriend(index, 'phone', event.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <p className="max-w-md text-xs leading-5 text-slate-500">Review your information carefully before submitting your registration.</p>
          <BusyButton type="submit" busy={busy} className="w-full sm:w-auto !px-5 !py-3">
            Submit Alumni Registration <ArrowRight size={16} aria-hidden="true" />
          </BusyButton>
        </div>
      </form>
    </section>
  )
}

function NoDuesApplication({ form, setForm, busy, onSubmit }) {
  return (
    <section className="card scroll-mt-8 p-5 sm:p-7 lg:p-9" id="no-dues-application">
      <div className="mb-6"><Eyebrow>Official form · URCET/5.4/FT 01</Eyebrow></div>
      <SectionHeading
        icon={FileText}
        title="No Dues Application"
        description="Your Alumni Registration is complete. Submit your No Dues details to begin review by all 17 departments in parallel."
        aside={<span className="pill status-PENDING">Step 2 of 3</span>}
      />
      <div className="mb-7 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3.5">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-slate-600" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-slate-800">Alumni Registration completed</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">You can now proceed to the clearance request.</p>
        </div>
      </div>
      <form onSubmit={onSubmit}>
        <div className="input-grid">
          {noDuesFields.map(({ key, label, wide, type }) => (
            <Field
              key={key}
              label={label}
              type={type}
              value={form[key]}
              wide={wide}
              required
              onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))}
            />
          ))}
        </div>
        <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-[#fafbfc] p-4 text-sm leading-6 text-slate-700">
          <input
            type="checkbox"
            className="mt-1.5 h-4 w-4 shrink-0"
            checked={form.declaration}
            onChange={(event) => setForm((previous) => ({ ...previous, declaration: event.target.checked }))}
          />
          <span>I declare that I do not have any other dues from any other sections.</span>
        </label>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <p className="max-w-md text-xs leading-5 text-slate-500">All 17 departments will receive your application after submission.</p>
          <BusyButton type="submit" busy={busy} disabled={!form.declaration} className="w-full sm:w-auto !px-5 !py-3">
            Submit to 17 departments <ArrowRight size={16} aria-hidden="true" />
          </BusyButton>
        </div>
      </form>
    </section>
  )
}

function ApplicationTracking({ current, busy, onDownload, onRefresh }) {
  const approvals = Array.isArray(current?.approvals) ? current.approvals : []
  const approvedCount = approvals.filter((approval) => approval.status === 'APPROVED').length
  const principalApproved = current?.principalStatus === 'APPROVED'
  const handedOver = current?.handoverStatus === 'HANDED_OVER'
  return (
    <div className="space-y-6" id="application-tracking">
      <section className="card scroll-mt-8 p-5 sm:p-7 lg:p-8">
        <SectionHeading
          icon={ClipboardCheck}
          title={`Application #${current.id}`}
          description={`Submitted ${formatIst(current.submittedAt)}`}
          aside={<Status value={current.status} />}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs text-slate-500">Department approvals</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{approvedCount}<span className="text-base font-medium text-slate-400"> / 17</span></p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs text-slate-500">Pending departments</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{approvals.filter((approval) => approval.status === 'PENDING').length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs text-slate-500">Departments requiring action</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{approvals.filter((approval) => approval.status === 'REJECTED').length}</p>
          </div>
        </div>
        <div className="mt-7">
          <Progress approved={approvedCount} total={17} />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Department decisions</h3>
            <p className="mt-1 text-xs text-slate-500">Latest status and remarks from each department.</p>
          </div>
          <button type="button" className="btn btn-muted !py-2" disabled={busy} onClick={onRefresh}>
            <RefreshCw size={15} aria-hidden="true" /> Refresh status
          </button>
        </div>
        {approvals.length === 0 ? <Empty message="Department decisions have not been loaded yet." /> : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {approvals.map((approval, index) => (
              <div key={approval.id ?? `${approval.department}-${index}`} className="min-w-0 rounded-md border border-slate-200 bg-white px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h4 className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-slate-800">{approval.department}</h4>
                  <Status value={approval.status} />
                </div>
                {approval.remarks && (
                  <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">{approval.remarks}</p>
                )}
                {approval.decidedAt && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 size={13} aria-hidden="true" /> {formatIst(approval.decidedAt)}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card scroll-mt-8 p-5 sm:p-7 lg:p-8" id="certificate-collection">
        <SectionHeading
          icon={FileCheck2}
          title="Final approval and certificate collection"
          description="Once your application is approved, download the final document and follow the college's verification process."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Principal decision', value: current.principalStatus },
            { label: 'Email delivery', value: current.emailStatus },
            { label: 'Certificate handover', value: current.handoverStatus },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md border border-slate-200 bg-[#fafbfc] p-4">
              <p className="mb-3 text-xs font-medium text-slate-500">{label}</p>
              <Status value={value} />
            </div>
          ))}
        </div>
        {current.principalRemarks && (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">Principal remarks</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">{current.principalRemarks}</p>
          </div>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div className="min-w-0 flex-1">
            {handedOver ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} aria-hidden="true" /> Original certificates handed over.</p>
            ) : principalApproved ? (
              <p className="text-sm leading-6 text-slate-600">Download and print your approved form, then bring the required documents for Admin verification.</p>
            ) : (
              <p className="text-sm leading-6 text-slate-600">The approved PDF becomes available after the required department and Principal decisions.</p>
            )}
          </div>
          {current.pdfReady && (
            <BusyButton type="button" busy={busy} onClick={onDownload} className="w-full sm:w-auto !px-5 !py-3">
              <Download size={16} aria-hidden="true" /> Download approved PDF
            </BusyButton>
          )}
        </div>
      </section>
    </div>
  )
}

export default function Student() {
  const [person, setPerson] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [alumniDone, setAlumniDone] = useState(false)
  const [applications, setApplications] = useState([])
  const [step, setStep] = useState('send')
  const [roll, setRoll] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState(createAlumniForm)
  const [nd, setNd] = useState(createNoDuesForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function load({ quiet = false } = {}) {
    // A failure to load applications must not erase a valid student session.
    const student = await api('/student/me')
    setPerson(student)
    setAlumniDone(Boolean(student.alumniSubmitted))
    try {
      const all = await api('/student/applications')
      setApplications(Array.isArray(all) ? all : [])
      if (student.alumniSubmitted && (!Array.isArray(all) || all.length === 0)) {
        try {
          const record = await api('/student/alumni')
          const registration = record?.registration
          if (registration) {
            setNd((previous) => ({
              ...previous,
              studentName: previous.studentName || registration.name || '',
              branch: previous.branch || registration.branch || '',
              address: previous.address || registration.address || '',
              phone: previous.phone || registration.mobile || '',
            }))
          }
        } catch {
          // Existing alumni submissions are still valid if prefill is unavailable.
        }
      }
    } catch (err) {
      if (!quiet) setError(err.message || 'Unable to load your applications. Please retry.')
      throw err
    }
    return student
  }

  useEffect(() => {
    let mounted = true
    async function restore() {
      try {
        const student = await api('/student/me')
        if (!mounted) return
        setPerson(student)
        setAlumniDone(Boolean(student.alumniSubmitted))
        try {
          const all = await api('/student/applications')
          if (!mounted) return
          setApplications(Array.isArray(all) ? all : [])
          if (student.alumniSubmitted && (!Array.isArray(all) || all.length === 0)) {
            try {
              const record = await api('/student/alumni')
              if (!mounted || !record?.registration) return
              const a = record.registration
              setNd((previous) => ({ ...previous,
                studentName: previous.studentName || a.name || '',
                branch: previous.branch || a.branch || '',
                address: previous.address || a.address || '',
                phone: previous.phone || a.mobile || '',
              }))
            } catch { /* Prefill is optional; the form remains editable. */ }
          }
        } catch (err) {
          if (mounted) setError(err.message || 'Unable to load applications. Please retry.')
        }
      } catch {
        if (mounted) setPerson(null)
      } finally {
        if (mounted) setCheckingSession(false)
      }
    }
    restore()
    return () => { mounted = false }
  }, [])

  async function run(fn) {
    setBusy(true)
    setError('')
    setInfo('')
    try { await fn() }
    catch (err) { setError(err?.message || 'Request failed. Please try again.') }
    finally { setBusy(false) }
  }

  function onRollChange(value) {
    const normalized = value.toUpperCase().trim()
    setRoll(normalized)
    setEmail(`${normalized.toLowerCase()}@usharama.in`)
  }

  function onSend(event) {
    event.preventDefault()
    run(async () => {
      await api('/public/otp/send', { method: 'POST', body: { rollNumber: roll, email } })
      setOtp('')
      setStep('verify')
      setInfo('Verification code sent. Please check your college email.')
    })
  }

  function onVerify(event) {
    event.preventDefault()
    run(async () => {
      await api('/public/otp/verify', { method: 'POST', body: { rollNumber: roll, otp } })
      setStep('send')
      setOtp('')
      try { await load({ quiet: false }) }
      catch { /* Keep verified session visible if the application list fails. */ }
    })
  }

  function logout() {
    run(async () => {
      await api('/auth/logout', { method: 'POST' })
      setPerson(null)
      setStep('send')
      setRoll('')
      setEmail('')
      setOtp('')
      setApplications([])
      setAlumniDone(false)
      setForm(createAlumniForm())
      setNd(createNoDuesForm())
    })
  }

  function submitAlumni(event) {
    event.preventDefault()
    run(async () => {
      await api('/student/alumni', { method: 'POST', body: form })
      setAlumniDone(true)
      setNd((previous) => ({
        ...previous,
        studentName: form.name,
        branch: form.branch,
        address: form.address,
        phone: form.mobile,
      }))
      setInfo('Alumni Registration submitted successfully. You can now complete No Dues.')
    })
  }

  function submitNoDues(event) {
    event.preventDefault()
    run(async () => {
      await api('/student/no-dues', { method: 'POST', body: nd })
      await load()
      setInfo('No Dues application submitted to all 17 departments.')
    })
  }

  function refreshApplications() {
    run(async () => {
      await load({ quiet: true })
      setInfo('Application status is up to date.')
    })
  }

  const current = applications[0]
  const completed = current?.handoverStatus === 'HANDED_OVER'
  const showAlumni = !alumniDone
  const showNoDues = alumniDone && !current

  if (checkingSession) return (
    <>
      <TopBar />
      <main className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-5">
        <div role="status" className="flex items-center gap-3 text-sm text-slate-500">
          <RefreshCw size={18} className="animate-spin" aria-hidden="true" /> Loading student portal…
        </div>
      </main>
    </>
  )

  if (!person) return (
    <StudentLogin
      roll={roll} email={email} otp={otp} step={step} busy={busy}
      error={error} info={info}
      setOtp={setOtp} onRollChange={onRollChange} onEmailChange={setEmail}
      onSend={onSend} onVerify={onVerify}
      onBack={() => { setStep('send'); setOtp(''); setError(''); setInfo('') }}
    />
  )

  return (
    <div className="campus-public-page min-h-screen">
      <TopBar person={person} onLogout={logout} />
      <Page
        title="Student clearance workspace"
        subtitle={`Verified as ${person.rollNumber} · ${person.email}`}
        action={<span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><BadgeCheck size={15} aria-hidden="true" /> Email verified</span>}
      >
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>Your clearance journey</Eyebrow>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            Home <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <ErrorPanel error={error} />
        <Notice>{info}</Notice>

        <div className="mb-7 grid gap-4 md:grid-cols-3" aria-label="Application stages">
          <StepCard number="01" title="Alumni Registration" subtitle={alumniDone ? 'Your registration is recorded.' : 'Complete this form first.'} state={alumniDone ? 'done' : 'active'} active={showAlumni} />
          <StepCard number="02" title="No Dues Application" subtitle={current ? 'Submitted to departments.' : 'Available after Alumni Registration.'} state={current ? 'done' : alumniDone ? 'active' : 'upcoming'} active={showNoDues} />
          <StepCard number="03" title="Certificate collection" subtitle={completed ? 'Original certificates collected.' : current ? 'Track your clearance and final approval.' : 'After all required approvals.'} state={completed ? 'done' : current ? 'active' : 'upcoming'} active={Boolean(current && !completed)} />
        </div>

        {showAlumni && <AlumniRegistration form={form} setForm={setForm} busy={busy} onSubmit={submitAlumni} />}
        {showNoDues && <NoDuesApplication form={nd} setForm={setNd} busy={busy} onSubmit={submitNoDues} />}
        {current && (
          <ApplicationTracking
            current={current} busy={busy} onRefresh={refreshApplications}
            onDownload={() => run(async () => downloadPdf(`/student/approved-form/${current.id}`, `DCCMP-No-Dues-${current.id}.pdf`))}
          />
        )}

        <footer className="mt-10 flex items-start gap-2.5 border-t border-slate-200 py-7 text-xs leading-5 text-slate-500">
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <p>DCCMP · Usharama College of Engineering and Technology. For corrections or clearance issues, contact the relevant college department.</p>
        </footer>
      </Page>
    </div>
  )
}
