import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './features/auth/useAuth'
import { isSupabaseConfigured } from './lib/env'

const LoginRoute = lazy(async () => import('./features/auth/AuthScreen').then((module) => ({ default: module.AuthScreen })))
const WorkspaceRoute = lazy(async () =>
  import('./features/workspace/WorkspacePage').then((module) => ({ default: module.WorkspacePage })),
)

function ProtectedRoute() {
  const { ready, session } = useAuth()
  const location = useLocation()

  if (!ready) {
    return <div className="screen-loader text-base-content/70">Carregando seu workspace...</div>
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="setup-screen">
        <div className="card w-full max-w-2xl border border-base-300 bg-base-100 shadow-2xl">
          <div className="card-body gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Configuração pendente</span>
            <h1 className="text-3xl font-black">Configure o Supabase antes de usar o app.</h1>
            <p className="text-base-content/70">
              Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no ambiente local e na
              Vercel.
            </p>
            <p className="text-base-content/70">
              O schema SQL completo e o fluxo do admin estão descritos no README.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <Suspense fallback={<div className="screen-loader text-base-content/70">Abrindo workspace...</div>}>
      <WorkspaceRoute />
    </Suspense>
  )
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<div className="screen-loader text-base-content/70">Carregando login...</div>}>
            <LoginRoute />
          </Suspense>
        }
      />
      <Route path="/subjects/:subjectId/pages/:pageId" element={<ProtectedRoute />} />
      <Route path="/subjects/:subjectId" element={<ProtectedRoute />} />
      <Route path="/" element={<ProtectedRoute />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
