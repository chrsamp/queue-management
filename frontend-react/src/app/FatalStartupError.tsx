export default function FatalStartupError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : 'The application could not start'

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <main
        className="border-bc-border max-w-xl border bg-white p-6"
        role="alert"
      >
        <h1 className="text-bc-h4 mb-3 font-bold">
          Service BC Queue Management
        </h1>
        <p className="text-bc-body m-0">
          Unable to load the application configuration.
        </p>
        <p className="text-bc-small text-bc-secondary mt-3 mb-0">{message}</p>
      </main>
    </div>
  )
}
