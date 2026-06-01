import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const G = { 400: '#639922', 600: '#3B6D11' }

export default function AuthGuard({ children }) {
  const router = useRouter()
  const [session, setSession] = useState(undefined) // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) router.replace('/login')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: 16, background: '#f0f7ea'
      }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <div style={{ fontSize: 16, color: G[400], fontFamily: 'inherit' }}>Cargando tu planner...</div>
      </div>
    )
  }

  if (!session) return null

  return (
    <AuthContext.Provider value={{ session, user: session.user }}>
      {children}
    </AuthContext.Provider>
  )
}
