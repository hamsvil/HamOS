 
import './polyfills';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { ConfirmProvider } from './context/ConfirmContext.tsx';
import { GlobalStateProvider } from './contexts/GlobalStateContext.tsx';
import { ErrorInterceptor } from './HAS/interceptor';
import './index.css';
// import { registerSW } from 'virtual:pwa-register';

// 0. BOOT ERROR INTERCEPTOR IMMEDIATELY
ErrorInterceptor.boot();

console.log("[HAM ENGINE] BOOTING APEX V4.0...");
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.innerHTML = `
    <div id="debug-overlay" style="position:fixed;inset:0;background:#000;color:#0f0;padding:20px;font-family:monospace;z-index:99999;display:flex;flex-direction:column;gap:10px;">
      <div style="font-size:20px;font-weight:bold;color:#fff;">[ HAM ENGINE APEX V4.0 ] - INITIALIZING...</div>
      <div id="debug-log">
        <div>> System Pulse: OK</div>
        <div>> Loading Polyfills: SUCCESS</div>
        <div>> Neural Interceptor: ACTIVE</div>
      </div>
      <div style="margin-top:auto;color:#444;font-size:10px;">If this screen persists for more than 10 seconds, a critical bridge failure has occurred.</div>
    </div>
  `;
}

function updateDebug(msg: string) {
  const log = document.getElementById('debug-log');
  if (log) {
    const div = document.createElement('div');
    div.textContent = `> ${msg}`;
    log.appendChild(div);
  }
}

// 1. Storage Persistence Request
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  updateDebug("Requesting Storage Persistence...");
  navigator.storage.persist().catch(err => console.warn("Storage persistence error:", err));
}

// 2. Memory Monitoring (OOM Protection)
if (typeof navigator !== 'undefined' && (navigator as any).deviceMemory) {
  const ram = (navigator as any).deviceMemory;
  if (ram < 4) {
    console.warn("Low Memory Device detected. Enabling Lite Mode.");
    document.documentElement.classList.add('lite-mode');
  }
}

// 3. Global Exception Handler (Fail-Safe UI)
window.addEventListener('error', (event) => {
  console.error("Global Error Caught:", event.error);
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `<div style="padding: 20px; font-family: monospace; background: #222; color: #f55;"><h1>FATAL INIT ERROR</h1><pre>${event.error?.stack || event.message}</pre></div>`;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `<div style="padding: 20px; font-family: monospace; background: #222; color: #f55;"><h1>FATAL ASYNC ERROR</h1><pre>${event.reason?.stack || event.reason}</pre></div>`;
  }
});

// 4. Service Worker Registration
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // registerSW({ immediate: true });
  } else {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

const startApp = () => {
  updateDebug("Mounting React VDOM...");
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Fatal Error: Root element not found");
    return;
  }

  // Remove debug overlay after React takes over (optional, but React will clear innerHTML anyway)
  // setTimeout(() => { const ov = document.getElementById('debug-overlay'); if (ov) ov.remove(); }, 2000);

  // Remove StrictMode to prevent double-initialization of side-effects in complex state stores
  createRoot(rootElement).render(
    <ErrorBoundary>
      <GlobalStateProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </GlobalStateProvider>
    </ErrorBoundary>
  );
};

// Start application. 
// Initialization (Storage, DBs, AI) is handled within App.tsx to ensure 
// splash screen and progress updates are visible to the user.
updateDebug("Starting Application Core...");
try {
  startApp();
} catch (err) {
  console.error("Critical Failure during startApp:", err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; font-family: monospace; background: #222; color: #f55;"><h1>CRITICAL RENDER ERROR</h1><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
  }
}
