import React, { Suspense } from 'react';
import InternalBrowser from './InternalBrowser/index';
import { Loader2, AlertTriangle } from 'lucide-react';

class BrowserErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-primary)] text-red-400 p-4">
          <AlertTriangle size={48} className="mb-4" />
          <h2 className="text-xl font-bold mb-2">Browser Module Crashed</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 text-center max-w-md">
            {this.state.error?.message || 'Unknown error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Reload System
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BrowserTab() {
  return (
    <div className="w-full h-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden flex flex-col relative">
      <BrowserErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)] gap-2">
            <Loader2 className="animate-spin" />
            <span>Initializing Quantum Core...</span>
          </div>
        }>
          <InternalBrowser />
        </Suspense>
      </BrowserErrorBoundary>
    </div>
  );
}
