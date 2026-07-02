import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router'

import ErrorBoundary from '@/app/ErrorBoundary'
import AccountSettings from '@/account/AccountSettings'
import { deleteDraft } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import { isIdentityProviderHint } from '@/auth/auth-service'
import { useAuth } from '@/auth/use-auth'
import AppointmentBooking from '@/booking/AppointmentBooking'
import BookedAppointments from '@/appointments/BookedAppointments'
import LoginChoices from '@/booking/LoginChoices'
import AlertBanner from '@/components/AlertBanner'
import AccountNavigationMenu from '@/components/AccountNavigationMenu'
import Button from '@/components/Button'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import LoadingIndicator from '@/components/LoadingIndicator'
import type { RuntimeConfig } from '@/config/runtime-config'
import { parseNotice } from '@/config/notice-links'
import { useBookingStore } from '@/store/booking-store'

const appTitle = 'Book a Service BC Appointment'

export default function App({
  config,
  queryClient,
}: {
  config: RuntimeConfig
  queryClient: QueryClient
}) {
  const auth = useAuth()
  const wasAuthenticated = useRef(auth.authenticated)
  const [headerNoticeVisible, setHeaderNoticeVisible] = useState(true)
  const headerNotice = parseNotice(
    config.VITE_APPOINTMENT_HEADER_MESSAGE,
    config.VITE_APPOINTMENT_HEADER_LINKS,
  )
  const footerNotice = parseNotice(
    config.VITE_APPOINTMENT_FOOTER_MESSAGE,
    config.VITE_APPOINTMENT_FOOTER_LINKS,
  )

  useEffect(() => {
    if (wasAuthenticated.current && !auth.authenticated) {
      queryClient.clear()
    }
    wasAuthenticated.current = auth.authenticated
  }, [auth.authenticated, queryClient])

  return (
    <div className="flex min-h-screen flex-col">
      {headerNoticeVisible && headerNotice.length > 0 && (
        <AlertBanner isCloseable onClose={() => setHeaderNoticeVisible(false)}>
          <Notice parts={headerNotice} />
        </AlertBanner>
      )}
      {auth.error && <AlertBanner variant="warning">{auth.error}</AlertBanner>}
      <Header
        containerClassName="max-w-bc-content"
        skipLinks={[{ href: '#main', label: 'Skip to main content' }]}
        title={appTitle}
        titleAs="h1"
      >
        <HeaderActions />
      </Header>
      <ErrorBoundary>
        <main
          className="max-w-bc-content mx-auto flex w-full flex-1 flex-col px-4 py-8"
          id="main"
        >
          {auth.authenticated && !auth.authorized && (
            <AlertBanner role="alert" variant="danger">
              Your account does not have access to the appointment application.
            </AlertBanner>
          )}
          <Routes>
            <Route element={<Navigate replace to="/appointment" />} path="/" />
            <Route
              element={<AppointmentPage config={config} />}
              path="/appointment"
            />
            <Route element={<LoginPage config={config} />} path="/login" />
            <Route element={<SigninPage />} path="/signin/:idpHint" />
            <Route
              element={<SignoutPage queryClient={queryClient} />}
              path="/signout"
            />
            <Route
              element={
                <ProtectedRoute>
                  <BookedAppointments config={config} />
                </ProtectedRoute>
              }
              path="/booked-appointments"
            />
            <Route
              element={
                <ProtectedRoute>
                  <AccountSettings config={config} />
                </ProtectedRoute>
              }
              path="/account-settings"
            />
            <Route element={<Navigate replace to="/appointment" />} path="*" />
          </Routes>
        </main>
      </ErrorBoundary>
      {footerNotice.length > 0 && (
        <AlertBanner isCloseable={false}>
          <Notice parts={footerNotice} />
        </AlertBanner>
      )}
      <Footer />
    </div>
  )
}

