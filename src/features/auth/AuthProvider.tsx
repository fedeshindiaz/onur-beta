/* oxlint-disable react/only-export-components -- el hook y el proveedor comparten el mismo contexto */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export type AppRole = 'professional' | 'patient'

interface AuthState {
  ready: boolean
  role: AppRole | null
  user: User | null
  displayName: string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [role, setRole] = useState<AppRole | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    let active = true
    localStorage.removeItem('onur-demo-role')
    const client = supabase

    const denyAccess = () => {
      if (!active) return
      setUser(null)
      setRole(null)
      setDisplayName('')
      setReady(true)
    }

    if (!client) {
      denyAccess()
      return
    }

    const apply = async (next: User | null) => {
      if (!next) {
        denyAccess()
        return
      }

      if (!active) return
      setReady(false)
      setUser(next)
      const { data, error } = await client.from('profiles').select('role, display_name').eq('id', next.id).maybeSingle()
      if (!active) return
      if (error || (data?.role !== 'professional' && data?.role !== 'patient')) {
        denyAccess()
        return
      }

      setRole(data.role)
      setDisplayName(String(data.display_name ?? (data.role === 'professional' ? 'Profesional' : 'Paciente')))
      setReady(true)
    }

    void client.auth.getSession().then(({ data }) => apply(data.session?.user ?? null))
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void apply(session?.user ?? null)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(() => ({
    ready,
    role,
    user,
    displayName,
    signOut: async () => {
      localStorage.removeItem('onur-demo-role')
      if (supabase) await supabase.auth.signOut()
      setRole(null)
      setUser(null)
      setDisplayName('')
    },
  }), [displayName, ready, role, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider no disponible.')
  return value
}
