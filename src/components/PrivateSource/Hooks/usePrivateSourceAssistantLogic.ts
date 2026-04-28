 
import { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { LisaBaseAgent } from '../../../sAgent/coreAgents/LisaBaseAgent';
import { agentPersonaRegistry } from '../../../sAgent/AgentPersonaRegistry';

export function usePrivateSourceAssistantLogic(token: string) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I am now in Autonomous Mode (Private Source). I can think, execute commands, and self-correct until your task is fully completed. What should I build or fix today?',
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopSignal = useRef(false);
  const agentRef = useRef<LisaBaseAgent | null>(null);

  useEffect(() => {
    if (!agentRef.current) {
      const persona = agentPersonaRegistry.getPersona('private-source');
      const keys = (window as any).GEMINI_API_KEY ? [(window as any).GEMINI_API_KEY] : [];
      agentRef.current = new LisaBaseAgent({
        id: 'private-source-agent',
        featureId: 'private-source',
        name: persona?.name || 'Private Source Assistant',
        role: persona?.role || 'Secure File Orchestrator',
        systemInstruction: `${persona?.personality || ''}\n\n[ISOLATION MODE: ON]\nYou are restricted to the current session and file context. Do not leak information between users or projects.`,
        apiKeys: keys,
        logFile: 'logs/agent_private_source.log'
      });
    }
  }, []);

  const auditFileOp = (op: string, path: string) => {
    if (agentRef.current) {
      (agentRef.current as any).auditLog({
        type: 'FILE_OP',
        operation: op,
        path,
        timestamp: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/collab?roomId=private-source-presence`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'FS_EVENT' && data.event === 'shell_output') {
            const { taskId, chunk } = data.data;
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'system' && lastMsg.id.includes(taskId)) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: lastMsg.content === '...' || lastMsg.content === 'Success: No output' || lastMsg.content === 'Error: No output' ? chunk : lastMsg.content + chunk }
                ];
              }
              return prev;
            });
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 3000);
      };
    };

    connectWs();
    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const executeShellCommand = async (command: string, taskId: string) => {
    try {
      auditFileOp('SHELL_EXEC', command);
      const response = await fetch('/ham-api/shell/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ command, taskId })
      });
      const data = await response.json();
      if (data.isError) {
        setError(`Shell Error: ${data.output}`);
      }
      return data;
    } catch (error: any) {
      console.error('Shell execution error:', error);
      const errMsg = `Failed to execute command: ${error.message}`;
      setError(errMsg);
      return { output: errMsg, isError: true };
    }
  };

  const killProcess = async (taskId: string) => {
    try {
      await fetch('/ham-api/shell/kill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ taskId })
      });
    } catch (error) {
      console.error('Kill error:', error);
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    currentThought,
    setCurrentThought,
    activeTaskId,
    setActiveTaskId,
    stopSignal,
    error,
    setError,
    executeShellCommand,
    killProcess
  };
}
