 
// [UI LAYER] Direct DOM manipulation acknowledged and isolated.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Subscription } from 'rxjs';
import { AlertTriangle, RefreshCw, Zap, ShieldAlert, History } from 'lucide-react';
import { safeStorage } from '../../utils/storage';
import { resilienceEngine, ServiceStatus } from '../../services/ResilienceEngine';

interface Props {
  children: ReactNode;
  onAutoHeal?: (error: Error, errorInfo: ErrorInfo) => void;
  onRollback?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isHealing: boolean;
  isRollingBack: boolean;
  countdown: number;
  autoReloadActive: boolean;
  serviceStatus: ServiceStatus;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  private intervalId: NodeJS.Timeout | null = null;
  private blankScreenTimeoutId: NodeJS.Timeout | null = null;
  private fallbackHealTimeoutId: NodeJS.Timeout | null = null;
  private statusSubscription: Subscription | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isHealing: false,
    isRollingBack: false,
    countdown: 5,
    autoReloadActive: false,
    serviceStatus: ServiceStatus.ONLINE
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null, 
      isHealing: false, 
      isRollingBack: false, 
      countdown: 5,
      autoReloadActive: false,
      serviceStatus: ServiceStatus.ONLINE
    };
  }

  public componentDidMount() {
    // Resilience Engine Integration
    this.statusSubscription = resilienceEngine.getStatus().subscribe(status => {
      this.setState({ serviceStatus: status });
    });

    // PROTOKOL FIX: Blank screen detection — extended timeout & no auto-reload.
    // Previous: 3-second timeout + direct window.location.reload() call.
    // Bug: Heavy initialization (Dexie, OPFS, VFS, WebLLM) takes 10-30+ seconds during boot.
    // The 3s check fired while the splash screen was still loading, saw "no content" (the splash
    // screen is rendered inside #root but the check used innerText which can be empty during CSS
    // transitions), then called window.location.reload() → reload loop.
    // Fix: 30-second timeout. Never call window.location.reload() automatically — let the error
    // boundary UI show instead so the user can decide to recover or the system can self-heal.
    this.blankScreenTimeoutId = setTimeout(() => {
      const doc = window['document'];
      const root = doc.getElementById('root');
      if (root && !this.state.hasError) {
        const rect = root.getBoundingClientRect();
        const hasVisibleDimensions = rect.width > 0 && rect.height > 0;
        // Only trigger if root has ZERO children (truly empty DOM) AND zero dimensions.
        // A splash screen has children, so this check won't fire during normal boot.
        const isTrulyEmpty = root.children.length === 0 && !hasVisibleDimensions;
        
        if (isTrulyEmpty) {
          console.error('[SupremeProtocol] Truly blank screen detected after 30s! Showing recovery UI.');
          this.setState({
            hasError: true,
            error: new Error('Blank Screen Detected: Application failed to render any content within 30 seconds.'),
            errorInfo: { componentStack: 'Root element is completely empty after extended wait.' }
          });
          // Do NOT call window.location.reload() here — the error UI will show and the user
          // can trigger recovery manually or wait for AI auto-heal.
        }
      }
    }, 30000);
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });

    // Auto-reload logic
    const reloadCount = parseInt(safeStorage.getItem('ham_reload_count') || '0', 10);
    const lastReloadTime = parseInt(safeStorage.getItem('ham_last_reload_time') || '0', 10);
    const now = Date.now();

    // Reset count if last reload was more than 1 minute ago
    if (now - lastReloadTime > 60000) {
      safeStorage.setItem('ham_reload_count', '0');
    }

    // Only auto-reload if we haven't tried too many times recently
    if (reloadCount < 3) {
      this.setState({ autoReloadActive: true });
      this.startCountdown(reloadCount);
    }
  }

  public componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.blankScreenTimeoutId) {
      clearTimeout(this.blankScreenTimeoutId);
    }
    if (this.fallbackHealTimeoutId) {
      clearTimeout(this.fallbackHealTimeoutId);
    }
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

  private handleAutoHeal = () => {
    if (this.props.onAutoHeal && this.state.error && this.state.errorInfo) {
      this.setState({ isHealing: true });
      try {
        this.props.onAutoHeal(this.state.error, this.state.errorInfo);
      } catch (e) {
        console.error("Auto-heal failed:", e);
        this.fallbackHeal();
      }
    } else {
      this.fallbackHeal();
    }
  };

  private fallbackHeal = () => {
    this.setState({ isHealing: true });
    // Smart cleanup: only remove specific keys that might cause crashes
    const keysToRemove = ['ham_generated_project', 'ham_current_view', 'ham_active_file'];
    keysToRemove.forEach(key => safeStorage.removeItem(key));
    
    this.fallbackHealTimeoutId = setTimeout(() => window.location.reload(), 1000);
  };

  private handleRollback = () => {
    if (this.props.onRollback && this.state.error && this.state.errorInfo) {
      this.setState({ isRollingBack: true });
      this.props.onRollback(this.state.error, this.state.errorInfo);
    }
  };

  private handleManualReload = () => {
    // Reset reload count on manual reload so user isn't stuck in "too many reloads" state next time
    safeStorage.setItem('ham_reload_count', '0');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center p-6 text-white font-sans backdrop-blur-sm">
          <div className="max-w-2xl w-full bg-[#141414] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            
            <div className="p-6 border-b border-white/10 flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 animate-pulse">
                <ShieldAlert size={28} className="text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-400 tracking-tight">System Critical Failure</h1>
                <p className="text-sm text-gray-400 mt-1">The operating system encountered an unrecoverable error.</p>
              </div>
            </div>
            
            <div className="p-6 bg-[#0a0a0a]/50 overflow-auto max-h-[300px] relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stack Trace</h3>
                <span className="text-[10px] font-mono text-gray-600">{new Date().toISOString()}</span>
              </div>
              <pre className="text-[11px] text-red-300/90 font-mono whitespace-pre-wrap break-words bg-black/40 p-4 rounded-lg border border-red-500/10 custom-scrollbar">
                {this.state.error && this.state.error.toString()}
                {'\n'}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <div className="p-6 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 bg-[#141414] relative z-10">
              {this.state.autoReloadActive && this.state.countdown > 0 && (
                <div className="flex items-center text-sm text-gray-400 mr-auto bg-white/5 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
                  Auto-recovering in <span className="font-bold text-white mx-1">{this.state.countdown}</span>s
                </div>
              )}
              
              <button
                onClick={this.handleManualReload}
                className="px-4 py-2 rounded-lg font-medium text-sm bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-white/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Reboot System
              </button>
              
              {this.props.onRollback && (
                <button
                  onClick={this.handleRollback}
                  disabled={this.state.isRollingBack}
                  className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all border ${
                    this.state.isRollingBack 
                      ? 'bg-yellow-600/20 border-yellow-600/30 text-yellow-500/50 cursor-not-allowed' 
                      : 'bg-yellow-600/10 border-yellow-600/30 text-yellow-500 hover:bg-yellow-600/20'
                  }`}
                >
                  {this.state.isRollingBack ? (
                    <><RefreshCw size={16} className="animate-spin" /> Rolling back...</>
                  ) : (
                    <><History size={16} /> Rollback State</>
                  )}
                </button>
              )}

              <button
                onClick={this.handleAutoHeal}
                disabled={this.state.isHealing}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all border ${
                  this.state.isHealing 
                    ? 'bg-blue-600/20 border-blue-600/30 text-blue-500/50 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                }`}
              >
                {this.state.isHealing ? (
                  <><Zap size={16} className="animate-spin" /> Healing...</>
                ) : (
                  <><Zap size={16} /> AI Auto-Heal</>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

