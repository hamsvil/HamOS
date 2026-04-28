 
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class BrowserErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Browser Error Boundary caught an error:", error, errorInfo);
  }

  private resetError = () => {
    // PROTOKOL FIX: Reset only the error boundary state, NOT the entire page.
    // Previously the "Reload System" button called window.location.reload() which
    // destroyed the entire application state. Now we reset only this boundary,
    // allowing the browser module to remount and self-heal without affecting other panels.
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1
    }));
  };

  public render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < 3;
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-primary)] text-red-400 p-4 gap-4">
          <AlertTriangle size={48} className="mb-2 opacity-80" />
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">Browser Module Crashed</h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            {this.state.retryCount > 0 && (
              <p className="text-xs text-amber-500/80">
                Recovery attempt: {this.state.retryCount} / 3
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {canRetry ? (
              <button
                onClick={this.resetError}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/50 rounded-lg hover:bg-blue-500/20 transition-colors text-blue-400 text-sm font-medium"
              >
                <RefreshCw size={14} />
                Restart Browser Module
              </button>
            ) : (
              <>
                <p className="text-xs text-red-400/70 w-full text-center">Auto-recovery exhausted. Full reload required.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
                >
                  <RefreshCw size={14} />
                  Reload System
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
