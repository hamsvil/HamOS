/* eslint-disable no-useless-assignment */
import { nativeBridge } from '../utils/nativeBridge';

export class EnvironmentChecker {
    private static isNativeCache: boolean | null = null;

    public static isNativeAndroid(): boolean {
        if (this.isNativeCache !== null) {
            return this.isNativeCache;
        }

        // Check for Android WebView specific markers
        const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
        const isAndroid = /android/i.test(userAgent);
        
        // Check for our specific native bridge injection
        const hasNativeBridge = nativeBridge.isAvailable();

        this.isNativeCache = isAndroid && hasNativeBridge;
        return this.isNativeCache;
    }

    public static isWebContainerSupported(): boolean {
        // WebContainers require SharedArrayBuffer and cross-origin isolation
        // which are typically not available in standard Android WebViews without special config
        if (this.isNativeAndroid()) {
            return false;
        }
        
        return typeof SharedArrayBuffer !== 'undefined' && crossOriginIsolated;
    }
}
