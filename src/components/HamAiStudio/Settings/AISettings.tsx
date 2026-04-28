 
 
import React, { useState, useEffect } from 'react';
import { Cpu, CloudUpload, Terminal, Copy, Key, Play, Square, RefreshCw, Activity } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { safeStorage } from '../../../utils/storage';
import { useToast } from '../../../context/ToastContext';
import { kaggleLlmService } from '../../../services/kaggleLlmService';
import { useRateLimitStore } from '../../../store/rateLimitStore';

interface AISettingsProps {
  aiModel: string;
  setAiModel: (value: string) => void;
  kaggleEndpoint: string;
  setKaggleEndpoint: (value: string) => void;
  kaggleApiKey: string;
  setKaggleApiKey: (value: string) => void;
  kaggleUsername: string;
  setKaggleUsername: (value: string) => void;
  kaggleKernelSlug: string;
  setKaggleKernelSlug: (value: string) => void;
  aiRamLimit: number;
  setAiRamLimit: (value: number) => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
  aiModel,
  setAiModel,
  kaggleEndpoint,
  setKaggleEndpoint,
  kaggleApiKey,
  setKaggleApiKey,
  kaggleUsername,
  setKaggleUsername,
  kaggleKernelSlug,
  setKaggleKernelSlug,
  aiRamLimit,
  setAiRamLimit
}) => {
  const { showToast } = useToast();
  const [isKaggleStarting, setIsKaggleStarting] = useState(false);
  const [kaggleStatus, setKaggleStatus] = useState<string>('unknown');

  const getRemainingPercentage = useRateLimitStore(state => state.getRemainingPercentage);
  const getRemainingRequests = useRateLimitStore(state => state.getRemainingRequests);
  const getMaxRequests = useRateLimitStore(state => state.getMaxRequests);
  const checkAndResetDaily = useRateLimitStore(state => state.checkAndResetDaily);
  const usedRequests = useRateLimitStore(state => state.usedRequests); // Subscribe to this primitive to trigger re-renders

  useEffect(() => {
    checkAndResetDaily();
  }, [checkAndResetDaily]);

  useEffect(() => {
    if (aiModel === 'kaggle-llm' && kaggleUsername && kaggleApiKey && kaggleKernelSlug) {
      checkKaggleStatus();
    }
  }, [aiModel]);

  const checkKaggleStatus = async () => {
    try {
      const status = await kaggleLlmService.checkKernelStatus(kaggleUsername, kaggleApiKey, kaggleKernelSlug);
      setKaggleStatus(status);
    } catch (e) {
      setKaggleStatus('error');
    }
  };

  const handleToggleKaggle = async () => {
    if (!kaggleUsername || !kaggleApiKey || !kaggleKernelSlug) {
      showToast("Please fill in Kaggle Username, API Key, and Kernel Slug first.", "error");
      return;
    }

    setIsKaggleStarting(true);
    try {
      if (kaggleStatus === 'running') {
        await kaggleLlmService.stopKernel(kaggleUsername, kaggleApiKey, kaggleKernelSlug);
        showToast("Kaggle Kernel stopped successfully.", "success");
        setKaggleStatus('stopped');
      } else {
        showToast("Starting Kaggle Kernel... This may take 3-5 minutes.", "info");
        await kaggleLlmService.startKernel(kaggleUsername, kaggleApiKey, kaggleKernelSlug);
        setKaggleStatus('starting');
        
        // Start polling for endpoint
        kaggleLlmService.pollForEndpoint(kaggleUsername, kaggleApiKey, kaggleKernelSlug, (url) => {
          setKaggleEndpoint(url);
          safeStorage.setItem('kaggle_llm_endpoint', url);
          setKaggleStatus('running');
          showToast(`Kaggle is ready! Endpoint updated: ${url}`, "success");
        });
      }
    } catch (e: any) {
      showToast(`Kaggle Error: ${e.message}`, "error");
    } finally {
      setIsKaggleStarting(false);
    }
  };

  const copyKaggleScript = () => {
    const script = `# Kaggle Setup Script for Ham AI Studio
# Run this in a Kaggle Notebook with GPU enabled (T4 x2 or P100)
# Make sure "Internet" is enabled in the notebook settings.

import os
import time
import subprocess
import re

# 1. Install Dependencies
print("Installing dependencies...")
os.system("curl -fsSL https://ollama.com/install.sh | sh")
os.system("wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb")
os.system("dpkg -i cloudflared-linux-amd64.deb")

# 2. Start Ollama Server in Background
print("Starting Ollama server...")
subprocess.Popen(["ollama", "serve"])
time.sleep(5)  # Wait for server to start

# 3. Pull Model (Choose one based on VRAM)
MODEL_NAME = "gemma:2b" 
# MODEL_NAME = "qwen2.5:14b"
# MODEL_NAME = "llama3.1:8b"

print(f"Pulling model {MODEL_NAME}...")
os.system(f"ollama pull {MODEL_NAME}")

# 4. Start Cloudflare Tunnel
print("Starting tunnel...")
tunnel_process = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://127.0.0.1:11434"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)

# 5. Find and Print the Public URL
for line in tunnel_process.stdout:
    print(line, end='')
    match = re.search(r"https://[a-zA-Z0-9-]+\\.trycloudflare\\.com", line)
    if match:
        print(f"\\n✅ YOUR PUBLIC URL: {match.group(0)}")
        print(f"Copy this URL into Ham AI Studio settings as 'Kaggle Endpoint'.")
        break

# 6. Keep Alive
print("Server is running. Do not close this tab.")
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("Stopping server...")
`;
    navigator.clipboard.writeText(script);
    showToast("Kaggle setup script copied to clipboard!", "success");
  };

  return (
    <>
      <SettingsSection title="AI Configuration" icon={<Cpu size={16} />}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">AI Engine</label>
            <div className="w-full px-2.5 py-2 border border-blue-500/20 rounded-md bg-blue-500/5 text-blue-400 flex items-center gap-2 font-semibold text-xs">
              <Cpu size={14} className="animate-pulse" />
              Ham Agentic Shadow (SAERE v7.2)
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 italic">
              Model locked to Agentic Shadow for maximum stability and performance.
            </p>
          </div>

          {aiModel === 'kaggle-llm' && (
            <div className="space-y-3 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Terminal size={14} className="text-orange-400" />
                  Kaggle / Custom Endpoint
                </h4>
                <button 
                  onClick={copyKaggleScript}
                  className="text-[10px] flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Copy size={10} />
                  Copy Setup Script
                </button>
              </div>
              
              <div>
                <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Kaggle Username</label>
                <input 
                  type="text" 
                  value={kaggleUsername}
                  onChange={(e) => setKaggleUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Kaggle API Key (from kaggle.json)</label>
                <input 
                  type="password" 
                  value={kaggleApiKey}
                  onChange={(e) => setKaggleApiKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Kernel Slug</label>
                <input 
                  type="text" 
                  value={kaggleKernelSlug}
                  onChange={(e) => setKaggleKernelSlug(e.target.value)}
                  placeholder="e.g. johndoe/my-llm-server"
                  className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                <button 
                  onClick={handleToggleKaggle}
                  disabled={isKaggleStarting}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors ${
                    kaggleStatus === 'running' 
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                      : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  {isKaggleStarting ? (
                    <><RefreshCw size={14} className="animate-spin" /> Processing...</>
                  ) : kaggleStatus === 'running' ? (
                    <><Square size={14} /> Stop Kaggle Engine</>
                  ) : (
                    <><Play size={14} /> Start Kaggle Engine</>
                  )}
                </button>
                <button 
                  onClick={checkKaggleStatus}
                  className="p-1.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md text-[var(--text-secondary)] transition-colors"
                  title="Check Status"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)]">
                <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Endpoint URL (Auto-updated or Manual)</label>
                <input 
                  type="text" 
                  value={kaggleEndpoint}
                  onChange={(e) => setKaggleEndpoint(e.target.value)}
                  placeholder="https://xxxx-xx-xx-xx-xx.ngrok-free.app"
                  className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-mono"
                />
              </div>
              
              <p className="text-[10px] text-[var(--text-secondary)] italic">
                Use this to connect to a model running on Kaggle, Colab, or your local machine via tunneling.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">AI RAM Allocation ({aiRamLimit} GB)</label>
            <input 
              type="range" 
              min="1" 
              max="16" 
              step="1"
              value={aiRamLimit}
              onChange={(e) => setAiRamLimit(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
              <span>1 GB</span>
              <span>Default (2 GB)</span>
              <span>16 GB</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Global API Rate Limit (Swarm)" icon={<Activity size={16} />}>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-sky-400" />
                    <span className="text-zinc-100 uppercase tracking-tighter">Neural Core Capacity</span>
                </div>
                <span className={`font-mono ${getRemainingPercentage() > 50 ? 'text-green-400' : getRemainingPercentage() > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {getRemainingPercentage()}% ({getRemainingRequests()} / {getMaxRequests()})
                </span>
              </div>
              
              <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-1000 ease-out shadow-lg ${
                    getRemainingPercentage() > 50 ? 'bg-emerald-500 shadow-emerald-500/20' : 
                    getRemainingPercentage() > 20 ? 'bg-amber-500 shadow-amber-500/20' : 
                    'bg-rose-500 shadow-rose-500/20'
                  }`} 
                  style={{ width: `${getRemainingPercentage()}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-zinc-950/40 rounded-lg border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Requests Used</p>
                      <p className="text-sm font-mono text-zinc-300">{usedRequests}</p>
                  </div>
                  <div className="p-2 bg-zinc-950/40 rounded-lg border border-zinc-800/50">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Auto-Reset At</p>
                      <p className="text-sm font-mono text-zinc-300">05:00 AM</p>
                  </div>
              </div>

              <p className="text-[10px] text-zinc-500 text-center leading-relaxed italic border-t border-zinc-800 pt-3">
                "Kapasitas dihitung dinamis dari akumulasi 8 Supreme Primary Keys + Fallback Keys. Monitoring real-time aktif."
              </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Local AI Configuration (Offline)" icon={<Cpu size={16} />}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Local Model (WebLLM)</label>
            <select 
              value={safeStorage.getItem('quantum_selected_model') || 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'}
              onChange={(e) => {
                safeStorage.setItem('quantum_selected_model', e.target.value);
                showToast(`Model changed to ${e.target.value}. Please reload the page or toggle Local Mode to apply.`, "info");
              }}
              className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
            >
              <option value="TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC">TinyLlama 1.1B (Fastest, 600MB)</option>
              <option value="gemma-2b-it-q4f32_1-MLC">Gemma 2B Instruct (Balanced, 1.5GB)</option>
              <option value="Llama-2-7b-chat-hf-q4f32_1-MLC">Llama 2 7B Chat (High Quality, 4GB)</option>
              <option value="RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC">RedPajama 3B (Good, 2GB)</option>
              <option value="Llama-3-8B-Instruct-q4f32_1-MLC">Llama 3 8B Instruct (Best, 5GB+)</option>
            </select>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Model akan diunduh ke cache browser saat pertama kali digunakan.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border-color)]">
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.gguf,.bin';
                input.onchange = async (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    showToast(`Membaca model ${file.name}...`, 'info');
                    
                    try {
                        const { NativeStorage } = await import('../../../plugins/NativeStorage');
                        const { nativeBridge } = await import('../../../utils/nativeBridge');
                        const path = `/models/${file.name}`;
                        
                        // Ensure directory exists
                        await NativeStorage.mkdir({ path: '/models' });

                        const CHUNK_SIZE = 1024 * 1024; // 1MB chunks to prevent freezing
                        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                        let success = true;

                        if (nativeBridge.isAvailable()) {
                            // Android: Send in Base64 chunks to avoid ArrayBuffer stringification issues
                            for (let i = 0; i < totalChunks; i++) {
                                const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                                const buffer = await chunk.arrayBuffer();
                                
                                // Fast ArrayBuffer to Base64
                                let binary = '';
                                const bytes = new Uint8Array(buffer);
                                const len = bytes.byteLength;
                                for (let j = 0; j < len; j++) {
                                    binary += String.fromCharCode(bytes[j]);
                                }
                                const base64 = btoa(binary);
                                
                                const res = await nativeBridge.call('writeChunk', {
                                    path: path,
                                    chunk: base64,
                                    index: i,
                                    total: totalChunks,
                                    encoding: 'base64'
                                });
                                
                                if (res && res.success === false) {
                                    success = false;
                                    break;
                                }
                                
                                // Yield to UI
                                await new Promise(r => setTimeout(r, 10));
                                if (i % 5 === 0) {
                                    showToast(`Menyimpan model... ${Math.round((i / totalChunks) * 100)}%`, 'info');
                                }
                            }
                        } else {
                            // Browser Fallback: Read in chunks and append if possible, 
                            // but LightningFS doesn't support append easily.
                            // We will read the whole file into a Blob, then ArrayBuffer, but yield to UI.
                            showToast(`Memproses file besar di browser...`, 'info');
                            await new Promise(r => setTimeout(r, 100)); // Yield
                            const buffer = await file.arrayBuffer();
                            const res = await NativeStorage.writeFile({ path, data: buffer });
                            success = res.success;
                        }

                        if (success) {
                          safeStorage.setItem('quantum_local_model_path', path);
                          showToast(`Model ${file.name} berhasil ditambahkan ke memori internal AI.`, 'success');
                        } else {
                          showToast('Gagal menyimpan model ke memori internal.', 'error');
                        }
                    } catch (err: any) {
                        console.error("Upload error:", err);
                        showToast(`Error: ${err.message}`, 'error');
                    }
                  }
                };
                input.click();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-xs text-[var(--text-primary)] transition-all"
            >
              <CloudUpload size={14} className="text-blue-400" />
              Add Model from Device Memory
            </button>
            <p className="text-[9px] text-[var(--text-secondary)] mt-1 text-center italic">
              Mendukung format .gguf dan .bin untuk eksekusi offline.
            </p>
          </div>
        </div>
      </SettingsSection>
    </>
  );
};
