 
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ChatMessageData, ProjectData, GenerationStep } from '../../components/HamAiStudio/types';
import { ToolRegistry } from '../../services/super-assistant/ToolRegistry';
import { ContextManager } from '../../services/super-assistant/ContextManager';
import { ReasoningEngine } from '../../services/super-assistant/ReasoningEngine';
import { SecurityGuard } from '../../services/super-assistant/SecurityGuard';
import { PerformanceOptimizer } from '../../services/super-assistant/PerformanceOptimizer';

interface SuperAssistantContextType {
  isLoading: boolean;
  history: ChatMessageData[];
  agentActivities: any[];
  sendPrompt: (prompt: string, project: ProjectData | null, files?: File[]) => Promise<void>;
  cancelTask: () => void;
  auditLogs: any[];
  telemetry: any;
  isLowPower: boolean;
}

const SuperAssistantContext = createContext<SuperAssistantContextType | undefined>(undefined);

export const SuperAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessageData[]>([]);
  const [agentActivities, setAgentActivities] = useState<any[]>([]);
  const [isLowPower, setIsLowPower] = useState(false);

  const toolRegistry = ToolRegistry.getInstance();
  const contextManager = ContextManager.getInstance();
  const reasoningEngine = ReasoningEngine.getInstance();
  const securityGuard = SecurityGuard.getInstance();
  const performanceOptimizer = PerformanceOptimizer.getInstance();

  const sendPrompt = useCallback(async (prompt: string, project: ProjectData | null, files?: File[]) => {
    if (isLoading) return;

    // 24. Input Validation
    const validation = securityGuard.validateInput(prompt);
    if (!validation.safe) {
      setHistory(prev => [...prev, { role: 'ai', content: `Security Alert: ${validation.reason}`, isError: true }]);
      return;
    }

    setIsLoading(true);
    setIsLowPower(performanceOptimizer.isLowPowerMode());
    const startTime = Date.now();

    // 9. Context Optimization
    const optimizedHistory = contextManager.getOptimizedContext(history);
    
    // Optimistic Update
    const userMsg: ChatMessageData = { 
      role: 'user', 
      content: prompt,
      // 36. Multimodal: Store file names in history for now
      activities: files?.map(f => ({
        id: `upload-${f.name}-${Date.now()}`,
        type: 'file_change',
        details: `Uploaded ${f.name}`,
        timestamp: Date.now(),
        agent: 'System',
        status: 'completed',
        progress: 100
      }))
    };
    setHistory(prev => [...prev, userMsg]);

    // 4. Planning & 1. ReAct Loop
    const aiMsg: ChatMessageData = { role: 'ai', content: '...', steps: [] };
    setHistory(prev => [...prev, aiMsg]);

    try {
      const response = await reasoningEngine.executeReActLoop(prompt, optimizedHistory, project, (step) => {
        setHistory(prev => {
          const historyArray = Array.isArray(prev) ? prev : [];
          const last = historyArray[historyArray.length - 1];
          if (last && last.role === 'ai') {
            const steps = last.steps || [];
            const existingIndex = steps.findIndex(s => s.id === step.id);
            if (existingIndex >= 0) {
              steps[existingIndex] = step;
            } else {
              steps.push(step);
            }
            return [...historyArray.slice(0, -1), { ...last, steps: [...steps] }];
          }
          return historyArray;
        });
      }, undefined, undefined);

      // Finalize
      setHistory(prev => {
        const historyArray = Array.isArray(prev) ? prev : [];
        const last = historyArray[historyArray.length - 1];
        if (last && last.role === 'ai') {
          return [...historyArray.slice(0, -1), { ...last, content: response }];
        }
        return historyArray;
      });

      performanceOptimizer.logTelemetry({ 
        timestamp: Date.now(), 
        operation: 'generate_response', 
        duration: Date.now() - startTime, 
        status: 'success' 
      });

    } catch (err: any) {
      setHistory(prev => {
        const historyArray = Array.isArray(prev) ? prev : [];
        return [...historyArray.slice(0, -1), { role: 'ai', content: `Error: ${err.message}`, isError: true }];
      });
      performanceOptimizer.logTelemetry({ 
        timestamp: Date.now(), 
        operation: 'generate_response', 
        duration: Date.now() - startTime, 
        status: 'failure' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [history, isLoading]);

  const cancelTask = useCallback(() => {
    setIsLoading(false);
    // Logic to abort AI call
  }, []);

  return (
    <SuperAssistantContext.Provider value={{
      isLoading,
      history,
      agentActivities,
      sendPrompt,
      cancelTask,
      auditLogs: securityGuard.getAuditLogs(),
      telemetry: performanceOptimizer.getTelemetrySummary(),
      isLowPower
    }}>
      {children}
    </SuperAssistantContext.Provider>
  );
};

export const useSuperAssistant = () => {
  const context = useContext(SuperAssistantContext);
  if (!context) throw new Error('useSuperAssistant must be used within SuperAssistantProvider');
  return context;
};
