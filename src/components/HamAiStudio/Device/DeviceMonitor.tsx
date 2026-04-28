 
import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCcw, Activity, Battery, Wifi, Cpu, MemoryStick, Terminal, Play, Pause, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deviceMonitorService, DeviceSnapshot } from '../../../services/deviceMonitorService';

interface DeviceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeviceMonitor({ isOpen, onClose }: DeviceMonitorProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memUsage, setMemUsage] = useState(0);
  const [_batteryLevel, setBatteryLevel] = useState(100);
  const [isLogcatActive, setIsLogcatActive] = useState(false);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
        interval = setInterval(() => {
            const stats: DeviceSnapshot = deviceMonitorService.getSnapshot();
            setMemUsage(Math.round(stats.memoryUsage));
            setCpuUsage(Math.round(stats.cpuUsage));
            setBatteryLevel(Math.round(stats.batteryLevel));
            setUptime(prev => prev + 1);
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    }
  }, [isOpen]);

  // Real Device Logcat Stream (Native Bridge)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isAndroid = typeof window !== 'undefined' && (window as any).Android;

    if (isOpen && isLogcatActive && isAndroid) {
        interval = setInterval(() => {
          try {
            const newLogs = JSON.parse((window as any).Android.getLogs() || "[]");
            if (newLogs.length > 0) {
              setLogs(prev => [...prev.slice(-50), ...newLogs]);
            }
            // Native stats override WebContainer stats if available
            const stats = JSON.parse((window as any).Android.getStats() || "{}");
            if (stats.cpu) setCpuUsage(stats.cpu);
            if (stats.mem) setMemUsage(stats.mem);
            if (stats.battery) setBatteryLevel(stats.battery);
          } catch (e) {
            console.error("Failed to read from Native Bridge", e);
          }
        }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isLogcatActive]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-4 w-80 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-md font-mono text-xs">
      <div className="bg-[#141414] px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-green-400 font-bold">
            <Smartphone size={14} />
            <span>Device Monitor</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${typeof window !== 'undefined' && (window as any).Android ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
            <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">
              {typeof window !== 'undefined' && (window as any).Android ? 'Native Bridge Connected' : 'WebContainer Environment'}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsLogcatActive(!isLogcatActive)} className={`p-1 rounded hover:bg-white/10 ${isLogcatActive ? 'text-green-400' : 'text-gray-500'}`}>
            {isLogcatActive ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => setLogs([])} className="p-1 text-gray-500 hover:text-white rounded hover:bg-white/10">
            <RefreshCw size={14} />
          </button>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-px bg-white/10 border-b border-white/10">
        <div className="bg-[#0a0a0a] p-2 flex flex-col items-center justify-center">
          <Cpu size={14} className="text-blue-400 mb-1" />
          <span className="text-gray-400 text-[10px]">CPU</span>
          <span className="font-bold text-white">{cpuUsage}%</span>
        </div>
        <div className="bg-[#0a0a0a] p-2 flex flex-col items-center justify-center">
          <MemoryStick size={14} className="text-purple-400 mb-1" />
          <span className="text-gray-400 text-[10px]">RAM</span>
          <span className="font-bold text-white">{memUsage}MB</span>
        </div>
        <div className="bg-[#0a0a0a] p-2 flex flex-col items-center justify-center">
          <Activity size={14} className="text-green-400 mb-1" />
          <span className="text-gray-400 text-[10px]">UPTIME</span>
          <span className="font-bold text-white">{uptime}s</span>
        </div>
      </div>

      {/* Logcat Stream */}
      <div className="h-48 bg-[#050505] p-2 overflow-y-auto space-y-1 font-mono text-[10px]">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 italic">
            <Terminal size={24} className="mb-2 opacity-20" />
            <p>Waiting for device logs...</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`break-all ${
              log.includes('[ERROR]') ? 'text-red-400' : 
              log.includes('[WARN]') ? 'text-yellow-400' : 
              log.includes('[DEBUG]') ? 'text-blue-400' : 'text-gray-400'
            }`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
