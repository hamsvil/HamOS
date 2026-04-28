 
import { Anonymizer } from './Anonymizer';
import { SAEREWorkerProxy } from './SAEREWorkerProxy';

export class ErrorInterceptor {
    private static isInternal = false;

    static runInternal<T>(fn: () => T): T {
        this.isInternal = true;
        try { return fn(); } finally { this.isInternal = false; }
    }

    static boot() {
        const origLog = console.log;
        const origWarn = console.warn;
        const origErr = console.error;

        const sendToBackend = (msg: string, type: string) => {
            fetch('/api/sys-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `[${type.toUpperCase()}] ${msg}`, source: 'console', errorStack: '' })
            }).catch(() => {});
        };

        console.log = (...args: any[]) => {
            origLog(...args);
            if (this.isInternal) return;
            const msg = args.map(a => String(a)).join(' ');
            sendToBackend(msg, 'log');
        };

        console.warn = (...args: any[]) => {
            origWarn(...args);
            if (this.isInternal) return;
            const msg = args.map(a => String(a)).join(' ');
            sendToBackend(msg, 'warn');
        };

        console.error = (...args: any[]) => {
            origErr(...args);
            if (this.isInternal) return;
            try {
                const msg = args.map(a => {
                    try {
                        if (a === undefined) return 'undefined';
                        if (a === null) return 'null';
                        if (typeof a === 'function') return `[Function: ${a.name || 'anonymous'}]`;
                        if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack}`;
                        if (typeof a === 'object') {
                            try {
                                return JSON.stringify(a);
                            } catch (e) {
                                const className = (a && a.constructor && a.constructor.name) ? a.constructor.name : 'Object';
                                return `[Complex Object: ${className}]`;
                            }
                        }
                        return String(a);
                    } catch (e) {
                        return '[Unserializable Object]';
                    }
                }).join(' ');
                const safeMsg = Anonymizer.scrub(msg);
                SAEREWorkerProxy.sendError(safeMsg);
                
                // [Auto-Fix Swarm Dispatch]
                sendToBackend(msg, 'error');
            } catch (fatal) {
                origErr('[SAERE_INTERCEPTOR_FATAL]', fatal);
            }
        };

        window.addEventListener('error', e => { 
            if (!this.isInternal) { 
                const safeMsg = Anonymizer.scrub(`${e.message} at ${e.filename}:${e.lineno}`);
                SAEREWorkerProxy.sendError(safeMsg);
                
                // [Auto-Fix Swarm Dispatch]
                fetch('/api/sys-error', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: e.message, source: e.filename, lineno: e.lineno, colno: e.colno, errorStack: e.error?.stack || '' })
                }).catch(() => {});
            } 
        });

        window.addEventListener('unhandledrejection', e => { 
            if (!this.isInternal) { 
                const reasonStr = String(e.reason);
                const safeMsg = Anonymizer.scrub(`Unhandled Rejection: ${reasonStr}`);
                SAEREWorkerProxy.sendError(safeMsg);
                
                // [Auto-Fix Swarm Dispatch]
                fetch('/api/sys-error', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Unhandled Rejection: ${reasonStr}`, source: 'unhandledrejection', errorStack: e.reason?.stack || '' })
                }).catch(() => {});
            } 
        });
        
        console.log('[SAERE] ErrorInterceptor booted with v7.0 Anonymizer.');
    }
}
