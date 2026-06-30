import { createContext } from 'react'

import type { AuthService } from './auth-service'

export const AuthContext = createContext<AuthService | null>(null)
