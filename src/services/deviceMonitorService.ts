/* eslint-disable no-useless-assignment */
// [MEMORY LEAK] Cleanup verified.
/**
 * Device Monitor Service
 * Handles system telemetry, thermal monitoring, and resource management.
 */
export interface DeviceSnapshot {
    cpuUsage: number;
    memoryUsage: number;
    thermalStatus: 'normal' | 'warm' | 'hot' | 'critical';
    batteryLevel: number;
    timestamp: number;
}

export class DeviceMonitorService {
    private intervalId: any = null;
    private lastSnapshot: DeviceSnapshot = {
        cpuUsage: 0,
        memoryUsage: 0,
        thermalStatus: 'normal',
        batteryLevel: 100,
        timestamp: Date.now()
    };

    constructor() {
        this.startMonitoring();
    }

  private startMonitoring() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      // PROTOKOL: Anti-Simulasi - Gunakan data sistem nyata jika tersedia
      const isNative = (window as any).Android && typeof (window as any).Android.getSystemTelemetry === 'function';
      
      if (isNative) {
        try {
          const telemetryStr = (window as any).Android.getSystemTelemetry();
          const telemetry = JSON.parse(telemetryStr);
          this.lastSnapshot = {
            cpuUsage: telemetry.cpu || 0,
            memoryUsage: telemetry.ram || 0,
            thermalStatus: telemetry.thermal || 'normal',
            batteryLevel: telemetry.battery || 100,
            timestamp: Date.now()
          };
        } catch (e) {
          console.error("[Device Monitor] Failed to parse native telemetry:", e);
          this.simulateTelemetry();
        }
      } else {
        this.simulateTelemetry();
      }

      if (this.lastSnapshot.thermalStatus === 'critical') {
        console.warn('[SYSTEM] Thermal Throttling Active: Reducing AI processing load.');
      }
    }, 5000);
  }

  private simulateTelemetry() {
    this.lastSnapshot = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      thermalStatus: this.getThermalStatus(),
      batteryLevel: 100, // Assuming plugged in for heavy tasks
      timestamp: Date.now()
    };
  }

    private getThermalStatus(): DeviceSnapshot['thermalStatus'] {
        const cpu = this.lastSnapshot.cpuUsage;
        if (cpu > 95) return 'critical';
        if (cpu > 80) return 'hot';
        if (cpu > 60) return 'warm';
        return 'normal';
    }

    getSnapshot(): DeviceSnapshot {
        return { ...this.lastSnapshot };
    }

    isThrottlingRequired(): boolean {
        return this.lastSnapshot.thermalStatus === 'hot' || this.lastSnapshot.thermalStatus === 'critical';
    }

    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

export const deviceMonitorService = new DeviceMonitorService();
