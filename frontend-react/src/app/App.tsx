import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import {
  getCitizens,
  getCurrentCsr,
  getOffices,
  loginAdminSession,
} from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import { useApiClient } from '@/api/use-api-client'
import {
  buildAdminFrameUrl,
  getAdminOptions,
  getDefaultAdminView,
  isAdminRole,
  keyToAdminView,
  type AdminView,
} from '@/app/admin'
import { useAuth } from '@/auth/use-auth'
import Button from '@/components/Button'
import CsrStatusSwitch from '@/components/CsrStatusSwitch'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import HeaderNavigationMenu from '@/components/HeaderNavigationMenu'
import OfficeSwitcher from '@/components/OfficeSwitcher'
import Select from '@/components/Select'
import { queryKeys } from '@/query/query-keys'
import QueueWorkspace from '@/queue/QueueWorkspace'
import { useWorkflowStore } from '@/store/workflow-store'

interface AppProps {
  adminBaseUrl: string
  queryClient: QueryClient
  supportUrl: string
}

function App({ adminBaseUrl, queryClient, supportUrl }: AppProps) {
  const auth = useAuth()
  const apiClient = useApiClient()
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const currentRoleCode = useWorkflowStore((state) => state.currentRoleCode)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)

  const currentCsrQuery = useQuery({
    enabled: auth.authenticated,
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    retry: false,
  })

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    } else if (!auth.authenticated || currentCsrQuery.isError) {
      clearWorkflow()
    }
  }, [
    auth.authenticated,
    clearWorkflow,
    currentCsrQuery.data,
    currentCsrQuery.isError,
    setCurrentCsr,
  ])

  async function handleLogout() {
    clearWorkflow()
    queryClient.clear()
    await auth.logout()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        skipLinks={[{ href: '#main', label: 'Skip to main content' }]}
        title="Queue Management"
        titleAs="h1"
      >
        <div className="flex items-center gap-6">
          {auth.authenticated && <CsrStatusSwitch />}
          {auth.authenticated && auth.username && (
            <div className="flex min-w-0 flex-col items-end">
              <span className="text-bc-small text-bc-secondary truncate">
                {auth.username}
              </span>
              <OfficeSwitcher />
            </div>
          )}
          {auth.authenticated ? (
            <HeaderNavigationMenu
              currentRoleCode={currentRoleCode}
              onLogout={handleLogout}
            />
          ) : (
            <Button onClick={() => void auth.login()}>Login</Button>
          )}
        </div>
      </Header>
      <main
        className="flex min-h-[calc(100vh-var(--spacing-bc-header-height))] flex-1 flex-col"
        id="main"
      >
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route
            element={<QueueRoute supportUrl={supportUrl} />}
            path="/queue"
          />
          <Route
            element={
              <AdminRoute adminBaseUrl={adminBaseUrl} supportUrl={supportUrl} />
            }
            path="/admin"
          />
          <Route element={<Navigate replace to="/queue" />} path="*" />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

function HomePage() {
  const auth = useAuth()

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="max-w-3xl">
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">
          Staff queue management
        </h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Sign in to open the staff queue workspace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {auth.authenticated ? (
          <Link
            className="bg-bc-link focus-visible:outline-bc-link rounded-sm px-4 py-2 font-bold text-white no-underline hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2"
            to="/queue"
          >
            Open queue
          </Link>
        ) : (
          <Button onClick={() => void auth.login()}>Login</Button>
        )}
      </div>

      {auth.error && (
        <p className="border-bc-gold-60 bg-bc-light-gray text-bc-body m-0 border-l-4 p-4">
          {auth.error}
        </p>
      )}
    </section>
  )
}

function QueueRoute({ supportUrl }: { supportUrl: string }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.authenticated) {
    return <UnauthenticatedQueue />
  }

  return <AuthenticatedQueue key={location.key} supportUrl={supportUrl} />
}

function UnauthenticatedQueue() {
  return <UnauthenticatedStaffRoute title="Queue" />
}

function UnauthenticatedStaffRoute({ title }: { title: string }) {
  const auth = useAuth()

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <div>
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">{title}</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          You must be signed in before accessing the staff application.
        </p>
      </div>
      <Button onClick={() => void auth.login()}>Login</Button>
    </section>
  )
}

