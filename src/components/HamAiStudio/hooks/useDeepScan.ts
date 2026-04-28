 
 
import { vfs } from '../../../services/vfsService';
import { AgentActivity } from '../types';
import { useProjectStore } from '../../../store/projectStore';

export function useDeepScan() {
  const isDeepScanning = useProjectStore(state => state.uiState.isDeepScanning);
  const aiLog = useProjectStore(state => state.uiState.aiLog);
  const customAgentActivities = useProjectStore(state => state.uiState.customAgentActivities);
  const setUiState = useProjectStore(state => state.setUiState);

  const addAiLog = (log: string) => setUiState({ aiLog: [...useProjectStore.getState().uiState.aiLog, log] });
  
  const setAgentActivities = (activities: React.SetStateAction<AgentActivity[]>) => {
    const current = useProjectStore.getState().uiState.customAgentActivities;
    const next = typeof activities === 'function' ? activities(current) : activities;
    setUiState({ customAgentActivities: next });
  };

  const handleDeepScan = async () => {
    setUiState({ isDeepScanning: true });
    addAiLog("Starting deep scan...");
    const initialActivity: AgentActivity = { 
      id: 'deep-scan-' + Date.now(),
      agent: "Deep Scan", 
      status: "running", 
      progress: 10,
      type: 'action',
      details: 'Scanning project files for issues...',
      timestamp: Date.now()
    };
    setAgentActivities(prev => [...prev, initialActivity]);
    
    try {
      const snapshot = await vfs.getProjectSnapshot();
      const files = snapshot.files;
      addAiLog(`Found ${files.length} files to scan.`);
      setAgentActivities(prev => prev.map(a => a.agent === "Deep Scan" ? { ...a, progress: 30 } : a));
      
      let issuesFound = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.path.endsWith('.js') || file.path.endsWith('.ts') || file.path.endsWith('.jsx') || file.path.endsWith('.tsx')) {
          const content = file.content;
          // Basic regex to avoid matching // console.log
          const hasConsoleLog = /^(?!\s*\/\/).*console\.log/m.test(content);
          if (hasConsoleLog) {
             addAiLog(`Warning: console.log found in ${file.path}`);
             issuesFound++;
          }
          const hasTodo = /TODO|FIXME/.test(content);
          if (hasTodo) {
             addAiLog(`Info: TODO/FIXME found in ${file.path}`);
             issuesFound++;
          }
        }
        setAgentActivities(prev => prev.map(a => a.agent === "Deep Scan" ? { ...a, progress: 30 + Math.round((i / files.length) * 60) } : a));
      }
      
      if (issuesFound > 0) {
        addAiLog(`Scan complete. Found ${issuesFound} potential issues.`);
      } else {
        addAiLog("Scan complete. No issues found.");
      }
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      addAiLog(`Scan failed: ${msg}`);
    }
    
    setAgentActivities(prev => prev.map(a => a.agent === "Deep Scan" ? { ...a, status: "completed", progress: 100, type: 'success' } : a));
    setUiState({ isDeepScanning: false });
  };

  return {
    isDeepScanning,
    setIsDeepScanning: (val: boolean) => setUiState({ isDeepScanning: val }),
    aiLog,
    customAgentActivities,
    setAgentActivities,
    handleDeepScan
  };
}
