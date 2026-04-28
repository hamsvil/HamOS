// Global Type Declarations for Ham Agentic Shadow

interface Navigator {
  deviceMemory?: number;
}

interface Window {
  Android?: {
    showToast: (message: string) => void;
    getAppVersion: () => string;
    [key: string]: any;
  };
  AndroidBuilder?: any;
  __nativeBridgeCallbacks?: Record<string, Function>;
  __nativeBridgeCallbackHandler?: (id: string, data: any) => void;
}

declare module '*.worker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}