function AuthenticatedQueue({ supportUrl }: { supportUrl: string }) {
  const apiClient = useApiClient()
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)

  const currentCsrQuery = useQuery({
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    refetchOnMount: 'always',
    retry: false,
  })

  useQuery({
    enabled: currentCsrQuery.isSuccess,
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })

  const citizensQuery = useQuery({
    enabled: currentCsrQuery.isSuccess,
    queryFn: ({ signal }) => getCitizens(apiClient, signal),
    queryKey: queryKeys.citizens,
  })

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    } else if (currentCsrQuery.isError) {
      clearWorkflow()
    }
  }, [
    clearWorkflow,
    currentCsrQuery.data,
    currentCsrQuery.isError,
    setCurrentCsr,
  ])

  if (currentCsrQuery.isPending) {
    return (
      <section className="mx-auto max-w-5xl p-6">
        <p className="text-bc-body text-bc-secondary m-0">
          Loading your staff profile...
        </p>
      </section>
    )
  }

  if (currentCsrQuery.isError) {
    return (
      <UserNotConfigured
        error={currentCsrQuery.error}
        supportUrl={supportUrl}
      />
    )
  }

  const csr = currentCsrQuery.data.csr
  const office = currentOffice ?? csr.office

  return (
    <QueueWorkspace
      citizens={citizensQuery.data ?? []}
      errorMessage={
        citizensQuery.isError
          ? getRouteErrorMessage(citizensQuery.error, 'Unable to load queue.')
          : null
      }
      isLoading={citizensQuery.isPending}
      office={office}
      csr={csr}
      csrId={csr.csr_id}
    />
  )
}

function getRouteErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

function AdminRoute({
  adminBaseUrl,
  supportUrl,
}: {
  adminBaseUrl: string
  supportUrl: string
}) {
  const auth = useAuth()
  const apiClient = useApiClient()
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)
  const [selectedAdminView, setSelectedAdminView] = useState<AdminView | null>(
    null,
  )

  const currentCsrQuery = useQuery({
    enabled: auth.authenticated,
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    retry: false,
  })

  const roleCode = currentCsrQuery.data?.csr.role.role_code ?? null
  const adminOptions = getAdminOptions(roleCode)
  const adminView = selectedAdminView ?? getDefaultAdminView(roleCode)

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    }
  }, [currentCsrQuery.data, setCurrentCsr])

  const adminSessionQuery = useQuery({
    enabled: auth.authenticated && isAdminRole(roleCode),
    queryFn: ({ signal }) => loginAdminSession(apiClient, signal),
    queryKey: ['admin-session'],
    retry: false,
    staleTime: Infinity,
  })

  if (!auth.authenticated) {
    return <UnauthenticatedStaffRoute title="Admin" />
  }

  if (currentCsrQuery.isPending) {
    return (
      <section className="mx-auto max-w-5xl p-6">
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">Admin</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Loading your staff profile...
        </p>
      </section>
    )
  }

  if (currentCsrQuery.isError) {
    return (
      <UserNotConfigured
        error={currentCsrQuery.error}
        supportUrl={supportUrl}
      />
    )
  }

  if (!isAdminRole(roleCode)) {
    return (
      <section
        className="mx-auto flex max-w-5xl flex-col gap-4 p-6"
        role="alert"
      >
        <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Access unavailable</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Your account does not have access to the administration console.
        </p>
      </section>
    )
  }

  if (adminSessionQuery.isPending) {
    return (
      <section className="mx-auto max-w-5xl p-6">
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">Admin</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Opening the administration console...
        </p>
      </section>
    )
  }

  if (adminSessionQuery.isError) {
    return (
      <section
        className="mx-auto flex max-w-5xl flex-col gap-4 p-6"
        role="alert"
      >
        <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Admin unavailable</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          The administration console could not be opened. Please try again.
        </p>
        <p className="text-bc-small text-bc-secondary m-0">
          Admin session request failed.
        </p>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-1 flex-col gap-4 p-4">
      <div className="max-w-bc-content mx-auto flex w-full items-center gap-4">
        <h2 className="text-bc-h4 m-0 font-bold">Admin</h2>
        {adminOptions.length > 0 ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-bc-body font-bold">Editing:</span>
            <Select
              aria-label="Admin section"
              className="w-72"
              items={adminOptions}
              onSelectionChange={(key) => {
                if (key !== null) {
                  setSelectedAdminView(keyToAdminView(key))
                }
              }}
              selectedKey={adminView}
              size="small"
            />
          </div>
        ) : (
          <p className="text-bc-body m-0 font-bold">
            Editing: {roleCode === 'ANALYTICS' ? 'Provided Services' : 'CSRs'}
          </p>
        )}
      </div>
      <iframe
        className="border-bc-border min-h-[calc(100vh-14rem)] w-full flex-1 border"
        src={buildAdminFrameUrl(adminBaseUrl, adminView)}
        title="Admin"
      />
    </section>
  )
}

function UserNotConfigured({
  error,
  supportUrl,
}: {
  error: Error
  supportUrl: string
}) {
  const status =
    error instanceof ApiError && error.status ? ` (${error.status})` : ''
  const opensInNewWindow = /^https?:/i.test(supportUrl)

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 p-6" role="alert">
      <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Access unavailable</h2>
      <p className="text-bc-body text-bc-secondary m-0">
        Your account is not set up. Please{' '}
        <a
          className="text-bc-link underline"
          href={supportUrl}
          rel={opensInNewWindow ? 'noreferrer' : undefined}
          target={opensInNewWindow ? '_blank' : undefined}
        >
          contact support
        </a>{' '}
        to request access.
      </p>
      <p className="text-bc-small text-bc-secondary m-0">
        Staff profile request failed{status}.
      </p>
    </section>
  )
}

export default App
