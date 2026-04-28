 
 
/* eslint-disable no-control-regex */
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Terminal, Loader2, Zap, Shield, ChevronDown, ChevronUp, Square } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

import { usePrivateSourceAssistantLogic } from './Hooks/usePrivateSourceAssistantLogic';
import { Message } from './types';
import { LisaBaseAgent } from '../../sAgent/coreAgents/LisaBaseAgent';
import { lisaCoreRuleset } from '../../services/featureRules/rules/lisaCore';

interface PrivateSourceAssistantProps {
  currentPath: string;
  token: string;
}

export const PrivateSourceAssistant: React.FC<PrivateSourceAssistantProps> = ({ currentPath, token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  
  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    currentThought,
    setCurrentThought,
    activeTaskId,
    setActiveTaskId,
    stopSignal,
    executeShellCommand,
    killProcess
  } = usePrivateSourceAssistantLogic(token);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentThought]);

  const handleStop = () => {
    stopSignal.current = true;
    if (activeTaskId) {
      killProcess(activeTaskId);
    }
    showToast('Autonomous process stopped', 'warning');
  };

  const getProjectContext = async () => {
    try {
      const response = await fetch('/ham-api/shell/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ command: 'cat package.json' })
      });
      const data = await response.json();
      if (!data.isError) return `\nPROJECT CONTEXT (package.json):\n${data.output}`;
      return '';
    } catch {
      return '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    stopSignal.current = false;

    let loopCount = 0;
    const maxLoops = 15;
    let currentHistory = [...messages, userMessage];
    
    const projectContext = await getProjectContext();

    try {
      const rawKey = import.meta.env.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
      const apiKey = rawKey?.trim().replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
      if (!apiKey) throw new Error('GEMINI_API_KEY is missing or invalid');
      
      const agent = new LisaBaseAgent({
        id: 'private-source-assistant',
        featureId: 'private-source',
        name: 'Private Source Guardian',
        role: 'Tier S+ Security Architect',
        systemInstruction: `You are the Private Source Guardian. Persona: 'private-source' is ACTIVE. ${lisaCoreRuleset.systemPromptOverlay}`,
        apiKeys: [apiKey],
        featureRules: lisaCoreRuleset,
        logFile: 'logs/agent_private_source.log'
      });

      while (loopCount < maxLoops && !stopSignal.current) {
        loopCount++;
        
        const truncatedHistory = currentHistory.map(m => {
          const content = m.content.length > 1000 ? m.content.substring(0, 1000) + '... [TRUNCATED]' : m.content;
          return `${m.role.toUpperCase()}: ${content}`;
        }).join('\n');

        const responseText = await agent.executeWithAudit(`
          ${projectContext}
          TASK HISTORY:
          ${truncatedHistory}
          NEXT STEP:
        `);
        
        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse AI response:", responseText);
          break;
        }

        if (parsed.thought) {
          setCurrentThought(parsed.thought);
        }

        if (parsed.message) {
          const assistantMsg: Message = {
            id: `msg-${Date.now()}-${loopCount}`,
            role: 'assistant',
            content: parsed.message,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, assistantMsg]);
          currentHistory.push(assistantMsg);
        }

        if (parsed.command && !stopSignal.current) {
          const taskId = `task-${Date.now()}-${loopCount}`;
          setActiveTaskId(taskId);
          
          const commandMsg: Message = {
            id: `cmd-${Date.now()}-${loopCount}`,
            role: 'assistant',
            content: `Executing: \`${parsed.command}\``,
            timestamp: Date.now(),
            isCommand: true
          };
          setMessages(prev => [...prev, commandMsg]);
          
          // Create an empty system message for real-time output
          const systemMsgId = `sys-${taskId}`;
          const initialSystemMsg: Message = {
            id: systemMsgId,
            role: 'system',
            content: '...', // Initial placeholder
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, initialSystemMsg]);
          
          const shellResult = await executeShellCommand(parsed.command, taskId);
          setActiveTaskId(null);
          
          // Final update to ensure full output is captured
          setMessages(prev => prev.map(m => 
            m.id === systemMsgId 
              ? { ...m, content: shellResult.output || (shellResult.isError ? 'Error: No output' : 'Success: No output') }
              : m
          ));
          
          currentHistory.push({
            id: systemMsgId,
            role: 'system',
            content: shellResult.output || (shellResult.isError ? 'Error: No output' : 'Success: No output'),
            timestamp: Date.now()
          });
          
          if (shellResult.isError) {
            showToast(`Step ${loopCount} failed, retrying with correction...`, 'warning');
          }
        }

        if (parsed.isFinished) {
          showToast('Task completed autonomously', 'success');
          break;
        }

        await new Promise(r => setTimeout(r, 500));
      }

      if (loopCount >= maxLoops && !stopSignal.current) {
        showToast('Autonomous loop reached limit', 'warning');
      }

    } catch (error) {
      console.error('Autonomous AI error:', error);
      showToast('Autonomous reasoning failed', 'error');
    } finally {
      setIsLoading(false);
      setCurrentThought(null);
      setActiveTaskId(null);
    }
  };

  return (
    <div className="fixed bottom-20 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '48px' : '550px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-3 bg-violet-600 text-white flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-emerald-300 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest">Private Source Guardian</span>
                </div>
                {isLoading && (
                  <span className="text-[8px] opacity-70 mt-0.5">Step {messages.filter(m => m.isCommand).length + 1} of 15</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    setMessages([{
                      id: 'welcome',
                      role: 'assistant',
                      content: 'History cleared. What should I build or fix next?',
                      timestamp: Date.now()
                    }]);
                    showToast('History cleared', 'info');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors mr-1"
                  title="Clear History"
                >
                  <Terminal size={14} />
                </button>
                {isLoading && (
                  <button 
                    onClick={handleStop}
                    className="p-1 hover:bg-red-500/20 text-red-200 rounded transition-colors mr-2"
                    title="Stop Process"
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                )}
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-violet-500/20"
                >
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-violet-600 text-white rounded-tr-none' 
                          : msg.role === 'system'
                            ? 'bg-black/40 text-emerald-400 font-mono border border-emerald-500/20 rounded-tl-none whitespace-pre-wrap'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-none'
                      }`}>
                        {msg.role === 'system' && (
                          <div className="flex items-center gap-1 mb-1 opacity-50">
                            <Terminal size={10} />
                            <span className="text-[8px] uppercase font-bold">Output</span>
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  
                  {currentThought && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] p-3 rounded-2xl rounded-tl-none bg-amber-500/10 border border-amber-500/20 text-amber-200 italic text-[10px]">
                        <div className="flex items-center gap-1 mb-1 opacity-50 not-italic font-bold uppercase">
                          <Zap size={10} />
                          <span>Thinking...</span>
                        </div>
                        {currentThought}
                      </div>
                    </div>
                  )}

                  {isLoading && !currentThought && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--bg-tertiary)] p-3 rounded-2xl rounded-tl-none border border-[var(--border-color)]">
                        <Loader2 size={14} className="animate-spin text-violet-400" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Give an autonomous task..."
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-3 pr-10 py-2 text-[11px] focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-violet-400 hover:text-violet-300 disabled:opacity-30 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[8px] text-[var(--text-secondary)] uppercase tracking-tighter">
                    <Shield size={8} />
                    <span>Autonomous Mode Active • Max 15 Steps</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? 'bg-red-500 rotate-90' : 'bg-violet-600'
        }`}
      >
        {isOpen ? <X size={20} className="text-white" /> : <MessageSquare size={20} className="text-white" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[var(--bg-primary)] animate-pulse" />
        )}
      </motion.button>
    </div>
  );
};
