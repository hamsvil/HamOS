 
import React, { useState, useEffect } from 'react';
import { Lightbulb, MessageSquare, Edit3, CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronRight, FileCode, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GenerationStep {
  id: string;
  type: 'thought' | 'response' | 'edit' | 'build' | 'error' | 'action' | 'warning' | 'success';
  label: string;
  details?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'error' | 'warning';
  duration?: number;
}

interface StepTimelineProps {
  steps: GenerationStep[];
}

export default function StepTimeline({ steps }: StepTimelineProps) {
  return (
    <div className="flex flex-col gap-1 w-full max-w-2xl">
      <AnimatePresence mode='popLayout'>
        {steps.map((step, index) => (
          <StepItem key={step.id || index} step={step} isLast={index === steps.length - 1} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const StepItem = React.forwardRef<HTMLDivElement, { step: GenerationStep; isLast: boolean }>(({ step, isLast }, ref) => {
  const [isExpanded, setIsExpanded] = useState(step.status === 'running' || (step.type === 'edit' && step.status === 'completed'));
  const [liveDuration, setLiveDuration] = useState(0);
  const STEP_TIMEOUT = 60; // 60 seconds timeout per step

  // Auto-expand running steps and handle live timer
  useEffect(() => {
    let interval: any;
    if (step.status === 'running') {
      setIsExpanded(true);
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setLiveDuration(elapsed);
        
        // Safety timeout to prevent infinite looking loops
        if (elapsed > STEP_TIMEOUT) {
          clearInterval(interval);
        }
      }, 100);
    } else {
      setLiveDuration(step.duration || 0);
    }
    return () => clearInterval(interval);
  }, [step.status, step.duration]);

  const getIcon = () => {
    const iconSize = 11; // 30% reduction from 16
    if (step.status === 'running') return <Loader2 size={iconSize} className="animate-spin text-blue-400" />;
    if (step.status === 'failed' || step.status === 'error') return <AlertCircle size={iconSize} className="text-red-400" />;
    if (step.status === 'warning') return <AlertCircle size={iconSize} className="text-yellow-400" />;
    
    switch (step.type) {
      case 'thought': return <Lightbulb size={iconSize} className="text-yellow-400" />;
      case 'response': return <MessageSquare size={iconSize} className="text-gray-400" />;
      case 'edit': return <Edit3 size={iconSize} className="text-blue-400" />;
      case 'build': return <FileCode size={iconSize} className="text-green-400" />;
      case 'error': return <AlertCircle size={iconSize} className="text-red-400" />;
      case 'action': return <Terminal size={iconSize} className="text-blue-400" />;
      case 'warning': return <AlertCircle size={iconSize} className="text-yellow-400" />;
      case 'success': return <CheckCircle2 size={iconSize} className="text-green-400" />;
      default: return <CheckCircle2 size={iconSize} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed':
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-[var(--text-secondary)]';
    }
  };

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group"
    >
      <div 
        className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors border ${
          step.status === 'running' 
            ? 'bg-blue-500/5 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
            : 'hover:bg-white/5 border-white/5'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`mt-0.5 shrink-0 ${step.status === 'completed' ? 'text-green-400' : ''}`}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-medium leading-tight ${getStatusColor()}`}>
              {step.label}
            </span>
            {(step.status === 'running' || liveDuration > 0) && (
              <span className={`text-[9px] font-mono ${liveDuration > STEP_TIMEOUT ? 'text-red-400 animate-pulse' : 'text-[var(--text-secondary)]'}`}>
                {liveDuration.toFixed(1)}s
                {liveDuration > STEP_TIMEOUT && ' (Timeout)'}
              </span>
            )}
          </div>
          
          {/* Details (e.g. file list) */}
          <AnimatePresence>
            {isExpanded && step.details && step.details.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-1 space-y-0.5 overflow-hidden"
              >
                {step.details.map((detail, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] pl-1">
                    {step.status === 'completed' ? (
                      <CheckCircle2 size={10} className="text-green-500/70" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full border border-white/10" />
                    )}
                    <span className="truncate font-mono opacity-80">{detail}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step.details && step.details.length > 0 && (
          <div className="mt-0.5 text-[var(--text-secondary)] opacity-50">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>
        )}
      </div>
    </motion.div>
  );
});
