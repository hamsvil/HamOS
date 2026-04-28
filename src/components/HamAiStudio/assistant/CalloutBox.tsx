import React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface CalloutBoxProps {
  type: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

const CalloutBox = ({ type, children }: CalloutBoxProps) => {
  const config = {
    info: {
      icon: <Info size={16} />,
      className: 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    },
    success: {
      icon: <CheckCircle2 size={16} />,
      className: 'bg-green-500/10 text-green-300 border-green-500/20'
    },
    warning: {
      icon: <AlertTriangle size={16} />,
      className: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
    },
    error: {
      icon: <XCircle size={16} />,
      className: 'bg-red-500/10 text-red-300 border-red-500/20'
    }
  };

  const { icon, className } = config[type];

  return (
    <div className={`my-4 p-4 rounded-xl border flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300 ${className}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
};

export default CalloutBox;
