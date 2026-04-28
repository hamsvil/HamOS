import React from 'react';
import { X, History } from 'lucide-react';

interface RestoreModalProps {
  checkpoints: any[];
  onRestore: (checkpoint: any) => void;
  onClose: () => void;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({ checkpoints, onRestore, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 w-96 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <History size={18} />
            Restore Version
          </h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {checkpoints.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-sm">Tidak ada checkpoint tersedia.</p>
          ) : (
            checkpoints.map((cp) => (
              <button
                key={cp.id}
                onClick={() => onRestore(cp)}
                className="w-full text-left p-3 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors mb-2"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {new Date(cp.timestamp).toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {cp.snapshot.length} pesan
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
