import React, { useState } from 'react';
import { Smartphone, Package, Loader2, CheckCircle, AlertTriangle, Terminal, Download, Globe } from 'lucide-react';
import { androidBuildService } from '../../services/androidBuildService';
import { useProjectStore } from '../../store/projectStore';

export default function DeploySection() {
    const [isBuilding, setIsBuilding] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const project = useProjectStore((state) => state.project);

    const appendLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleBuild = async () => {
        if (!project) {
            setError("No active project found. Please open a project first.");
            return;
        }

        setIsBuilding(true);
        setLogs([]);
        setResult(null);
        setError(null);

        appendLog(`Initiating build for: ${project.name}`);

        try {
            const apkPath = await androidBuildService.build(project, (msg) => {
                appendLog(msg);
            });
            setResult(apkPath);
            appendLog(`Build completed successfully! APK located at: ${apkPath}`);
        } catch (e: any) {
            const errorMsg = e.message || String(e);
            setError(errorMsg);
            appendLog(`CRITICAL ERROR: ${errorMsg}`);
            
            if (errorMsg === "NATIVE_BRIDGE_MISSING") {
                appendLog("HINT: Native environment not detected. Are you running in a standard browser?");
            }
        } finally {
            setIsBuilding(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-violet-500/5 border border-violet-500/10 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                        <Smartphone size={24} className="text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Native APK Builder</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Convert your project into a native Android application.</p>
                    </div>
                </div>
                <button
                    onClick={handleBuild}
                    disabled={isBuilding || !project}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
                        isBuilding 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-95'
                    }`}
                >
                    {isBuilding ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                    {isBuilding ? 'Building System...' : 'Start Native Build'}
                </button>
            </div>

            {/* Build Status / Errors */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-red-400 uppercase">Build Interrupted</span>
                        <p className="text-xs text-red-300/80 mt-1">{error}</p>
                        {error === "NATIVE_BRIDGE_MISSING" && (
                            <div className="mt-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                                <p className="text-[9px] text-red-400 font-mono leading-relaxed">
                                    The Native Builder requires the Ham AiStudio Android Host. 
                                    Standard browser environments can only use Web Exports.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {result && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div className="flex flex-col flex-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase">Success Vector Stabilized</span>
                        <div className="mt-2 flex items-center justify-between">
                            <code className="text-[9px] bg-emerald-500/5 px-2 py-1 rounded truncate max-w-[200px] text-emerald-300/60 font-mono">
                                {result}
                            </code>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors">
                                <Download size={12} />
                                Install APK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Console */}
            {(logs.length > 0 || isBuilding) && (
                <div className="flex flex-col bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                    <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <Terminal size={12} className="text-zinc-500" />
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Build Log Console</span>
                        </div>
                        {isBuilding && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
                    </div>
                    <div className="p-4 h-64 overflow-y-auto font-mono text-[9px] space-y-1 custom-scrollbar">
                        {logs.map((log, i) => (
                            <div key={i} className="text-zinc-400">
                                <span className="opacity-30 mr-2">[{i+1}]</span>
                                {log}
                            </div>
                        ))}
                        {isBuilding && (
                            <div className="text-violet-400 animate-pulse italic">
                                &gt; Threading quantum resources...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Platform Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                        <Globe size={12} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Web Target</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">PWA & Static Web support enabled by default.</p>
                </div>
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                        <Smartphone size={12} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Native Target</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Android SDK 30 (Android 11) compatibility.</p>
                </div>
            </div>
        </div>
    );
}
