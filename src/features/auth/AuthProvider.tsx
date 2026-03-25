import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '../../lib/env'
import { getMyProfile, signOut as apiSignOut, supabase } from '../../lib/supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      return
    }

    let mounted = true

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) {
          return
        }

        const nextSession = data.session

        if (nextSession) {
          const profile = await getMyProfile()

          if (profile?.is_admin) {
            setSession(nextSession)
          } else {
            setError('Acesso negado. Seu usuário não está marcado como admin no banco.')
            await apiSignOut()
          }
        }

        setReady(true)
      })
      .catch((nextError: Error) => {
        setError(nextError.message)
        setReady(true)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setSession(null)
        return
      }

      void getMyProfile()
        .then((profile) => {
          if (profile?.is_admin) {
            setSession(nextSession)
            return
          }

          setError('Acesso negado. Seu usuário não está marcado como admin no banco.')
          void apiSignOut()
          setSession(null)
        })
        .catch((nextError: Error) => {
          setError(nextError.message)
          setSession(null)
        })
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      error,
      signOut: apiSignOut,
      clearError: () => setError(null),
    }),
    [error, ready, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
