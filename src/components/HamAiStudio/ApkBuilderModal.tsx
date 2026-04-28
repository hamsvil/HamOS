import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Download, Loader2, Terminal, Package, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProjectData } from './types';
import { io } from 'socket.io-client';

interface ApkBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData | null;
}

const ApkBuilderModal: React.FC<ApkBuilderModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [appName, setAppName] = useState(project?.name || '');
  const [packageName, setPackageName] = useState('com.ham.studio');
  const [version, setVersion] = useState('1.0.0');
  const [buildType, setBuildType] = useState<'source-zip' | 'android-native'>('source-zip');
  
  const [buildId, setBuildId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'building' | 'waiting-device' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [apkPath, setApkPath] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const logEndRef = useRef<HTMLDivElement>(null);

  const steps = [
    { id: 1, name: 'Build Web', status: progress > 30 ? 'complete' : progress > 0 ? 'active' : 'upcoming' },
    { id: 2, name: 'Package APK', status: progress > 70 ? 'complete' : progress > 30 ? 'active' : 'upcoming' },
    { id: 3, name: 'Download', status: status === 'success' ? 'complete' : progress > 70 ? 'active' : 'upcoming' },
  ];

  useEffect(() => {
    if (project?.name && !appName) setAppName(project.name);
  }, [project, appName]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!isOpen) {
      setBuildId(null);
      setStatus('idle');
      setLogs([]);
      setDownloadUrl(null);
      setProgress(0);
      return;
    }

    const socket = io({ path: '/terminal-socket/' });
    socket.on('apk-build-log', (data: { buildId: string, message: string }) => {
      if (data.buildId === buildId) {
        setLogs(prev => [...prev, data.message]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, buildId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (buildId && (status === 'pending' || status === 'building')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/apk/status/${buildId}`);
          const data = await res.json();
          if (data.status) setStatus(data.status);
          if (data.progress) setProgress(data.progress);
          if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
          if (data.apkPath) setApkPath(data.apkPath);
          if (data.logs) setLogs(data.logs);
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [buildId, status]);

  const handleStartBuild = async () => {
    setStatus('pending');
    setLogs(['Initializing build...']);
    
    try {
      const secretsRes = await fetch('/.hamli-secrets.json');
      const secrets = await secretsRes.json();
      
      const res = await fetch('/api/apk/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secrets.lisa_token}`
        },
        body: JSON.stringify({
          type: buildType,
          config: { appName, packageName, version }
        })
      });
      
      const data = await res.json();
      if (data.buildId) {
        setBuildId(data.buildId);
      } else {
        setStatus('error');
        setLogs(prev => [...prev, 'Failed to start build: ' + (data.error || 'Unknown error')]);
      }
    } catch (err: any) {
      setStatus('error');
      setLogs(prev => [...prev, 'Error: ' + err.message]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Smartphone size={20} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Android APK Builder</h3>
              <p className="text-xs text-gray-400">Target: {project?.name || 'Current Project'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {status === 'idle' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">App Name</label>
                  <input 
                    value={appName} 
                    onChange={e => setAppName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Version</label>
                  <input 
                    value={version} 
                    onChange={e => setVersion(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500/50 transition-colors"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Package Name</label>
                  <input 
                    value={packageName} 
                    onChange={e => setPackageName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Build Strategy</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setBuildType('source-zip')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${buildType === 'source-zip' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                  >
                    <Package size={20} />
                    <span className="text-xs font-medium">Source ZIP</span>
                  </button>
                  <button 
                    onClick={() => setBuildType('android-native')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${buildType === 'android-native' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                  >
                    <Terminal size={20} />
                    <span className="text-xs font-medium">Native (Termux)</span>
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 flex gap-3">
                <Info size={18} className="text-blue-400 shrink-0" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {buildType === 'source-zip' 
                    ? "Generates a complete Android source project as a ZIP. Download and build it manually with Android Studio or Gradle."
                    : "Prepares files for on-device build. Requires Termux with Gradle installed on your target device."
                  }
                </p>
              </div>

              <button
                onClick={handleStartBuild}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Smartphone size={18} />
                START BUILD ENGINE
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-4">
              {/* Stepper */}
              <div className="flex items-center justify-between mb-2">
                {steps.map((step, i) => (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.status === 'complete' ? 'bg-green-500 text-white' :
                        step.status === 'active' ? 'bg-blue-500 text-white animate-pulse' :
                        'bg-white/10 text-gray-500'
                      }`}>
                        {step.status === 'complete' ? <CheckCircle2 size={12} /> : step.id}
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${
                        step.status === 'upcoming' ? 'text-gray-600' : 'text-gray-300'
                      }`}>{step.name}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-[1px] mb-4 ${
                        steps[i+1].status !== 'upcoming' ? 'bg-green-500/50' : 'bg-white/10'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status === 'success' ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : status === 'error' ? (
                    <AlertCircle size={16} className="text-red-400" />
                  ) : (
                    <Loader2 size={16} className="text-green-400 animate-spin" />
                  )}
                  <span className="text-sm font-medium text-white capitalize">{status.replace('-', ' ')}</span>
                </div>
                <span className="text-xs font-mono text-gray-500">{progress}%</span>
              </div>

              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${status === 'error' ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex-1 bg-black/50 rounded-lg border border-white/10 p-4 font-mono text-[10px] overflow-y-auto min-h-[300px] max-h-[400px]">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1 text-gray-400 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-gray-600 mr-2 opacity-50">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>

              {status === 'waiting-device' && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Instructions</h4>
                  <p className="text-[11px] text-gray-300 mb-2">
                    Scripts have been sent to your device storage. Run the following in Termux:
                  </p>
                  <div className="bg-black/40 rounded p-2 font-mono text-[10px] text-blue-300 select-all cursor-copy">
                    sh /sdcard/HamStudio/build.sh
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {status === 'success' && downloadUrl && (
                  <a 
                    href={downloadUrl}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> DOWNLOAD ZIP
                  </a>
                )}
                {status === 'success' && apkPath && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(apkPath);
                      alert('APK Path copied to clipboard');
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    COPY APK PATH
                  </button>
                )}
                {(status === 'success' || status === 'error' || status === 'waiting-device') && (
                  <button 
                    onClick={() => setStatus('idle')}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold border border-white/10 transition-all"
                  >
                    BACK TO CONFIG
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApkBuilderModal;
