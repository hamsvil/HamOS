export function initErrorInterceptor() {
  if (typeof window === 'undefined') return;
  
  // Flag agar tidak double injection jika HMR trigger reload file ini saja
  if ((window as any).__hamli_error_interceptor_active) return;
  (window as any).__hamli_error_interceptor_active = true;

  const originalConsoleError = console.error;

  // Intercept `console.error`
  console.error = function (...args: any[]) {
    // Jalankan aslinya dulu
    originalConsoleError.apply(console, args);

    try {
      const message = args.map(arg => 
        typeof arg === 'object' ? (arg instanceof Error ? arg.message : JSON.stringify(arg)) : String(arg)
      ).join(' ');

      // Cari stack trace
      let errorStack = '';
      const errorObj = args.find(arg => arg instanceof Error);
      if (errorObj && errorObj.stack) {
        errorStack = errorObj.stack;
      } else {
        // Mock a stack if it's just a string error
        errorStack = new Error().stack || '';
      }

      fetch('/api/sys-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          source: 'console.error',
          lineno: 0,
          colno: 0,
          errorStack
        })
      }).catch(err => { /* fail silently if network error */ });
    } catch (e) {
      // safe fallback
    }
  };

  // Intercept uncaught errors
  window.addEventListener('error', (event: ErrorEvent) => {
    fetch('/api/sys-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: event.message,
        source: event.filename || 'windowGlobal',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        errorStack: event.error?.stack || ''
      })
    }).catch(err => {});
  });

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    fetch('/api/sys-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Unhandled Promise Rejection: ' + (event.reason?.message || event.reason),
        source: 'unhandledrejection',
        lineno: 0,
        colno: 0,
        errorStack: event.reason?.stack || ''
      })
    }).catch(err => {});
  });

  console.log('🛡️ Active: Supreme Protocol Error Sentinel attached.');
}