function Notice({ parts }: { parts: ReturnType<typeof parseNotice> }) {
  return (
    <p className="m-0">
      {parts.map((part, index) =>
        part.type === 'link' ? (
          <a
            className="text-inherit"
            href={part.href}
            key={`${part.href}-${index}`}
            rel="noreferrer"
            target="_blank"
          >
            {part.text}
          </a>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </p>
  )
}

function HeaderActions() {
  const auth = useAuth()
  return (
    <nav
      aria-label="Account"
      className="flex flex-wrap items-center justify-end gap-2"
    >
      {auth.authenticated ? (
        auth.authorized ? (
          <AccountNavigationMenu
            displayName={auth.displayName ?? auth.username}
          />
        ) : (
          <Button
            onClick={() => {
              window.location.assign('/signout')
            }}
            variant="secondary"
          >
            Log out
          </Button>
        )
      ) : (
        <>
          <Button
            onClick={() => {
              window.location.assign('/login')
            }}
          >
            Login
          </Button>
          <Button
            onClick={() => {
              window.location.assign('/login')
            }}
            variant="secondary"
          >
            Register
          </Button>
        </>
      )}
    </nav>
  )
}

function AppointmentPage({ config }: { config: RuntimeConfig }) {
  return <AppointmentBooking config={config} />
}

function LoginPage({ config }: { config: RuntimeConfig }) {
  const auth = useAuth()
  const pendingPath = useBookingStore((state) => state.pendingPostLoginPath)
  if (auth.authenticated && auth.authorized) {
    return <Navigate replace to={pendingPath ?? '/appointment'} />
  }

  return (
    <section className="border-bc-border mx-auto w-full max-w-2xl border bg-white p-6">
      <h2 className="text-bc-h4 mt-0">Login</h2>
      <p>Please login using one of the following.</p>
      <LoginChoices config={config} />
    </section>
  )
}

function SigninPage() {
  const { idpHint } = useParams()
  const auth = useAuth()
  const started = useRef(false)
  const pendingPath = useBookingStore((state) => state.pendingPostLoginPath)

  useEffect(() => {
    if (!isIdentityProviderHint(idpHint) || started.current) return
    started.current = true
    void auth.login({
      idpHint,
      redirectUri: `${window.location.origin}${pendingPath ?? '/appointment'}`,
    })
  }, [auth, idpHint, pendingPath])

  if (!isIdentityProviderHint(idpHint)) {
    return <Navigate replace to="/login" />
  }
  return <LoadingIndicator label="Redirecting to login" />
}

function SignoutPage({ queryClient }: { queryClient: QueryClient }) {
  const auth = useAuth()
  const apiClient = useApiClient()
  const started = useRef(false)
  const clearBooking = useBookingStore((state) => state.clearBooking)
  const draftAppointmentId = useBookingStore(
    (state) => state.draftAppointmentId,
  )

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      if (draftAppointmentId !== null) {
        try {
          await deleteDraft(apiClient, draftAppointmentId)
        } catch {
          // Draft cleanup is best effort.
        }
      }
      queryClient.clear()
      clearBooking()
      await auth.logout()
    })()
  }, [apiClient, auth, clearBooking, draftAppointmentId, queryClient])

  return <LoadingIndicator label="Signing out" />
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  const setPendingPath = useBookingStore(
    (state) => state.setPendingPostLoginPath,
  )

  useEffect(() => {
    if (!auth.authenticated) {
      setPendingPath(`${location.pathname}${location.search}`)
    }
  }, [auth.authenticated, location.pathname, location.search, setPendingPath])

  if (!auth.initialized) return <LoadingIndicator />
  if (!auth.authenticated) return <Navigate replace to="/login" />
  if (!auth.authorized) return <AccessUnavailable />
  return children
}

function AccessUnavailable() {
  return (
    <section role="alert">
      <h2 className="text-bc-h4 mt-0">Access unavailable</h2>
      <p>Your account is not authorized to use this application.</p>
    </section>
  )
}
