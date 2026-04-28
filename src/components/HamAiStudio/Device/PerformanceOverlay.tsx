 
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, Database, Zap, BarChart3 } from 'lucide-react';

export default function PerformanceOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState({
    fps: 60,
    memory: 0,
    cpu: 0,
    latency: 0,
    vfsSize: 0
  });

  useEffect(() => {
    const handleToggle = () => setIsVisible(prev => !prev);
    window.addEventListener('toggle-perf-overlay', handleToggle);
    
    let lastTime = performance.now();
    let frames = 0;
    let lastLoop = Date.now();
    
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTime;
      const currentFps = Math.round((frames * 1000) / delta);
      
      // Real Memory Usage (Chrome/Android WebView only)
      const mem = (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 0;
      
      // CPU Proxy: Event Loop Lag
      // If the main thread is blocked, this delta will be high.
      const nowTime = Date.now();
      const lag = nowTime - lastLoop - 1000; // Expected 1000ms interval
      const cpuProxy = Math.min(100, Math.max(0, Math.round(lag / 10))); // Rough estimate: 100ms lag = 10% "load" relative to responsiveness
      lastLoop = nowTime;

      setStats({
        fps: currentFps,
        memory: mem,
        cpu: cpuProxy,
        latency: Math.round(lag), // Real lag in ms
        vfsSize: 0 // Placeholder until VFS is real
      });
      
      frames = 0;
      lastTime = now;
    }, 1000);

    let rafId: number;
    const frameCounter = () => {
      frames++;
      rafId = requestAnimationFrame(frameCounter);
    };
    rafId = requestAnimationFrame(frameCounter);

    return () => {
      window.removeEventListener('toggle-perf-overlay', handleToggle);
      clearInterval(interval);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed top-20 right-4 z-[200] bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none select-none w-48"
    >
      <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
        <Activity size={14} className="text-emerald-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">System Monitor</span>
      </div>
      
      <div className="space-y-3">
        <StatItem icon={<Zap size={12} className="text-yellow-400" />} label="FPS" value={stats.fps} unit="" color={stats.fps > 50 ? 'text-emerald-400' : 'text-yellow-400'} />
        <StatItem icon={<Cpu size={12} className="text-blue-400" />} label="MAIN THREAD LAG" value={stats.latency} unit="ms" color="text-blue-400" />
        <StatItem icon={<Database size={12} className="text-purple-400" />} label="JS HEAP" value={stats.memory} unit="MB" color="text-purple-400" />
      </div>

      <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
        <span className="text-[8px] text-white/40 uppercase font-bold">Engine Status</span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${stats.fps > 30 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
          <span className={`text-[8px] ${stats.fps > 30 ? 'text-emerald-400' : 'text-red-400'} font-bold uppercase`}>{stats.fps > 30 ? 'Optimal' : 'Struggling'}</span>
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ icon, label, value, unit, color }: { icon: React.ReactNode, label: string, value: number, unit: string, color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[9px] font-bold text-white/60 uppercase">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
        <span className="text-[8px] text-white/30 font-bold">{unit}</span>
      </div>
    </div>
  );
}
