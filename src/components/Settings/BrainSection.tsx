import React from 'react';
// Brain Section Component
import { Database, Info, BrainCircuit, Trash2, Upload, Pause, Play, Download, X } from 'lucide-react';
import { BrainSectionProps } from './types';

export default function BrainSection({
  installedBrain,
  handleDeleteBrain,
  handleBrainUpload,
  brainUrl,
  setBrainUrl,
  isDownloading,
  isPaused,
  handlePause,
  handleResume,
  handleDownload,
  downloadProgress,
  downloadedBytes,
  totalBytes,
  downloadSpeed,
  error,
  formatBytes
}: BrainSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Database className="text-[#00ffcc]" /> Install Otak Lokal (GGUF)
      </h3>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 space-y-6">
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
          <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-blue-200">
            Install model AI (format .gguf) untuk menjalankan kecerdasan buatan secara offline langsung di browser Anda menggunakan WebGPU.
          </p>
        </div>

        {installedBrain ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h4 className="font-bold text-[var(--text-primary)] text-lg">{installedBrain.name}</h4>
                <p className="text-emerald-400 text-sm">Terinstall • {formatBytes(installedBrain.size)}</p>
              </div>
            </div>
            <button 
              onClick={handleDeleteBrain}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Hapus Otak"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center hover:border-[#00ffcc]/50 transition-colors relative">
            <input 
              type="file" 
              accept=".gguf"
              onChange={handleBrainUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <Upload className="mx-auto text-[var(--text-secondary)] mb-4" size={48} />
            <h4 className="text-lg font-medium text-[var(--text-primary)] mb-2">Upload File .GGUF</h4>
            <p className="text-sm text-[var(--text-secondary)]">Drag & drop atau klik untuk memilih file model</p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-color)]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)]">Atau download dari URL</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={brainUrl}
              onChange={(e) => setBrainUrl(e.target.value)}
              placeholder="https://huggingface.co/.../model.gguf"
              className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm focus:border-[#00ffcc] outline-none text-[var(--text-primary)] font-mono"
              disabled={isDownloading && !isPaused}
            />
            {isDownloading && !isPaused ? (
              <button 
                onClick={handlePause}
                className="px-6 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center gap-2"
              >
                <Pause size={18} /> Jeda
              </button>
            ) : isPaused ? (
              <button 
                onClick={handleResume}
                className="px-6 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
              >
                <Play size={18} /> Lanjut
              </button>
            ) : (
              <button 
                onClick={handleDownload}
                disabled={!brainUrl}
                className="px-6 bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/50 rounded-lg hover:bg-[#00ffcc]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download size={18} /> Download
              </button>
            )}
          </div>

          {(isDownloading || isPaused || downloadProgress > 0) && (
            <div className="space-y-2 bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-color)]">
              <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>{isPaused ? 'Dijeda' : isDownloading ? 'Mendownload...' : 'Selesai'}</span>
                <span>{downloadProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isPaused ? 'bg-yellow-500' : 'bg-[#00ffcc]'}`}
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--text-secondary)] font-mono">
                <span>{formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}</span>
                <span>{formatBytes(downloadSpeed)}/s</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <X size={16} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
