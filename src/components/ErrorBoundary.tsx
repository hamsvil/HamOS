import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SafeModeOverlay } from './HamAiStudio/SafeModeOverlay';
import { useProjectStore } from '../store/projectStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Set error in project store to trigger SafeModeOverlay
    useProjectStore.getState().setUiState({ 
      error: { 
        title: 'Component Crash', 
        message: error.message || 'A critical UI component failed to render.' 
      } 
    });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <SafeModeOverlay />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
