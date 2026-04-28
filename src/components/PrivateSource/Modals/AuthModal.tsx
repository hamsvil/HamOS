 
import React from 'react';
import { Lock, Unlock, Key, Shield, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthModalProps {
  onLogin: (pwd: string) => void;
  loading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, loading }) => {
  const [password, setPassword] = React.useState('');
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="flex items-center justify-center h-full bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Quantum Background Elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(167,139,250,0.1)_0%,transparent_70%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-[var(--border-color)] max-w-md w-full relative z-10 backdrop-blur-2xl bg-opacity-80 group">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />
        
        <div className="flex justify-center mb-8">
          <div className="p-5 bg-violet-500/10 rounded-3xl border border-violet-500/20 relative">
            <div className="absolute inset-0 bg-violet-500/20 blur-2xl opacity-50 animate-pulse" />
            {loading ? <RefreshCw size={40} className="text-violet-400 relative z-10 animate-spin" /> : <Lock size={40} className="text-violet-400 relative z-10" />}
            <div className="absolute -top-2 -right-2 p-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full z-20">
              <Shield size={12} className="text-emerald-400" />
            </div>
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">Quantum Vault</h2>
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-violet-500/50" />
            <p className="text-[10px] text-violet-400 font-black uppercase tracking-[0.4em]">Secure Storage v7.2</p>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-violet-500/50" />
          </div>
        </div>

        {loading && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-[10px] font-black text-violet-400 uppercase tracking-widest">
              <span>Decrypting Layers...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-violet-400/60 uppercase tracking-widest ml-1">Access Key</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-secondary)] group-focus-within/input:text-violet-400 transition-colors">
                <Key size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl pl-12 pr-4 py-4 text-[var(--text-primary)] font-mono focus:outline-none focus:border-violet-500/50 focus:ring-8 focus:ring-violet-500/5 transition-all placeholder:text-[var(--text-secondary)]/30"
                autoFocus
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(139,92,246,0.3)] active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Unlock size={18} />}
            {loading ? 'Decrypting...' : 'Initialize Uplink'}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-[var(--border-color)]/50 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Neural Link: SECURE</span>
            </div>
            <span className="opacity-30">|</span>
            <span>AES-256-GCM</span>
            <span className="opacity-30">|</span>
            <span>Quantum-Safe</span>
          </div>
        </div>
      </form>
    </div>
  );
};
