import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'
import { uuid } from '../lib/uuid'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

const USERS = 'finflow-local-users'
const SESSION = 'finflow-local-session'
const DEMO = { id: 'demo', email: 'demo@finflow.app', name: 'Demo' }
const readUsers = () => { try { return JSON.parse(localStorage.getItem(USERS) || '[]') } catch { return [] } }
const shape = (u) => (u ? { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.user_metadata?.name || '' } : null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!hasSupabase) {
      const id = localStorage.getItem(SESSION)
      setUser(id === 'demo' ? DEMO : readUsers().find((x) => x.id === id) || null)
      setReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => { setUser(shape(data.session?.user)); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') setRecovery(true)
      setUser(shape(session?.user))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const api = {
    user, ready, recovery, cloud: hasSupabase, demo: !hasSupabase,
    // ---- cloud (Supabase) ----
    signUp: ({ name, email, password }) => supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }),
    signIn: ({ email, password }) => supabase.auth.signInWithPassword({ email, password }),
    sendOtp: (email) => supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }),
    verifyOtp: (email, token) => supabase.auth.verifyOtp({ email, token, type: 'email' }),
    google: () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
    updatePassword: async (password) => { const r = await supabase.auth.updateUser({ password }); if (!r.error) setRecovery(false); return r },
    // ---- on-device profiles (no Supabase configured) ----
    localSignUp: ({ name, email }) => {
      const e = email.trim().toLowerCase()
      if (!name.trim() || !e) return { error: 'Enter your name and email.' }
      const users = readUsers()
      if (users.some((x) => x.email === e)) return { error: 'A profile with this email already exists here. Sign in instead.' }
      const u = { id: uuid(), email: e, name: name.trim() }
      localStorage.setItem(USERS, JSON.stringify([...users, u]))
      localStorage.setItem(SESSION, u.id)
      setUser(u)
      return {}
    },
    localSignIn: (email) => {
      const u = readUsers().find((x) => x.email === email.trim().toLowerCase())
      if (!u) return { error: 'No profile with that email on this device. Create one first.' }
      localStorage.setItem(SESSION, u.id)
      setUser(u)
      return {}
    },
    explore: () => { localStorage.setItem(SESSION, 'demo'); setUser(DEMO); return {} },
    signOut: async () => {
      if (hasSupabase) await supabase.auth.signOut()
      else { localStorage.removeItem(SESSION); setUser(null) }
    }
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
