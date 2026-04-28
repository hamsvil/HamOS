import React from 'react';
import { Check } from 'lucide-react';

interface ExecutionReportProps {
  processSteps: string[];
  filesUpdated: string[];
}

export default function ExecutionReport({ processSteps, filesUpdated }: ExecutionReportProps) {
  return (
    <div className="my-4 font-mono text-xs">
      <details className="group mb-2">
        <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-bold text-sm">
          [LIVE PROCESS EDITING - Click to Expand]
        </summary>
        <div className="mt-2 pl-4 border-l border-white/10 space-y-1 text-gray-400">
          {processSteps.map((step, index) => (
            <div key={index}>&gt; - Step {index + 1}: {step}</div>
          ))}
        </div>
      </details>

      <div className="mt-2">
        <div className="text-gray-300 font-bold mb-1">FILES UPDATED:</div>
        <div className="border border-white/20 rounded-lg p-4 bg-[#141414] shadow-lg">
          {filesUpdated.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-emerald-400">
              <Check size={14} />
              <span>{file}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
