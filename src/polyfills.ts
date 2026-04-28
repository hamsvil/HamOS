/* eslint-disable @typescript-eslint/no-explicit-any */
import { Buffer as BufferPolyfill } from 'buffer';
import * as processPolyfill from 'process';

if (typeof window !== 'undefined') {
  // 1. Buffer Polyfill
  window.Buffer = window.Buffer || BufferPolyfill;
  (window as any).global = window.global || window;
  
  // 2. Process Polyfill
  if (typeof window.process === 'undefined') {
    (window as any).process = {
      ...processPolyfill,
      env: { ...(process?.env || {}) },
      platform: 'browser',
      browser: true,
      nextTick: (cb: Function) => setTimeout(cb, 0),
      cwd: () => '/',
    };
  } else {
    // Merge existing process (from Vite) with our polyfill if needed
    Object.assign(window.process, {
       nextTick: (window.process as any).nextTick || ((cb: Function) => setTimeout(cb, 0)),
       cwd: (window.process as any).cwd || (() => '/'),
    });
  }

  // 3. Global properties
  (globalThis as any).Buffer = (globalThis as any).Buffer || BufferPolyfill;
  (globalThis as any).process = (globalThis as any).process || window.process;
  (globalThis as any).global = (globalThis as any).global || window;

  // 4. FS Stub (Lazy loaded to avoid circular dependencies)
  // Some libraries check for 'fs' on window/global
  if (!(window as any).fs) {
    import('./polyfills/fs').then(m => {
       (window as any).fs = m.fs;
       (globalThis as any).fs = m.fs;
    }).catch(() => {});
  }
}

export { BufferPolyfill as Buffer };

// ============================================================================
// HAM AI-STUDIO: BROWSER CAPABILITY POLYFILLS & FALLBACKS
// ============================================================================

/**
 * Checks if the browser supports the Origin Private File System (OPFS).
 * OPFS is critical for high-performance local storage in The Ham Engine Singularity.
 */
export async function checkOPFSSupport(): Promise<boolean> {
  try {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      return false;
    }
    // Attempt to get the root directory to verify actual support, not just API presence
    await navigator.storage.getDirectory();
    return true;
  } catch (e) {
    console.warn('[Polyfill] OPFS support check failed:', e);
    return false;
  }
}

/**
 * Checks if the browser supports Web Workers (specifically module workers if needed).
 */
export function checkWebWorkerSupport(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Checks if the browser supports WebAssembly (WASM).
 * WASM is required for esbuild, Tree-Sitter, and QuickJS.
 */
export function checkWasmSupport(): boolean {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
  } catch (e) {
    // Fall through
  }
  return false;
}

/**
 * Initializes the environment, applying fallbacks if necessary.
 * Returns a status object indicating which features are degraded.
 */
export async function initializeEnvironmentCapabilities() {
  const capabilities = {
    opfs: await checkOPFSSupport(),
    workers: checkWebWorkerSupport(),
    wasm: checkWasmSupport(),
    isDegraded: false,
    warnings: [] as string[]
  };

  if (!capabilities.wasm) {
    capabilities.isDegraded = true;
    capabilities.warnings.push('WebAssembly is not supported. Core AI and compilation features will not function.');
  }

  if (!capabilities.workers) {
    capabilities.isDegraded = true;
    capabilities.warnings.push('Web Workers are not supported. The UI may freeze during heavy operations.');
  }

  if (!capabilities.opfs) {
    capabilities.isDegraded = true;
    capabilities.warnings.push('OPFS is not supported. Falling back to IndexedDB for storage (slower performance).');
  }

  if (capabilities.isDegraded) {
    console.warn('[HAM AI-Studio] Running in degraded mode:', capabilities.warnings);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ham-env-degraded', { detail: capabilities }));
    }
  }

  return capabilities;
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  initializeEnvironmentCapabilities().catch(console.error);
}

