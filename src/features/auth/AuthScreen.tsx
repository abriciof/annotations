import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, LoaderCircle, RefreshCw, ShieldAlert } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/env'
import { checkSupabaseConnection, signInWithPassword } from '../../lib/supabase'
import { useTheme } from '../theme/useTheme'
import { useAuth } from './useAuth'

export function AuthScreen() {
  const { session, error: authError, clearError } = useAuth()
  const { theme, themes, setTheme } = useTheme()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle')
  const [connectionMessage, setConnectionMessage] = useState('Ainda não verificamos a conexão com o Supabase.')

  useEffect(() => {
    async function verifyConnection() {
      setConnectionStatus('checking')
      const result = await checkSupabaseConnection()
      setConnectionStatus(result.ok ? 'online' : 'offline')
      setConnectionMessage(result.message)
    }

    void verifyConnection()
  }, [])

  if (session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    clearError()

    try {
      await signInWithPassword(email, password)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Falha ao autenticar.')
    } finally {
      setBusy(false)
    }
  }

  const ConnectionIcon =
    connectionStatus === 'checking' ? LoaderCircle : connectionStatus === 'online' ? CheckCircle2 : ShieldAlert

  return (
    <div className="min-h-screen bg-base-200">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.2fr)_430px] lg:px-8">
        <section className="hero min-h-[320px] rounded-[2rem] border border-base-300 bg-gradient-to-br from-primary/15 via-base-100 to-secondary/10 shadow-2xl">
          <div className="hero-content w-full justify-start">
            <div className="max-w-2xl space-y-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Workspace pessoal</span>
                <select
                  className="select select-bordered select-sm w-40"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as (typeof themes)[number])}
                >
                  {themes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight lg:text-6xl">Escreva como se a página inteira fosse o seu caderno.</h1>
                <p className="max-w-xl text-base-content/70 lg:text-lg">
                  Disciplinaas, fórmulas, tabelas e páginas aninhadas em um workspace otimizado para estudo técnico e uso
                  contínuo.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-base-content/70 sm:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100/70 p-4">Ctrl/Cmd + K para abrir a paleta.</div>
                <div className="rounded-2xl border border-base-300 bg-base-100/70 p-4">Ctrl/Cmd + N para criar páginas.</div>
                <div className="rounded-2xl border border-base-300 bg-base-100/70 p-4">Temas persistentes com daisyUI.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <form className="card w-full border border-base-300 bg-base-100 shadow-2xl" onSubmit={handleSubmit}>
            <div className="card-body gap-5">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Login</span>
                <h2 className="text-3xl font-black">Entrar no workspace</h2>
                <p className="text-sm text-base-content/70">
                  Entre com o usuário do Supabase Auth. O acesso efetivo depende do perfil estar marcado como admin no banco.
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  connectionStatus === 'online'
                    ? 'border-success/30 bg-success/10'
                    : connectionStatus === 'offline'
                      ? 'border-error/30 bg-error/10'
                      : 'border-base-300 bg-base-200/70'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <ConnectionIcon size={16} className={connectionStatus === 'checking' ? 'animate-spin' : ''} />
                    <span>
                      {connectionStatus === 'checking'
                        ? 'Testando conexão'
                        : connectionStatus === 'online'
                          ? 'Supabase conectado'
                          : 'Supabase com problema'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={async () => {
                      setConnectionStatus('checking')
                      const result = await checkSupabaseConnection()
                      setConnectionStatus(result.ok ? 'online' : 'offline')
                      setConnectionMessage(result.message)
                    }}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <p className="text-sm text-base-content/70">{connectionMessage}</p>
                {!isSupabaseConfigured && <p className="mt-2 text-sm text-warning">Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p>}
              </div>

              <label className="form-control gap-2">
                <span className="label-text font-medium">Email</span>
                <input className="input input-bordered input-lg w-full" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>

              <label className="form-control gap-2">
                <span className="label-text font-medium">Senha</span>
                <input
                  className="input input-bordered input-lg w-full"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha do Supabase Auth"
                  required
                />
              </label>

              {(error || authError) && <div className="alert alert-error text-sm">{error ?? authError}</div>}

              <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                {busy ? 'Entrando...' : 'Entrar'}
              </button>

              <p className="text-sm text-base-content/60">
                Se o login autenticar mas você não entrar, marque seu usuário como admin em <code>public.profiles</code>.
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
