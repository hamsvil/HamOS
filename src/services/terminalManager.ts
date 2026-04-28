/* eslint-disable no-useless-assignment */
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

class TerminalManager {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private webLinksAddon: WebLinksAddon | null = null;
  private isInitialized = false;

  getTerminal(): Terminal {
    if (!this.terminal) {
      this.terminal = new Terminal({
        cursorBlink: true,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 12,
        lineHeight: 1.2,
        theme: {
          background: '#0a0a0a',
          foreground: '#cccccc',
          cursor: '#00ffcc',
          selectionBackground: 'rgba(0, 255, 204, 0.3)',
        },
        allowProposedApi: true
      });

      this.fitAddon = new FitAddon();
      this.webLinksAddon = new WebLinksAddon();
      this.terminal.loadAddon(this.fitAddon);
      this.terminal.loadAddon(this.webLinksAddon);
    }
    return this.terminal;
  }

  getFitAddon(): FitAddon | null {
    return this.fitAddon;
  }

  setInitialized(val: boolean) {
    this.isInitialized = val;
  }

  getIsInitialized() {
    return this.isInitialized;
  }

  dispose() {
    if (this.terminal) {
      try {
        this.terminal.dispose();
      } catch (e) {
        console.error('Terminal dispose error:', e);
      }
      this.terminal = null;
      this.fitAddon = null;
      this.webLinksAddon = null;
      this.isInitialized = false;
    }
  }
}

export const terminalManager = new TerminalManager();
