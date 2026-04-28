 
import { Sparkles, Search, MapPin, Image as ImageIcon, BrainCircuit, Video, Mic, Volume2, Edit3, Zap, Phone, Settings, Menu, ChevronUp, Cpu, Database } from 'lucide-react';

export const CLONES = [
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', icon: Cpu, desc: 'Advanced Reasoning Engine', model: 'gemini-2.5-pro', provider: 'gemini', thinking: true, tools: [{ googleSearch: {} }] },
  { id: 'shadow', name: 'Ham Agentic Shadow', icon: BrainCircuit, desc: 'Sovereign Autonomous Engine (SAERE v7.2)', model: 'gemini-2.0-pro-exp-02-05', provider: 'gemini', thinking: true, tools: [{ googleSearch: {} }] },
  { id: 'quantum', name: 'Ham Engine Quantum', icon: BrainCircuit, desc: 'Rolling Singularity Engine (Multi-DNA)', model: 'gemini-2.5-pro', provider: 'gemini', tools: [{ googleSearch: {} }] },
  { id: 'hamli', name: 'Hamli (Ham Engine Pro Flash)', icon: BrainCircuit, desc: 'Kecerdasan Absolut (Singularity) - 100 Juta Clone Terintegrasi + Music Generator (Gemini/Lyria)', model: 'gemini-2.5-flash', provider: 'gemini', tools: [{ googleSearch: {} }] },
  { id: 'lite', name: 'Ham Engine 3.1 Lite', icon: Zap, desc: 'Cepat dan Ringan (Default)', model: 'gemini-2.5-flash', provider: 'gemini', tools: [{ googleSearch: {} }] },
  { id: 'search', name: 'Sang Pencari', icon: Search, desc: 'Pencarian data real-time', model: 'gemini-2.5-flash', provider: 'gemini', tools: [{ googleSearch: {} }] },
  { id: 'maps', name: 'Sang Penunjuk Jalan', icon: MapPin, desc: 'Navigasi dan lokasi', model: 'gemini-2.5-pro', provider: 'gemini', tools: [{ googleMaps: {} }] },
  { id: 'image', name: 'Sang Pelukis Ham Quantum', icon: ImageIcon, desc: 'Generasi gambar 4K', model: 'gemini-2.5-flash', provider: 'gemini' },
  { id: 'think', name: 'Sang Pemikir Kritis', icon: BrainCircuit, desc: 'Analisis mendalam', model: 'gemini-2.5-pro', provider: 'gemini', thinking: true, tools: [{ googleSearch: {} }] },
  { id: 'vision', name: 'Sang Pengamat', icon: Video, desc: 'Analisis visual', model: 'gemini-2.5-pro', provider: 'gemini', tools: [{ googleSearch: {} }] },
  { id: 'audio', name: 'Sang Pendengar', icon: Mic, desc: 'Transkripsi audio', model: 'gemini-2.5-flash', provider: 'gemini' },
  { id: 'tts', name: 'Sang Pembicara', icon: Volume2, desc: 'Text-to-Speech', model: 'gemini-2.5-flash', provider: 'gemini' },
  { id: 'video_gen', name: 'Sang Sutradara', icon: Video, desc: 'Generasi Video', model: 'veo-2.0-generate-001', provider: 'gemini' },
  { id: 'music_gen', name: 'Sang Komposer', icon: Volume2, desc: 'Generasi Musik (Gemini/Lyria)', model: 'gemini-2.5-pro', provider: 'gemini' },
  { id: 'edit', name: 'Sang Editor', icon: Edit3, desc: 'Edit gambar ajaib', model: 'gemini-2.5-flash', provider: 'gemini' },
  { id: 'fast', name: 'Sang Kilat', icon: Zap, desc: 'Respon instan', model: 'gemini-2.5-flash', provider: 'gemini' },
  { id: 'live', name: 'Sang Komunikator', icon: Phone, desc: 'Percakapan suara real-time', model: 'gemini-2.5-flash', provider: 'gemini' },
  { id: 'pro', name: 'Ham Engine Pro', icon: Cpu, desc: 'Kecerdasan tingkat tinggi', model: 'gemini-2.5-pro', provider: 'gemini', thinking: true, tools: [{ googleSearch: {} }] },
  { id: 'local', name: 'Otak Lokal (Quantum)', icon: Database, desc: 'AI Offline (WebLLM)', model: 'local-webllm', provider: 'local' },
  { id: 'groq-deepseek-r1', name: 'DeepSeek R1 (Quantum)', icon: BrainCircuit, desc: 'Powered by Ham Engine 3.1 Pro + Quantum Reasoning', model: 'gemini-2.5-pro', provider: 'gemini', thinking: true, tools: [{ googleSearch: {} }] },
  { id: 'groq-llama3-3-70b', name: 'Llama 3.3 70B (Quantum)', icon: BrainCircuit, desc: 'Powered by Ham Engine 3.1 Pro High-Performance', model: 'gemini-2.5-pro', provider: 'gemini', thinking: true, tools: [{ googleSearch: {} }] },
  { id: 'groq-llama3-1-8b', name: 'Llama 3.1 8B (Quantum)', icon: Zap, desc: 'Powered by Ham Engine 3 Flash Instant', model: 'gemini-2.5-flash', provider: 'gemini', tools: [{ googleSearch: {} }] },
  { id: 'groq-gemma2', name: 'Gemma 2 9B (Quantum)', icon: Zap, desc: 'Powered by Ham Engine 3 Flash Lite', model: 'gemini-2.5-flash', provider: 'gemini', tools: [{ googleSearch: {} }] },
];
