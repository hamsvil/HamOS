/* eslint-disable no-useless-assignment */
import { nativeBridge } from '../utils/nativeBridge';

class BackgroundService {
  private isRunning: boolean = false;
  private wakeLock: WakeLockSentinel | null = null;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Try Wake Lock API (Standard Web API)
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        // Wake Lock failed
      }
    }

    // 2. Monitor Visibility
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 3. Native Foreground Service (The Real Solution)
    if (nativeBridge.isAvailable()) {
        try {
            // User requested silent background execution without notification.
            // We rely on WakeLock and standard WebView background capabilities instead
            // of triggering an explicit Android Foreground Service Notification.
        } catch (e) {
            // Failed to configure Native Background Service
        }
    } else {
        // Running in Browser. Process may be suspended by OS when tab is hidden.
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
        // App hidden. If not running in Native Wrapper with Foreground Service, tasks may pause.
    } else {
        // Re-acquire wake lock if lost
        if (this.wakeLock === null && 'wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(lock => this.wakeLock = lock).catch(e => { /* ignore */ });
        }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    if (nativeBridge.isAvailable()) {
        try {
            // We still send the stop signal just in case the native side needs to clean up
            nativeBridge.call('stopBackgroundService');
        } catch (e) {
            // Failed to stop Native Background Service
        }
    }
  }
}

export const backgroundService = new BackgroundService();
