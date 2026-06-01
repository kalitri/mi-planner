import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const G = {
  50: '#EAF3DE', 100: '#C0DD97', 200: '#97C459',
  400: '#639922', 600: '#3B6D11', 800: '#27500A', 900: '#173404'
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('¡Cuenta creada! Revisa tu email para confirmar el registro.')
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'Email o contraseña incorrectos.',
        'User already registered': 'Este email ya está registrado.',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
      }
      setError(msgs[err.message] || err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t) => { setTab(t); setError(null); setSuccess(null) }

  return (
    <>
      <Head>
        <title>Mi Planner 🌿 — Acceso</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: '100vh', background: '#f0f7ea',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <div style={{
          background: 'white', borderRadius: 16, padding: '2rem 2.5rem',
          width: '100%', maxWidth: 400,
          border: `1px solid ${G[100]}`,
          boxShadow: '0 4px 24px rgba(59,109,17,0.09)'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: 52, marginBottom: 6 }}>🌿</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: G[800], margin: 0 }}>Mi Planner</h1>
            <p style={{ fontSize: 13, color: G[400], marginTop: 4, margin: '4px 0 0' }}>Tu día, a tu ritmo ✨</p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: G[50], borderRadius: 10,
            padding: 4, marginBottom: '1.5rem', gap: 4
          }}>
            {[['login', 'Iniciar sesión'], ['register', 'Registrarse']].map(([t, l]) => (
              <button key={t} onClick={() => switchTab(t)} style={{
                flex: 1, padding: '9px 12px', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                fontWeight: tab === t ? 600 : 400,
                background: tab === t ? G[600] : 'transparent',
                color: tab === t ? 'white' : G[400],
                transition: 'all 0.15s',
              }}>{l}</button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: G[600], marginBottom: 5, fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: G[600], marginBottom: 5, fontWeight: 500 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                required
                minLength={6}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fee2e2', color: '#991b1b', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, marginBottom: 14,
                border: '1px solid #fecaca'
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                background: G[50], color: G[800], borderRadius: 8,
                padding: '10px 14px', fontSize: 13, marginBottom: 14,
                border: `1px solid ${G[100]}`
              }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 12, border: 'none', borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? G[200] : G[600],
              color: 'white', fontSize: 15, fontWeight: 600,
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}>
              {loading ? 'Cargando...' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: G[200], marginTop: '1.5rem', marginBottom: 0 }}>
            {tab === 'login'
              ? <>¿No tienes cuenta? <button onClick={() => switchTab('register')} style={{ background: 'none', border: 'none', color: G[600], cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>Regístrate</button></>
              : <>¿Ya tienes cuenta? <button onClick={() => switchTab('login')} style={{ background: 'none', border: 'none', color: G[600], cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>Inicia sesión</button></>
            }
          </p>
        </div>
      </div>
    </>
  )
}
