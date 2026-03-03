import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
              Something went wrong
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              We{"'"}re sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Page</span>
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-[var(--color-text-muted)] cursor-pointer text-sm">Error Details</summary>
                <pre className="mt-2 text-xs text-[var(--color-error)] bg-[var(--color-surface)] p-4 rounded-[var(--radius-sm)] overflow-auto border border-[var(--color-border)]">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
