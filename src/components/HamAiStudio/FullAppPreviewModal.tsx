 
import React, { useMemo } from 'react';
import { X, Maximize2, Smartphone, Globe } from 'lucide-react';
import { ProjectData } from './types';
import WebProjectRenderer from './WebProjectRenderer';
import AndroidXmlRenderer from './AndroidXmlRenderer';

interface FullAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData | null;
  projectType: string;
  webProjectUrl: string | null;
}

  export default function FullAppPreviewModal({ isOpen, onClose, project, projectType, webProjectUrl }: FullAppPreviewModalProps) {
  const isWeb = useMemo(() => {
    if (!project) return false;
    // Auto-detect based on files, fallback to projectType prop if ambiguous
    const hasIndexHtml = project.files.some(f => f.path.endsWith('index.html'));
    const hasAndroidXml = project.files.some(f => f.path.endsWith('.xml'));
    
    if (hasIndexHtml) return true;
    if (hasAndroidXml) return false;
    
    return projectType === 'web';
  }, [project, projectType]);

  const mainXmlFile = useMemo(() => {
    if (isWeb || !project) return null;
    // Try to find main activity layout or first layout file
    return project.files.find(f => f.path.includes('activity_main.xml')) || 
           project.files.find(f => f.path.endsWith('.xml'));
  }, [project, isWeb]);

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="w-full h-full max-w-7xl max-h-[90vh] bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#141414] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isWeb ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
              {isWeb ? <Globe size={20} /> : <Smartphone size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-gray-200 text-lg">{project.name}</h3>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Full Screen Preview • {isWeb ? 'Web App' : 'Android App'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#050505] relative overflow-hidden flex items-center justify-center">
          {isWeb ? (
            <WebProjectRenderer files={project.files} webProjectUrl={webProjectUrl} />
          ) : (
            mainXmlFile ? (
              <AndroidXmlRenderer xmlContent={mainXmlFile.content} />
            ) : (
              <div className="text-gray-500">No layout XML file found.</div>
            )
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-[#141414] border-t border-white/10 text-xs text-gray-500 flex justify-between items-center">
          <span>Running in Anti-Simulation Mode (Real Rendering)</span>
          <div className="flex items-center gap-2">
            <Maximize2 size={12} />
            <span>Full Screen Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
