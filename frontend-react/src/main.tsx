import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'

import { ApiProvider } from '@/api/ApiProvider'
import { ApiClient } from '@/api/client'
import App from '@/app/App'
import FatalStartupError from '@/app/FatalStartupError'
import { AuthProvider } from '@/auth/AuthProvider'
import { AuthService } from '@/auth/auth-service'
import { loadRuntime } from '@/config/runtime-config'
import { createAppQueryClient } from '@/query/query-client'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'

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
      baseUrl: runtime.config.VITE_Q_API_URL,
    })
    const queryClient = createAppQueryClient()

    root.render(
      <StrictMode>
        <AuthProvider authService={authService}>
          <ApiProvider client={apiClient}>
            <QueryClientProvider client={queryClient}>
              <RealtimeProvider
                config={{
                  reconnectionDelayMax: runtime.config.VITE_Q_SOCKET_DELAY_MAX,
                  timeout: runtime.config.VITE_Q_SOCKET_TIMEOUT,
                  url: runtime.config.VITE_Q_SOCKET_URL,
                }}
              >
                <BrowserRouter>
                  <App
                    adminBaseUrl={new URL(
                      runtime.config.VITE_Q_SOCKET_URL,
                    ).origin}
                    queryClient={queryClient}
                    supportUrl={runtime.config.VITE_Q_SUPPORT_URL}
                  />
                </BrowserRouter>
              </RealtimeProvider>
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
