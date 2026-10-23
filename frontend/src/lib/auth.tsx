import { useEffect, useState, type ReactNode } from 'react'
import api from './api'
import { AuthContext } from './auth-context'
import type { LoginRequest, TokenResponse, User } from '@/types'

const CHAVE_ACCESS = 'access_token'
const CHAVE_REFRESH = 'refresh_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Initializer determina isLoading logo no arranque:
  // - se há token, começa a true (vai validar no useEffect)
  // - se não há token, começa a false (não há nada a validar)
  const [isLoading, setIsLoading] = useState(() => {
    return !!localStorage.getItem(CHAVE_ACCESS)
  })

  useEffect(() => {
    const token = localStorage.getItem(CHAVE_ACCESS)
    if (!token) {
      // Já sabemos que não estamos loading (initializer tratou)
      return
    }

    let cancelled = false

    api.get<User>('/me')
      .then((resp) => {
        if (!cancelled) {
          setUser(resp.data)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(CHAVE_ACCESS)
          localStorage.removeItem(CHAVE_REFRESH)
          setUser(null)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function login(credentials: LoginRequest) {
    const resp = await api.post<TokenResponse>('/auth/login', credentials)
    const { access_token, refresh_token } = resp.data

    localStorage.setItem(CHAVE_ACCESS, access_token)
    localStorage.setItem(CHAVE_REFRESH, refresh_token)

    const meResp = await api.get<User>('/me')
    setUser(meResp.data)
  }

  function logout() {
    localStorage.removeItem(CHAVE_ACCESS)
    localStorage.removeItem(CHAVE_REFRESH)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}