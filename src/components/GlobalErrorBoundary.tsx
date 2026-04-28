import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Uncaught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
    // In a real app, you would send this to Sentry/LogRocket here
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-red-500 p-4">
          <div className="max-w-md w-full bg-[var(--bg-secondary)] shadow-lg rounded-lg p-6 border border-red-500/30">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="mb-4 text-[var(--text-secondary)]">
              The application encountered a critical error and needs to restart.
            </p>
            <pre className="bg-[var(--bg-tertiary)] p-3 rounded text-xs overflow-auto mb-4 max-h-40 text-[var(--text-primary)]">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()} // Hard reload
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
