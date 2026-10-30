import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Segmented from '../components/Segmented'

// Email-code login needs a custom SMTP + a template containing {{ .Token }}. Off until you set VITE_EMAIL_CODE=true.
const CODE = import.meta.env.VITE_EMAIL_CODE === 'true'

export default function Login() {
  const a = useAuth()
  const [mode, setMode] = useState('in') // in | up | code | forgot
  const [step, setStep] = useState('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')

  const go = async (fn) => {
    setBusy(true); setErr(''); setNote('')
    try { return await fn() } catch (e) { setErr(e.message || 'Something went wrong. Try again.'); return null } finally { setBusy(false) }
  }
  const switchMode = (m) => { setMode(m); setStep('email'); setErr(''); setNote(''); setCode('') }

  const submit = async (e) => {
    e.preventDefault()
    const em = email.trim()
    if (!a.cloud) {
      const r = mode === 'up' ? a.localSignUp({ name, email: em }) : a.localSignIn(em)
      if (r.error) setErr(r.error)
      return
    }
    if (mode === 'in') {
      const r = await go(() => a.signIn({ email: em, password }))
      if (r?.error) setErr(/invalid login/i.test(r.error.message) ? 'Wrong email or password.' : r.error.message)
    } else if (mode === 'up') {
      if (password.length < 6) return setErr('Use at least 6 characters for the password.')
      const r = await go(() => a.signUp({ name: name.trim(), email: em, password }))
      if (r?.error) setErr(r.error.message)
      else if (r?.data?.user?.identities?.length === 0) setErr('An account with this email already exists. Sign in instead.')
      else if (r && !r.data.session) { setNote('Check your inbox and confirm your email, then sign in.'); setMode('in') }
    } else if (mode === 'forgot') {
      const r = await go(() => a.resetPassword(em))
      if (r?.error) setErr(r.error.message); else setNote('Reset link sent. Open it on this device.')
    } else if (mode === 'code') {
      if (step === 'email') {
        const r = await go(() => a.sendOtp(em))
        if (r?.error) setErr(r.error.message); else setStep('code')
      } else {
        const r = await go(() => a.verifyOtp(em, code.trim()))
        if (r?.error) setErr(r.error.message)
      }
    }
  }

  // Set a new password after following a reset link.
  if (a.recovery) {
    return (
      <Shell>
        <h2 className="font-display text-3xl font-semibold mb-5">Choose a new password</h2>
        <form onSubmit={async (e) => { e.preventDefault(); if (password.length < 6) return setErr('Use at least 6 characters.'); const r = await go(() => a.updatePassword(password)); if (r?.error) setErr(r.error.message) }} className="space-y-3">
          <PasswordField value={password} onChange={setPassword} show={show} setShow={setShow} autoComplete="new-password" label="New password" />
          <button className="btn w-full" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        </form>
        {err && <p role="alert" className="text-bad text-sm mt-4">{err}</p>}
      </Shell>
    )
  }

  const tabs = mode === 'in' || mode === 'up'
  return (
    <Shell>
      {tabs && <div className="mb-6"><Segmented options={[['in', 'Sign in'], ['up', 'Create account']]} value={mode} onChange={switchMode} /></div>}
      {!a.cloud && <p className="text-xs text-mute bg-card rounded-2xl px-4 py-3 mb-4">Cloud sync is not set up, so profiles live on this device only. Add your Supabase keys to enable real accounts.</p>}

      <form onSubmit={submit} className="space-y-3">
        {mode === 'up' && (
          <div><label htmlFor="nm" className="label">Name</label><input id="nm" required autoComplete="name" className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        )}
        {!(mode === 'code' && step === 'code') && (
          <div><label htmlFor="em" className="label">Email</label><input id="em" type="email" required autoComplete="email" autoCapitalize="none" className="field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        )}
        {a.cloud && (mode === 'in' || mode === 'up') && (
          <PasswordField value={password} onChange={setPassword} show={show} setShow={setShow} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} label="Password" />
        )}
        {mode === 'code' && step === 'code' && (
          <div>
            <label htmlFor="otp" className="label">Enter the code sent to {email}</label>
            <input id="otp" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} className="field text-center !text-2xl tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </div>
        )}

        <button className="btn w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : step === 'email' ? 'Email me a code' : 'Verify and continue'}
        </button>
      </form>

      {a.cloud && mode === 'in' && (
        <div className="flex justify-between text-sm mt-4">
          <button className="text-mute" onClick={() => switchMode('forgot')}>Forgot password?</button>
          {CODE && <button className="text-accent" onClick={() => switchMode('code')}>Email me a code</button>}
        </div>
      )}
      {(mode === 'code' || mode === 'forgot') && <button className="w-full text-sm text-mute py-3 mt-1" onClick={() => switchMode('in')}>Back to sign in</button>}

      {a.cloud && tabs && (
        <>
          <div className="flex items-center gap-3 text-xs text-mute py-4"><span className="h-px flex-1 bg-fg/10" />or<span className="h-px flex-1 bg-fg/10" /></div>
          <button type="button" className="btn-ghost w-full" onClick={() => go(a.google)}>Continue with Google</button>
        </>
      )}
      {!a.cloud && (
        <button type="button" className="btn-ghost w-full mt-4" onClick={a.explore}>Explore with sample data</button>
      )}

      {note && <p role="status" className="text-good text-sm mt-4">{note}</p>}
      {err && <p role="alert" className="text-bad text-sm mt-4">{err}</p>}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-dvh max-w-md mx-auto px-6 py-10 flex flex-col justify-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-6xl font-semibold">FinFlow</h1>
        <p className="text-mute mt-2 mb-8">Every rupee, quietly accounted for.</p>
        {children}
      </motion.div>
    </div>
  )
}

function PasswordField({ value, onChange, show, setShow, autoComplete, label }) {
  return (
    <div>
      <label htmlFor="pw" className="label">{label}</label>
      <div className="relative">
        <input id="pw" required type={show ? 'text' : 'password'} autoComplete={autoComplete} className="field pr-12" value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-mute">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
    </div>
  )
}
