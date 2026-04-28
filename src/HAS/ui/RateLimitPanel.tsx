import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, RefreshCw, BarChart3 } from 'lucide-react';
import { useRateLimitStore } from '../../store/rateLimitStore';

export const RateLimitPanel: React.FC = () => {
    const { usedRequests, getMaxRequests, getRemainingRequests, checkAndResetDaily } = useRateLimitStore();

    useEffect(() => {
        checkAndResetDaily();
        const interval = setInterval(checkAndResetDaily, 30000);
        return () => clearInterval(interval);
    }, [checkAndResetDaily]);

    const totalLimit = getMaxRequests();
    const remaining = getRemainingRequests();
    const percentage = Math.min(100, (usedRequests / totalLimit) * 100);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-6"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 b-sky-500/10 rounded-lg">
                        <Shield className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-zinc-100">SAERE Swarm Rate Limit</h3>
                        <p className="text-xs text-zinc-500">Global monitor for 8 sub-agents</p>
                    </div>
                </div>
                <button 
                    onClick={checkAndResetDaily}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <RefreshCw className="w-4 h-4 text-zinc-400" />
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total Capacity Used</span>
                    <span className={`font-mono ${percentage > 90 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {percentage.toFixed(1)}%
                    </span>
                </div>
                
                <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full transition-all duration-1000 ${
                            percentage > 90 ? 'bg-red-500' : 
                            percentage > 70 ? 'bg-amber-500' : 
                            'bg-emerald-500'
                        }`}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-zinc-950/50 border border-zinc-900 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Remaining</span>
                        </div>
                        <div className="text-lg font-mono text-zinc-200">{remaining} req</div>
                    </div>
                    <div className="p-3 bg-zinc-950/50 border border-zinc-900 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Reset In</span>
                        </div>
                        <div className="text-lg font-mono text-zinc-200">
                            {(() => {
                                const now = new Date();
                                const reset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0, 0);
                                if (now > reset) reset.setDate(reset.getDate() + 1);
                                return Math.ceil((reset.getTime() - now.getTime()) / 3600000);
                            })()}h
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 bg-sky-500/5 border border-sky-500/10 rounded-xl">
                <p className="text-xs text-sky-400/80 leading-relaxed text-center italic">
                    "Every turn at 5 AM, the Swarm resets its neural energy to 100%."
                </p>
            </div>
        </motion.div>
    );
};
