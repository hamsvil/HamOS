import React, { lazy, Suspense } from 'react';
import { SynapseVision } from '../components/SupremeTools/SynapseVision';

const BrowserTab = lazy(() => import('../components/BrowserTab'));
const TerminalTab = lazy(() => import('../components/TerminalTab'));
const AIHubTab = lazy(() => import('../components/AIHubTab'));
const SettingsTab = lazy(() => import('../components/SettingsTab'));
const HamAiStudioTab = lazy(() => import('../components/HamAiStudio/index'));
const HamliMemoryTab = lazy(() => import('../components/HamliMemoryTab'));
const PrivateSourceTab = lazy(() => import('../components/PrivateSourceTab'));
const TasksTab = lazy(() => import('../components/TasksTab'));
const AgentWorker = lazy(() => import('../components/AgentWorker/AgentWorker').then(m => ({ default: m.AgentWorker })));
const KeygenTab = lazy(() => import('../components/KeygenTab'));
const QuantumTunnelApp = lazy(() => import('../sAgent/src/App'));
const AeternaGlassTab = lazy(() => import('../components/AeternaGlassTab'));
const MediaAgentTab = lazy(() => import('../features/MediaAgent/index').then(m => ({ default: m.MediaAgent })));
const HCameraTab = lazy(() => import('../features/HCamera/index').then(m => ({ default: m.HCamera })));
const GeneratorStudioTab = lazy(() => import('../features/GeneratorStudio/index').then(m => ({ default: m.GeneratorStudio })));
const AgentLogViewer = lazy(() => import('../features/AgentLogViewer/index'));
const AgentResultsViewer = lazy(() => import('../features/AgentResultsViewer/index'));
const SocialWorkerTab = lazy(() => import('../features/SocialWorker/index'));
const FeatureRulesPanel = lazy(() => import('../features/FeatureRulesPanel/index'));
const BugHunterTab = lazy(() => import('../features/BugHunter/index'));
const CodeConverterTab = lazy(() => import('../features/CodeConverter/index'));
const MeshStudioTab = lazy(() => import('../features/MeshStudio/index'));
const NeuralPilotTab = lazy(() => import('../features/NeuralPilot/index'));
const RefactorWormTab = lazy(() => import('../features/RefactorWorm/index'));
const VFSMaskTab = lazy(() => import('../features/VFSMask/index'));
const VoiceMirrorTab = lazy(() => import('../features/VoiceMirror/index'));

interface TabRendererProps {
  activeTab: string;
}

export const TabRenderer: React.FC<TabRendererProps> = ({ activeTab }) => {
  const activeTabComponent = React.useMemo(() => {
    switch (activeTab) {
      case 'browser': return <BrowserTab />;
      case 'terminal': return <TerminalTab />;
      case 'ham-aistudio': return <HamAiStudioTab />;
      case 'memory': return <HamliMemoryTab />;
      case 'ai': return <AIHubTab />;
      case 'private-source': return <PrivateSourceTab />;
      case 'tasks': return <TasksTab />;
      case 'omni': return <AgentWorker />;
      case 'synapse-vision': return <SynapseVision />;
      case 'keygen': return <KeygenTab />;
      case 'agent-logs': return <AgentLogViewer />;
      case 'agent-results': return <AgentResultsViewer />;
      case 'sagent': return <QuantumTunnelApp />;
      case 'aeterna': return <AeternaGlassTab />;
      case 'media-agent': return <MediaAgentTab />;
      case 'h-camera': return <HCameraTab />;
      case 'generator-studio': return <GeneratorStudioTab />;
      case 'social-worker': return <SocialWorkerTab />;
      case 'feature-rules': return <FeatureRulesPanel />;
      case 'bug-hunter': return <BugHunterTab />;
      case 'code-converter': return <CodeConverterTab />;
      case 'mesh-studio': return <MeshStudioTab />;
      case 'neural-pilot': return <NeuralPilotTab />;
      case 'refactor-worm': return <RefactorWormTab />;
      case 'vfs-mask': return <VFSMaskTab />;
      case 'voice-mirror': return <VoiceMirrorTab />;
      case 'settings': return <SettingsTab />;
      default: return <HamAiStudioTab />;
    }
  }, [activeTab]);

  return (
    <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      {activeTabComponent}
    </Suspense>
  );
};
