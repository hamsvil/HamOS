 
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HASSettingsModal } from './HASSettingsModal';
import { HASModelExplorer } from './HASModelExplorer';
import { HASQueueManager } from './HASQueueManager';
import { HASCoreMemory } from './HASCoreMemory';
import { SAEREValidationPanel } from './SAEREValidationPanel';
import { Minimize2, Settings, Send, Plus, Image as ImageIcon, Mic, Copy, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AiWorkerService } from '../../services/aiWorkerService';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export const HASChatWindow = () => {
    const [showSettings, setShowSettings] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "I've analyzed your current workspace. The **SAERE v7.2** kernel is operating at peak efficiency.\n\nI'm monitoring for any HMR death loops or dependency conflicts in the background. How can I assist with your project today?",
            timestamp: Date.now()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!inputValue.trim() || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            console.log("[HAS] Sending input to worker:", inputValue);
            const response = await AiWorkerService.generateContent({
                model: 'gemini-2.5-flash',
                contents: inputValue,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 4096
                }
            });
            console.log("[HAS] Received response from worker:", response);

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.text || "I encountered an anomaly in the neural matrix. Please try again.",
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            console.error("[HAS] Chat Error:", error); setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${(error as Error).message || 'Unknown error'}`, timestamp: Date.now() }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (isMinimized) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-tr from-blue-600 to-purple-600 text-white rounded-2xl shadow-[0_8px_32px_rgba(59,130,246,0.4)] z-[100] flex items-center justify-center cursor-pointer border border-white/20 backdrop-blur-xl transition-all duration-300"
                onClick={() => setIsMinimized(false)}
            >
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 z-10">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                </div>
                <div className="relative">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-white">
                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                    </svg>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 40 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                className="w-full max-w-[60vw] h-[60vh] bg-zinc-950/90 text-white shadow-[0_32px_128px_rgba(0,0,0,0.8)] flex flex-col border border-zinc-800/50 rounded-[2rem] overflow-hidden pointer-events-auto backdrop-blur-3xl relative"
            >
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 bg-transparent border-b border-zinc-900/50 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
                                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-base font-bold tracking-tight text-zinc-100 leading-none">Ham Agentic Shadow</h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SAERE v7.2 Active</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowSettings(!showSettings)} 
                            className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-zinc-800 text-blue-400' : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100'}`}
                            title="Settings"
                        >
                            <Settings size={18} />
                        </button>
                        <button 
                            onClick={() => setIsMinimized(true)} 
                            className="p-2 hover:bg-zinc-900 rounded-xl transition-all text-zinc-400 hover:text-zinc-100"
                            title="Minimize"
                        >
                            <Minimize2 size={18} />
                        </button>
                    </div>
                </div>
                
                {/* Content Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 bg-transparent relative z-10">
                    <AnimatePresence mode="wait">
                        {showSettings ? (
                            <motion.div 
                                key="settings"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6 pb-8"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <button onClick={() => setShowSettings(false)} className="text-blue-400 text-xs font-bold uppercase tracking-wider hover:text-blue-300 transition-colors">
                                        ← Back to Chat
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <HASSettingsModal />
                                    <HASModelExplorer />
                                    <HASQueueManager />
                                    <HASCoreMemory />
                                    <SAEREValidationPanel />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="chat"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-6 pb-4"
                            >
                                {messages.length === 0 && (
                                    <div className="mt-12 mb-8 text-center flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20">
                                            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current text-white">
                                                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                                            </svg>
                                        </div>
                                        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                                            Hello, I'm HAS
                                        </h1>
                                        <p className="text-zinc-500 text-sm font-medium max-w-xs leading-relaxed">
                                            Your autonomous agentic shadow, powered by SAERE v7.2. How can I assist your project today?
                                        </p>
                                    </div>
                                )}

                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-4 items-start group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-lg ${
                                            msg.role === 'assistant' 
                                            ? 'bg-zinc-900 border-zinc-800' 
                                            : 'bg-blue-600 border-blue-500'
                                        }`}>
                                            {msg.role === 'assistant' ? (
                                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-blue-400">
                                                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                                                </svg>
                                            ) : (
                                                <span className="text-xs font-black">U</span>
                                            )}
                                        </div>
                                        <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                                            <div className={`text-[14px] leading-relaxed p-4 rounded-2xl ${
                                                msg.role === 'assistant' 
                                                ? 'bg-zinc-900/40 text-zinc-200 border border-zinc-800/50' 
                                                : 'bg-blue-600/10 text-zinc-100 border border-blue-500/20'
                                            }`}>
                                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                            </div>
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                                                        <Copy size={12} />
                                                    </button>
                                                    <button className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                                                        <RotateCcw size={12} />
                                                    </button>
                                                    <button className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                                                        <ThumbsUp size={12} />
                                                    </button>
                                                    <button className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors">
                                                        <ThumbsDown size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="flex gap-4 items-start">
                                        <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 shadow-lg">
                                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-blue-400 animate-pulse">
                                                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                                            </svg>
                                        </div>
                                        <div className="flex gap-1 mt-3">
                                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1 h-1 rounded-full bg-blue-500" />
                                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1 h-1 rounded-full bg-blue-500" />
                                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1 h-1 rounded-full bg-blue-500" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input Area */}
                {!showSettings && (
                    <div className="px-6 pb-6 pt-2 bg-transparent relative z-10">
                        <div className="relative flex items-center bg-zinc-900/40 rounded-2xl border border-zinc-800/50 focus-within:border-blue-500/30 focus-within:bg-zinc-900/60 transition-all duration-500 shadow-2xl">
                            <button className="ml-2 p-2.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors shrink-0">
                                <Plus size={20} />
                            </button>
                            
                            <textarea 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask HAS anything..." 
                                className="flex-1 max-h-32 min-h-[48px] bg-transparent text-[14px] text-zinc-100 placeholder-zinc-500 outline-none resize-none py-3.5 px-2 custom-scrollbar"
                                rows={1}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />

                            <div className="flex items-center gap-1 pr-2">
                                {!inputValue.trim() ? (
                                    <>
                                        <button className="p-2.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors">
                                            <Mic size={20} />
                                        </button>
                                        <button className="p-2.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors">
                                            <ImageIcon size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <motion.button 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        onClick={handleSend}
                                        className="p-2.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-colors shrink-0"
                                    >
                                        <Send size={20} />
                                    </motion.button>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 text-center">
                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
                                Powered by Ham Agentic Shadow • Gemini 1.5 Pro • SAERE v7.2
                            </p>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};