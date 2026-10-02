import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { setViewModeContext } from '@/lib/view-mode'

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  isAdmin: boolean
  viewMode: 'admin' | 'user'
  setViewMode: (mode: 'admin' | 'user') => void
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  requestPasswordReset: (email: string) => Promise<{ error: any }>
  confirmPasswordReset: (
    token: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.isValid ? pb.authStore.record : null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'admin' | 'user'>(
    pb.authStore.isValid && (pb.authStore.record as any)?.admin ? 'admin' : 'user',
  )

  useEffect(() => {
    let prevUserId: string | null = pb.authStore.isValid
      ? ((pb.authStore.record as any)?.id ?? null)
      : null

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      const newUserId = pb.authStore.isValid ? (record?.id ?? null) : null

      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)

      if (newUserId !== prevUserId) {
        setViewMode(pb.authStore.isValid && (record as any)?.admin ? 'admin' : 'user')
      }

      prevUserId = newUserId
    })

    let ssoToken: string | null = null
    try {
      ssoToken = localStorage.getItem('rubble_sso_token')
      if (ssoToken) {
        localStorage.removeItem('rubble_sso_token')
      }
    } catch (_) {}

    if (!ssoToken) {
      const searchParams = new URLSearchParams(window.location.search)
      ssoToken = searchParams.get('token')
      if (ssoToken) {
        searchParams.delete('token')
        const newSearch = searchParams.toString()
        const cleanUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
        window.history.replaceState({}, '', cleanUrl)
      }
    }

    if (ssoToken) {
      pb.send('/backend/v1/auth/sso', {
        method: 'POST',
        body: { token: ssoToken },
      })
        .then((res: any) => {
          if (res && res.token && res.record) {
            pb.authStore.save(res.token, res.record)
            setUser(res.record)
            setIsAuthenticated(true)
          }
        })
        .catch((err) => {
          console.error('SSO failure:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    setViewModeContext(viewMode, user?.id ?? null)
  }, [viewMode, user])

  const isAdmin = !!user?.admin

  const signUp = async (email: string, password: string) => {
    try {
      await pb.collection('users').create({ email, password, passwordConfirm: password })
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const confirmPasswordReset = async (token: string, password: string, passwordConfirm: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        viewMode,
        setViewMode,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        confirmPasswordReset,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
