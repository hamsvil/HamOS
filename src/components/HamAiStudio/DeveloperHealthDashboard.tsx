 
import React, { useState, useEffect } from 'react';
import { Activity, HardDrive, Cpu, MemoryStick } from 'lucide-react';
import { vfs } from '../../services/vfsService';

export default function DeveloperHealthDashboard() {
  const [metrics, setMetrics] = useState({ fps: 0, memory: 0, vfsLatency: 0 });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let frameId: number;
    
    const loop = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: frameCount,
          memory: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0,
          vfsLatency: Math.round(vfs.getLastLatency())
        }));
        frameCount = 0;
        lastTime = now;
      }
      frameId = requestAnimationFrame(loop);
    };
    
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-md border border-white/10 text-zinc-300 text-[11px] font-mono p-3 rounded-lg shadow-2xl pointer-events-none z-[1000] flex flex-col gap-2 min-w-[180px]">
      <div className="flex items-center gap-2 text-zinc-100 font-semibold border-b border-white/10 pb-2 mb-1">
        <Activity size={12} className="text-blue-400" />
        <span>System Health</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Cpu size={10} /> FPS</div>
        <span className="text-zinc-100">{metrics.fps}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><MemoryStick size={10} /> MEM</div>
        <span className="text-zinc-100">{metrics.memory}MB</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><HardDrive size={10} /> VFS LAT</div>
        <span className={metrics.vfsLatency > 100 ? "text-red-400" : "text-green-400"}>
          {metrics.vfsLatency}ms
        </span>
      </div>
    </div>
  );
}
