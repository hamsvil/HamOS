 
import React, { forwardRef } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { TerminalEmulatorContent, TerminalEmulatorHandle, TerminalEmulatorProps } from './TerminalEmulator/TerminalEmulator_Part1';

const TerminalEmulator = forwardRef<TerminalEmulatorHandle, TerminalEmulatorProps>((props, ref) => {
  return (
    <ErrorBoundary fallback={<div className="text-red-500 p-4 bg-[#1e1e1e] h-full flex items-center justify-center">Terminal Critical Failure</div>}>
      <TerminalEmulatorContent {...props} ref={ref} />
    </ErrorBoundary>
  );
});

export default TerminalEmulator;
export type { TerminalEmulatorHandle, TerminalEmulatorProps };
