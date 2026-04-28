 
import { useState, useEffect } from 'react';

export function useSystemState() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let batteryRef: any = null;
    const handleLevelChange = () => {
      if (batteryRef) setBatteryLevel(Math.round(batteryRef.level * 100));
    };
    const handleChargingChange = () => {
      if (batteryRef) setIsCharging(batteryRef.charging);
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryRef = battery;
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        battery.addEventListener('levelchange', handleLevelChange);
        battery.addEventListener('chargingchange', handleChargingChange);
      }).catch((e: any) => console.warn('[useSystemState] Battery API error:', e));
    }
    return () => {
      if (batteryRef) {
        batteryRef.removeEventListener('levelchange', handleLevelChange);
        batteryRef.removeEventListener('chargingchange', handleChargingChange);
      }
    };
  }, []);

  return { isOnline, batteryLevel, isCharging };
}
