 
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX, Loader2, Radio } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { geminiKeyManager } from '../../services/geminiKeyManager';
import { useToast } from '../../context/ToastContext';

interface LiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { GLOBAL_AI_CAPABILITIES } from '../../config/aiCapabilities';

export default function LiveSessionModal({ isOpen, onClose }: LiveSessionModalProps) {
  const { showToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(true);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen && !isConnected) {
      startSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen]);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      // Use GeminiKeyManager for rotation and load balancing
      const session = await geminiKeyManager.executeWithRetry(async (client) => {
        return await (client as any).live.connect({
          model: "gemini-2.5-flash",
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction: `You are Ham Engine APEX V4.0 Engine Live. You can hear and speak to the user in real-time. Keep responses concise and helpful for coding tasks.\n\n=== HAM ENGINE APEX V4.0 COGNITIVE ARCHITECTURE ===\n1. [OBSERVE]: Understand the user's intent.\n2. [THINK]: Determine if action is needed.\n3. [ACT]: Respond or execute.\n\n=== STRICT CONSTRAINTS ===\n- DO NOT guess.\n- DO NOT act unprompted.\n- SUPREME PROTOCOL is active.\n\n${GLOBAL_AI_CAPABILITIES}\n\n[SYSTEM REMINDER: Terapkan protokol HAM ENGINE APEX V4.0 (READ STRUKTUR, ANTI-PANGKAS, ANTI-SIMULASI, SELF-HEALING, ANTI-BLANK SCREEN, ADVANCED REASONING, HOLOGRAPHIC MEMORY AWARENESS) secara ketat.]`,
          }
        });
      });
      
      sessionRef.current = session;

      session.on("open", () => {
        setIsConnected(true);
        setIsConnecting(false);
        startMic();
      });

      session.on("message", async (message: any) => {
        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
          playAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
        }
        if (message.serverContent?.modelTurn?.parts[0]?.text) {
          setTranscript(prev => [...prev, `AI: ${message.serverContent.modelTurn.parts[0].text}`]);
        }
        if (message.serverContent?.inputTranscription) {
          setTranscript(prev => [...prev, `You: ${message.serverContent.inputTranscription.text}`]);
        }
      });

      session.on("close", () => {
        setIsConnected(false);
        onClose();
      });

      session.on("error", (err: any) => {
        console.error("Live API Error:", err);
        setIsConnecting(false);
      });
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsMicActive(false);
    nextStartTimeRef.current = 0;
  };

  const startMic = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      nextStartTimeRef.current = audioContext.currentTime;

      // Load AudioWorklet
      await audioContext.audioWorklet.addModule('/audio-processor.js');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      setIsMicActive(true);
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;
      
      workletNode.port.onmessage = (event) => {
        if (!sessionRef.current) return;
        
        const inputData = event.data; // Float32Array
        
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to Base64
        const buffer = new ArrayBuffer(pcmData.length * 2);
        new Int16Array(buffer).set(pcmData);
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        sessionRef.current.sendRealtimeInput({
          media: {
            mimeType: "audio/pcm;rate=16000",
            data: base64
          }
        });
      };
      
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

    } catch (err: any) {
      console.error("Failed to access microphone or load worklet:", err);
      showToast(`Gagal mengakses mikrofon: ${err.message}`, 'error');
      setIsMicActive(false);
    }
  };

  const playAudio = async (base64Data: string) => {
    if (!isAudioActive || !audioContextRef.current) return;
    
    try {
      // Decode Base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Ensure even length for Int16Array
      const validLen = bytes.length - (bytes.length % 2);
      const int16Data = new Int16Array(bytes.buffer, 0, validLen / 2);
      
      // Convert Int16 PCM to Float32
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768.0;
      }
      
      // Create AudioBuffer (Ham Engine Live usually returns 24kHz)
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);
      
      // Schedule Playback
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      const currentTime = audioContextRef.current.currentTime;
      // Ensure smooth playback by scheduling after the previous chunk
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch (e) {
      console.error("Error playing audio:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4">
      <div className="bg-[#0a0a0a] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 flex flex-col aspect-square relative">
        
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500 rounded-full blur-[100px] animate-pulse"></div>
        </div>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ham Live Session</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Visualizer Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${isMicActive ? 'border-blue-500 scale-110 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'border-white/10'}`}>
              {isConnecting ? (
                <Loader2 size={48} className="text-blue-400 animate-spin" />
              ) : (
                <Radio size={48} className={isConnected ? 'text-blue-400 animate-pulse' : 'text-gray-600'} />
              )}
            </div>
            {isMicActive && (
              <>
                <div className="absolute -inset-4 border border-blue-500/30 rounded-full animate-ping"></div>
                <div className="absolute -inset-8 border border-blue-500/10 rounded-full animate-ping [animation-delay:0.5s]"></div>
              </>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              {isConnecting ? 'Connecting to Ham Engine...' : isConnected ? 'Listening...' : 'Disconnected'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {isConnected ? 'You can speak now. Ham is ready to help with your code.' : 'Please wait while we establish a secure connection.'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="p-8 flex items-center justify-center gap-6 relative z-10">
          <button 
            onClick={() => setIsMicActive(!isMicActive)}
            className={`p-4 rounded-full transition-all ${isMicActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}
          >
            {isMicActive ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          
          <button 
            onClick={() => setIsAudioActive(!isAudioActive)}
            className={`p-4 rounded-full transition-all ${isAudioActive ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
          >
            {isAudioActive ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>

        {/* Transcript Area */}
        <div className="absolute top-32 bottom-64 left-6 right-6 z-10 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2">
          <div className="space-y-3 text-sm">
            {transcript.map((line, index) => (
              <p key={index} className={`${line.startsWith('AI:') ? 'text-blue-300' : 'text-gray-300 text-right'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
