import { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'
import { axe } from 'vitest-axe'

import AuthProvider from '@/auth/AuthProvider'
import type { AuthService, AuthSnapshot } from '@/auth/auth-service'
import ApiProvider from '@/api/ApiProvider'
import { ApiClient } from '@/api/client'
import type { RuntimeConfig } from '@/config/runtime-config'

import App from './App'

const config: RuntimeConfig = {
  VITE_APPOINTMENT_API_URL: 'http://localhost:5000/api/v1',
  VITE_APPOINTMENT_BCEID_REGISTRATION_URL: '',
  VITE_APPOINTMENT_BC_SERVICES_CARD_URL: '',
  VITE_APPOINTMENT_DISABLE_SMS: false,
  VITE_APPOINTMENT_FOOTER_LINKS: '',
  VITE_APPOINTMENT_FOOTER_MESSAGE: '',
  VITE_APPOINTMENT_HEADER_LINKS: '',
  VITE_APPOINTMENT_HEADER_MESSAGE: '',
  VITE_APPOINTMENT_HIDE_BC_SERVICES_CARD: false,
}

function authService(snapshot: AuthSnapshot) {
  return {
    getSnapshot: () => snapshot,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    refreshToken: () => Promise.resolve(),
    subscribe: () => () => undefined,
  } as unknown as AuthService
}

function renderApp(path: string, snapshot: AuthSnapshot) {
  const service = authService(snapshot)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const apiClient = new ApiClient({
    authService: service,
    baseUrl: config.VITE_APPOINTMENT_API_URL,
  })
  return render(
    <AuthProvider authService={service}>
      <ApiProvider client={apiClient}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <App config={config} queryClient={queryClient} />
          </MemoryRouter>
        </QueryClientProvider>
      </ApiProvider>
    </AuthProvider>,
  )
}

const anonymous: AuthSnapshot = {
  authenticated: false,
  authorized: false,
  displayName: null,
  error: null,
  initialized: true,
  roles: [],
  token: null,
  username: null,
}

it('renders the application shell and legacy anonymous actions', () => {
  const { container } = renderApp('/appointment', anonymous)

  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Book a Service BC Appointment',
    }),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Login' })).toBeVisible()
  expect(screen.getByRole('contentinfo')).toBeVisible()
  expect(container.querySelector('header .max-w-bc-content')).toBeTruthy()
  expect(
    screen.getByText(/The B.C. Public Service acknowledges the territories/),
  ).toBeVisible()
})

it('redirects a protected route through login', async () => {
  renderApp('/booked-appointments', anonymous)

  expect(
    await screen.findByRole('heading', { level: 2, name: 'Login' }),
  ).toBeVisible()
})

it('has no detectable serious accessibility violations', async () => {
  const { container } = renderApp('/appointment', anonymous)
  const results = await axe(container)

  expect(
    results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    ),
  ).toEqual([])
})
