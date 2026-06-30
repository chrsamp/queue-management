import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error', error, errorInfo)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="mx-auto w-full max-w-3xl p-6" id="main" role="alert">
        <h1 className="text-bc-h4 mb-3 font-bold">
          The application encountered an error
        </h1>
        <p>Please reload the page and try again.</p>
      </main>
    )
  }
}
