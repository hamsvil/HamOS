 
import React, { useState } from 'react';
import { ProjectData } from './types';
import WebProjectRenderer from './WebProjectRenderer';
import AndroidXmlRenderer from './AndroidXmlRenderer';
import { Smartphone, Monitor, X, Maximize2, RotateCcw } from 'lucide-react';
import { GLOBAL_AI_CAPABILITIES } from '../../config/aiCapabilities';

interface LiveAppPreviewProps {
  project: ProjectData | null;
  projectType: string;
  webProjectUrl: string | null;
  onClose: () => void;
}

export default function LiveAppPreview({ project, projectType, webProjectUrl, onClose }: LiveAppPreviewProps) {
  const [view, setView] = useState<'mobile' | 'desktop'>('desktop');
  const [key, setKey] = useState(0);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-[#0a0a0a]">
        <Smartphone size={48} className="mb-4 opacity-20" />
        <p>No project generated yet.</p>
        <p className="text-xs mt-2 opacity-50">Start a chat to generate an app.</p>
      </div>
    );
  }

  const isWeb = projectType === 'web' || project.files.some(f => f.path.endsWith('.html'));

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white border-l border-white/10">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#141414]">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <div>
             <h3 className="font-bold text-sm text-gray-200">Live App Preview</h3>
             <p className="text-[10px] text-gray-500">Real-time Environment • {projectType === 'web' ? 'Web Runtime' : 'Android WebView'}</p>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1e1e1e] p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => setView('mobile')} 
              className={`p-1.5 rounded-md transition-all ${view === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Mobile View"
            >
              <Smartphone size={16}/>
            </button>
            <button 
              onClick={() => setView('desktop')} 
              className={`p-1.5 rounded-md transition-all ${view === 'desktop' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Desktop View"
            >
              <Monitor size={16}/>
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button 
              onClick={() => setKey(k => k + 1)} 
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-all"
              title="Restart App"
            >
              <RotateCcw size={16}/>
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[#050505] flex items-center justify-center p-4">
         {/* Background Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none"></div>
         
         <div className={`transition-all duration-500 ease-in-out relative z-10 ${
           view === 'mobile' 
             ? 'w-[375px] h-[667px] border-[12px] border-[#1a1a1a] rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-white/10' 
             : 'w-full h-full border border-white/10 rounded-xl overflow-hidden shadow-2xl'
         }`}>
            {/* Status Bar for Mobile */}
            {view === 'mobile' && (
              <div className="h-6 bg-black flex items-center justify-between px-4 text-[10px] text-white font-medium select-none">
                <span>9:41</span>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                </div>
              </div>
            )}

            <div className={`w-full bg-white relative ${view === 'mobile' ? 'h-[calc(100%-24px)]' : 'h-full'}`}>
              {isWeb ? (
                  <WebProjectRenderer key={key} files={project.files} webProjectUrl={webProjectUrl} />
              ) : (
                  <div className="w-full h-full bg-white text-black overflow-auto">
                      {/* Fallback for pure XML projects without HTML */}
                      {(() => {
                          let xmlFile = project.files.find(f => f.path.endsWith('activity_main.xml'));
                          if (!xmlFile) {
                              xmlFile = project.files.find(f => f.path.includes('layout') && f.path.endsWith('.xml'));
                          }
                          
                          if (xmlFile) {
                              return <AndroidXmlRenderer xmlContent={xmlFile.content} />;
                          } else {
                              return (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
                                      <p>No Android Layout XML found.</p>
                                  </div>
                              );
                          }
                      })()}
                  </div>
              )}
            </div>
            
            {/* Home Indicator for Mobile */}
            {view === 'mobile' && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full"></div>
            )}
         </div>
      </div>
    </div>
  );
}
