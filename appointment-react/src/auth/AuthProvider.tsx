import type { ReactNode } from 'react'

import type { AuthService } from './auth-service'
import { AuthContext } from './auth-context'

export default function AuthProvider({
  authService,
  children,
}: {
  authService: AuthService
  children: ReactNode
}) {
  return (
    <AuthContext.Provider value={authService}>{children}</AuthContext.Provider>
  )
}
