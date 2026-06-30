import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'

import ApiProvider from '@/api/ApiProvider'
import { ApiClient } from '@/api/client'
import App from '@/App'
import FatalStartupError from '@/app/FatalStartupError'
import AuthProvider from '@/auth/AuthProvider'
import { AuthService } from '@/auth/auth-service'
import { loadRuntime } from '@/config/runtime-config'
import { createAppQueryClient } from '@/query/query-client'

import './index.css'
import '@bcgov/bc-sans/css/BC_Sans.css'

async function start() {
  const root = createRoot(document.getElementById('root')!)

  try {
    const runtime = await loadRuntime()
    const authService = new AuthService(runtime.keycloak)
    await authService.initialize()
    const apiClient = new ApiClient({
      authService,
      baseUrl: runtime.config.VITE_APPOINTMENT_API_URL,
    })
    const queryClient = createAppQueryClient()

    root.render(
      <StrictMode>
        <AuthProvider authService={authService}>
          <ApiProvider client={apiClient}>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App config={runtime.config} queryClient={queryClient} />
              </BrowserRouter>
            </QueryClientProvider>
          </ApiProvider>
        </AuthProvider>
      </StrictMode>,
    )
  } catch (error) {
    root.render(<FatalStartupError error={error} />)
  }
}

void start()
