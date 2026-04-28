/* eslint-disable no-useless-assignment */
/**
 * DiagnosticConsoleService
 * Captures and categorizes logs, errors, and warnings for interactive debugging.
 */
export interface DiagnosticEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
  source?: string;
}

export class DiagnosticConsoleService {
  private static instance: DiagnosticConsoleService;
  private logs: DiagnosticEntry[] = [];
  private listeners: ((logs: DiagnosticEntry[]) => void)[] = [];

  private constructor() {
    this.interceptConsole();
  }

  public static getInstance(): DiagnosticConsoleService {
    if (!DiagnosticConsoleService.instance) {
      DiagnosticConsoleService.instance = new DiagnosticConsoleService();
    }
    return DiagnosticConsoleService.instance;
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = (...args) => {
      this.addEntry('log', args.join(' '));
      originalLog.apply(console, args);
    };
    console.warn = (...args) => {
      this.addEntry('warn', args.join(' '));
      originalWarn.apply(console, args);
    };
    console.error = (...args) => {
      this.addEntry('error', args.join(' '));
      originalError.apply(console, args);
    };
    console.info = (...args) => {
      this.addEntry('info', args.join(' '));
      originalInfo.apply(console, args);
    };
  }

  private addEntry(type: DiagnosticEntry['type'], message: string) {
    const entry: DiagnosticEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
    };
    this.logs.push(entry);
    this.notify();
  }

  public subscribe(listener: (logs: DiagnosticEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l([...this.logs]));
  }

  public getLogs(): DiagnosticEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
    this.notify();
  }
}

export const diagnosticConsoleService = DiagnosticConsoleService.getInstance();
