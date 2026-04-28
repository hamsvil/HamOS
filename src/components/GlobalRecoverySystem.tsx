 
// [UI LAYER] Direct DOM manipulation acknowledged and isolated.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Zap, History, Home, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { notification } from '../services/NotificationService';
import { safeStorage } from '../utils/storage';
import { selfHealingOrchestrator, OrchestratorStatus } from '../services/SelfHealingOrchestrator';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isHealing: boolean;
  countdown: number;
  autoReloadActive: boolean;
  isRecovering: boolean;
}

export class GlobalRecoverySystem extends Component<Props, State> {
  private intervalId: NodeJS.Timeout | null = null;
  private blankScreenTimeoutId: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isHealing: false,
    countdown: 5,
    autoReloadActive: false,
    isRecovering: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null, 
      isHealing: false, 
      countdown: 5, 
      autoReloadActive: false,
      isRecovering: false
    };
  }

  public componentDidMount() {
    // PROTOKOL FIX: Blank screen detection — extended timeout, removed isStillBooting.
    //
    // Previous bugs:
    // 1. 5-second timeout too short: heavy init (Dexie, OPFS, VFS) can take 10-30+ seconds.
    // 2. `isStillBooting` check was WRONG: checking for `initial-boot-loader` element is
    //    not a blank screen — the splash screen is the normal boot experience and should
    //    not trigger recovery. This check caused the ENTIRE reload loop: app starts →
    //    splash still showing at 5s → `isStillBooting=true` → setState(hasError:true) →
    //    componentDidCatch sees the error → startCountdown → window.location.reload() → loop.
    //
    // Fix: 30-second timeout. Only trigger if root is TRULY empty (no children AND no dimensions).
    // The splash screen renders React children in #root, so it always has children.length > 0.
    this.blankScreenTimeoutId = setTimeout(() => {
      const doc = window['document'];
      const root = doc.getElementById('root');
      if (root && !this.state.hasError) {
        const rect = root.getBoundingClientRect();
        const hasVisibleDimensions = rect.width > 0 && rect.height > 0;
        // isTrulyEmpty: root has NO children at all AND has no rendered size.
        // This only fires if React completely failed to mount — not during a normal splash screen.
        const isTrulyEmpty = root.children.length === 0 && !hasVisibleDimensions;

        if (isTrulyEmpty) {
          console.error('[SupremeProtocol] Truly blank screen detected after 30s! Triggering recovery UI.');
          this.setState({
            hasError: true,
            error: new Error('System Hang: Application failed to render any content within 30 seconds.'),
            errorInfo: { componentStack: 'Root element is completely empty after extended wait.' }
          });
        }
      }
    }, 30000);
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalRecoverySystem caught error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Attempt auto-recovery
    this.attemptRecovery();

    // Auto-reload logic with backoff
    const reloadCount = parseInt(safeStorage.getItem('ham_reload_count') || '0', 10);
    const lastReloadTime = parseInt(safeStorage.getItem('ham_last_reload_time') || '0', 10);
    const now = Date.now();

    if (now - lastReloadTime > 60000) {
      safeStorage.setItem('ham_reload_count', '0');
    }

    if (reloadCount < 3) {
      this.setState({ autoReloadActive: true });
      this.startCountdown(reloadCount);
    }
  }

  public componentWillUnmount() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.blankScreenTimeoutId) clearTimeout(this.blankScreenTimeoutId);
  }

  private startCountdown(currentReloadCount: number) {
    this.intervalId = setInterval(() => {
      this.setState(prevState => {
        if (prevState.countdown <= 1) {
          if (this.intervalId) clearInterval(this.intervalId);
          safeStorage.setItem('ham_reload_count', (currentReloadCount + 1).toString());
          safeStorage.setItem('ham_last_reload_time', Date.now().toString());
          window.location.reload();
          return { ...prevState, countdown: 0 };
        }
        return { ...prevState, countdown: prevState.countdown - 1 };
      });
    }, 1000);
  }

  private attemptRecovery = async () => {
    try {
      this.setState({ isRecovering: true });
      useProjectStore.getState().resetToSafeState();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Artificial delay for UX
      notification.success('System state recovered.');
    } catch (e) {
      console.error('Recovery failed:', e);
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  private handleHardReset = async () => {
    if (!confirm('This will clear ALL local data and reset the system. Continue?')) return;
    try {
      localStorage.clear();
      sessionStorage.clear();
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => { if (db.name) window.indexedDB.deleteDatabase(db.name); });
      window.location.reload();
    } catch (_e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] p-4 font-sans">
          <div className="max-w-md w-full bg-[#111] rounded-3xl border border-red-500/30 shadow-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 animate-pulse">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">System Interrupted</h2>
            <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred. The system has entered Safe Mode.'}
            </p>

            {this.state.autoReloadActive && this.state.countdown > 0 && (
              <div className="mb-6 py-2 px-4 bg-white/5 rounded-full inline-flex items-center gap-2 text-xs text-zinc-400 border border-white/10">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Auto-rebooting in <span className="text-white font-bold">{this.state.countdown}s</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.location.reload()}
                disabled={this.state.isRecovering}
                className="flex items-center justify-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-white transition-all active:scale-95 border border-white/5 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${this.state.isRecovering ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">{this.state.isRecovering ? 'Recovering...' : 'Retry'}</span>
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-white transition-all active:scale-95 border border-white/5"
              >
                <Home className="w-5 h-5" />
                <span className="text-sm font-medium">Home</span>
              </button>
              <button 
                onClick={this.handleHardReset}
                className="col-span-2 flex items-center justify-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-500 transition-all active:scale-95"
              >
                <Zap className="w-5 h-5" />
                <span className="text-sm font-medium">Hard Reset (Clear Data)</span>
              </button>
            </div>

            {this.state.errorInfo && (
                <details className="mt-6 text-left">
                    <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 uppercase tracking-widest font-mono">View Stack Trace</summary>
                    <pre className="mt-2 p-4 bg-black/50 rounded-xl text-[10px] text-red-400/70 font-mono overflow-auto max-h-40 custom-scrollbar border border-red-500/10">
                        {this.state.error?.stack}
                        {'\n\n'}
                        {this.state.errorInfo.componentStack}
                    </pre>
                </details>
            )}
            
            <p className="mt-8 text-[10px] text-zinc-700 uppercase tracking-widest font-mono">
              Quantum Resilience Protocol v5.5
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalRecoverySystem;
