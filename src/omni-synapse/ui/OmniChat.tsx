/* eslint-disable no-useless-assignment */
import React, { useState, useEffect, useRef } from 'react';
import { omniEventBus } from '../core/event_bus';
import { OmniEvent, OmniEventType } from '../core/types';

// Ensure workers are initialized
import '../engine/ai_worker';
import '../engine/memory_worker';

/**
 * OmniChat: The UI component that interacts with the Omni-Synapse engine.
 * It uses a unidirectional data flow via the Event Bus.
 */
export const OmniChat: React.FC = () => {
    const [messages, setMessages] = useState<{ id: string, text: string, sender: 'user' | 'ai' }[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Workers (Simulated for this prototype)
    useEffect(() => {
        // In a real app, these would be new Worker('./ai_worker.ts')
        // console.log('[OmniChat] Initializing Omni-Synapse Engine...');
    }, []);

    // Subscribe to Event Bus
    useEffect(() => {
        const unsubscribeThinkingStart = omniEventBus.subscribe(OmniEventType.AI_THINKING_START, () => setIsThinking(true));
        const unsubscribeThinkingEnd = omniEventBus.subscribe(OmniEventType.AI_THINKING_END, () => setIsThinking(false));
        
        const unsubscribeResponseDelta = omniEventBus.subscribe(OmniEventType.AI_RESPONSE_DELTA, (event: OmniEvent) => {
            setMessages(prev => {
                const messagesArray = Array.isArray(prev) ? prev : [];
                const lastMessage = messagesArray[messagesArray.length - 1];
                if (lastMessage && lastMessage.sender === 'ai') {
                    // Append to existing AI message
                    return [
                        ...messagesArray.slice(0, -1),
                        { ...lastMessage, text: lastMessage.text + event.payload.text }
                    ];
                } else {
                    // Create new AI message
                    return [...messagesArray, { id: `msg_${Date.now()}`, text: event.payload.text, sender: 'ai' }];
                }
            });
        });

        return () => {
            unsubscribeThinkingStart();
            unsubscribeThinkingEnd();
            unsubscribeResponseDelta();
        };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsgId = `msg_${Date.now()}`;
        setMessages(prev => [...prev, { id: userMsgId, text: input, sender: 'user' }]);
        setInput('');

        // Dispatch UI Interaction Event
        await omniEventBus.dispatch({
            id: `interaction_${Date.now()}`,
            type: OmniEventType.UI_INTERACTION,
            timestamp: Date.now(),
            payload: { text: input, messageId: userMsgId },
            source: 'UI'
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4 rounded-xl shadow-2xl border border-gray-800">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${
                            msg.sender === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 text-gray-400 p-3 rounded-2xl rounded-bl-none border border-gray-700 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-xl border border-gray-700">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent text-white focus:outline-none px-3 py-2"
                    disabled={isThinking}
                />
                <button
                    onClick={handleSend}
                    disabled={isThinking || !input.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                    Send
                </button>
            </div>
        </div>
    );
};
