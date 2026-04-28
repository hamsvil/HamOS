import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { useProjectStore } from '../../store/projectStore';
import { SafeModeOverlay } from './SafeModeOverlay';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Singularity Engine v7] Error caught in ${this.props.componentName || 'Component'}:`, error, errorInfo);
    this.setState({ errorInfo });
    
    // Auto-healing attempt (max 3 retries)
    if (this.state.retryCount < 3) {
      setTimeout(() => {
        // console.log(`[Singularity Engine v7] Auto-healing attempt ${this.state.retryCount + 1}...`);
        this.setState(prev => ({ 
          hasError: false, 
          error: null, 
          errorInfo: null,
          retryCount: prev.retryCount + 1 
        }));
      }, 2000);
    } else {
      // Final failure: Trigger SafeModeOverlay
      useProjectStore.getState().setUiState({ 
        error: { 
          title: `${this.props.componentName || 'System'} Failure`, 
          message: error.message || 'A critical UI component failed to render after multiple healing attempts.' 
        } 
      });
    }
  }

  private handleManualRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0 });
    useProjectStore.getState().setUiState({ error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.retryCount >= 3) {
        return <SafeModeOverlay />;
      }

      return (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-[#0a0a0a] border border-red-500/20 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <h3 className="text-red-400 font-bold text-lg mb-2 tracking-tight uppercase">
            {this.props.componentName || 'System'} Failure
          </h3>
          <p className="text-gray-400 text-xs max-w-md mb-6 font-mono bg-black/50 p-3 rounded border border-white/5">
            {this.state.error?.message || 'An unexpected singularity anomaly occurred.'}
          </p>
          
          {this.state.retryCount >= 3 ? (
            <button
              onClick={this.handleManualRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/30"
            >
              <RefreshCw size={16} />
              Force Reboot
            </button>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono animate-pulse">
              <RefreshCw size={12} className="animate-spin" />
              Auto-healing sequence initiated ({this.state.retryCount}/3)...
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
