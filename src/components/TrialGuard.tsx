 
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MessageCircle, Power, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface TrialStatus {
  installDate: number;
  isExpired: boolean;
}

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/ham-api/app-status?t=' + Date.now(), { 
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setStatus(data);
        } else {
          // Fallback: Assume valid license if API is unreachable (e.g. static hosting)
          // This prevents the "Unexpected token <" error
          setStatus({ installDate: Date.now(), isExpired: false });
        }
      } catch (e) {
        console.warn('Trial check skipped (offline/static mode):', e);
        setStatus({ installDate: Date.now(), isExpired: false });
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
        <Loader2 size={48} className="text-[#00ffcc] animate-spin mb-4" />
        <p className="text-[#00ffcc] font-mono tracking-widest animate-pulse">VERIFYING QUANTUM LICENSE...</p>
      </div>
    );
  }

  if (status?.isExpired) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.15)_0%,transparent_70%)]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[#111] border-2 border-red-500/50 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
              <ShieldAlert size={40} className="text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Trial Version Expired</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Masa percobaan 1 bulan Anda telah berakhir. Seluruh fitur Quantum OS telah dikunci secara otomatis oleh sistem keamanan.
              </p>
            </div>

            <div className="w-full p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-xs text-red-400 font-mono mb-1 uppercase tracking-widest">Developer Contact</p>
              <p className="text-lg font-bold text-white">+62 815-4562-7312</p>
            </div>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={() => {
                  window.open('https://wa.me/6281545627312?text=Halo%20Pengembang,%20saya%20ingin%20memperpanjang%20lisensi%20Ham%20AiStudio%20saya.', '_blank');
                }}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-600/20 active:scale-95"
              >
                <MessageCircle size={20} />
                HUBUNGI WHATSAPP
              </button>
              
              <button 
                onClick={() => {
                  showToast("Aplikasi akan ditutup. Silakan hubungi pengembang untuk aktivasi.", "error");
                  setTimeout(() => {
                    window.close();
                    // Fallback if window.close() fails (browsers often block it)
                    window.location.href = "about:blank";
                  }, 2000);
                }}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all border border-white/10"
              >
                TUTUP APLIKASI
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
