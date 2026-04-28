import { useEffect } from 'react';
import { vfs } from '../services/vfsService';
import { useToast } from '../context/ToastContext';

export const useGlobalErrors = () => {
  const { showToast } = useToast();

  useEffect(() => {
    const logToFile = async (msg: string, stack?: string) => {
      try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${msg}\n${stack ? `Stack: ${stack}\n` : ''}---\n`;
        await vfs.appendFile('/logs/erorr.log', logEntry, 'error-logger');
      } catch (e) {
        // silent fallback
      }
    };

    const originalConsoleError = console.error;
    let errorInterceptCount = 0;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      if (errorInterceptCount < 20) {
        errorInterceptCount++;
        const errMsg = args.map(a => typeof a === 'object' ? JSON.stringify(a, Object.getOwnPropertyNames(a)) : String(a)).join(' ');
        
        vfs.appendFile('/logs/console_errors.log', `[${new Date().toISOString()}] CONSOLE.ERROR:\n${errMsg}\n---\n`, 'system').catch(() => {});
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[GLOBAL_ERROR]', event.error);
      showToast(`System Error: ${event.message}`, 'error');

      const errorMsg = event.message || 'Unknown global error';
      const errorStack = event.error?.stack || 'No stack trace available';
      logToFile(errorMsg, errorStack);

      try {
        const rawLogs = localStorage.getItem('ham_system_logs') || '[]';
        let logs: any[] = [];
        try {
          logs = JSON.parse(rawLogs);
        } catch (e) {
          console.warn('[App] Failed to parse logs, resetting...', e);
          logs = [];
        }

        if (Array.isArray(logs)) {
          const serializableError = {
            t: Date.now(),
            m: typeof event.message === 'string' ? event.message : 'Complex error object',
            s: event.error && typeof event.error === 'object' ? String(event.error.stack || 'No stack trace') : 'No stack trace'
          };
          logs.push(serializableError);
          try {
            localStorage.setItem('ham_system_logs', JSON.stringify(logs.slice(-50)));
          } catch (e) {
            console.warn('[App] LocalStorage quota exceeded or non-serializable data', e);
          }
        }
      } catch (_e) {
        // Ignore stats save error
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[UNHANDLED_REJECTION]', event.reason);
      showToast(`Async Error: ${event.reason?.message || 'Unknown rejection'}`, 'error');

      const errorMsg = `Unhandled Rejection: ${event.reason?.message || 'Unknown rejection'}`;
      const errorStack = event.reason?.stack || 'No stack trace available';
      logToFile(errorMsg, errorStack);
    };

    window.addEventListener('error', handleGlobalError);
    window.onunhandledrejection = handleUnhandledRejection;

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.onunhandledrejection = null;
    };
  }, [showToast]);
};
