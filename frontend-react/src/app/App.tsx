import { useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import { getCurrentCsr, getOffices } from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import { useApiClient } from '@/api/use-api-client'
import { useAuth } from '@/auth/use-auth'
import Button from '@/components/Button'
import CsrStatusSwitch from '@/components/CsrStatusSwitch'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import OfficeSwitcher from '@/components/OfficeSwitcher'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

interface AppProps {
  queryClient: QueryClient
  supportUrl: string
}

function App({ queryClient, supportUrl }: AppProps) {
  const auth = useAuth()
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)

  async function handleLogout() {
    clearWorkflow()
    queryClient.clear()
    await auth.logout()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        skipLinks={[{ href: '#main', label: 'Skip to main content' }]}
        title="Service BC Queue Management"
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
            <Button onClick={handleLogout}>Logout</Button>
          ) : (
            <Button onClick={() => void auth.login()}>Login</Button>
          )}
        </div>
      </Header>
      <main className="flex-1" id="main">
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route
            element={<QueueRoute supportUrl={supportUrl} />}
            path="/queue"
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
  const auth = useAuth()

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <div>
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">Queue</h2>
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
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">Queue</h2>
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
    <section className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">Queue</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Queue workspace placeholder.
        </p>
      </div>

      <dl className="border-bc-border grid max-w-2xl grid-cols-[max-content_1fr] gap-x-4 gap-y-3 border p-4">
        <dt className="font-bold">User</dt>
        <dd className="m-0">{csr.username}</dd>
        <dt className="font-bold">Role</dt>
        <dd className="m-0">{csr.role.role_code}</dd>
        <dt className="font-bold">Office</dt>
        <dd className="m-0">{office.office_name}</dd>
      </dl>
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
