 
import { useState, useRef, useEffect } from 'react';
import { Modality } from '@google/genai';
import { geminiKeyManager } from '../../../services/geminiKeyManager';
import { CLONES } from '../../../constants/aiClones';
import { SelectedFile } from '../../../types/ai';
import { useAIHubStore } from '../../../store/aiHubStore';

export function useAIHubMedia() {
  const { selectedFiles, setSelectedFiles } = useAIHubStore();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLiveCall, setIsLiveCall] = useState(false);
  const [liveCallStatus, setLiveCallStatus] = useState('MENGHUBUNGKAN...');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedFiles(prev => [...prev, {
          file,
          base64: ev.target?.result as string,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setSelectedFiles(prev => [...prev, {
            file: new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' }),
            base64,
            type: 'audio/webm'
          }]);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const startLiveCall = async () => {
    setIsLiveCall(true);
    setLiveCallStatus('MENGHUBUNGKAN KE SINGULARITAS...');
    
    try {
      const liveCallClone = CLONES.find(c => c.id === 'live');
      if (!liveCallClone) {
        setLiveCallStatus('ERROR: Model Live Call tidak ditemukan');
        return;
      }

      setLiveCallStatus('MENGHUBUNGKAN KE SERVER HAM ENGINE...');
      
      liveSessionRef.current = await geminiKeyManager.executeWithRetry(async (client) => {
        return await (client as any).live.connect({
          model: liveCallClone.model,
          callbacks: {
            onopen: async () => {
              setLiveCallStatus('LIVE CALL AKTIF');
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const audioContext = new AudioContext({ sampleRate: 16000 });
              const source = audioContext.createMediaStreamSource(stream);
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              
              source.connect(processor);
              processor.connect(audioContext.destination);
              
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Simple PCM conversion
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = inputData[i] * 32767;
                }
                
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                liveSessionRef.current.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              };
            },
            onmessage: async (message: any) => {
              if (message.serverContent?.modelTurn?.parts[0]?.inlineData) {
                const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                // Play audio
                const audioContext = new AudioContext();
                const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
                const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
              }
            },
            onerror: (err) => {
              console.error('Live call error:', err);
              setLiveCallStatus('KONEKSI GAGAL');
              setIsLiveCall(false);
            },
            onclose: () => {
              setLiveCallStatus('KONEKSI TERPUTUS');
              setIsLiveCall(false);
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          },
        });
      });
    } catch (_err) {
      setLiveCallStatus('GAGAL MENGHUBUNGKAN');
    }
  };

  return {
    selectedFiles, setSelectedFiles,
    isRecording, setIsRecording,
    recordingTime, setRecordingTime,
    isLiveCall, setIsLiveCall,
    liveCallStatus, setLiveCallStatus,
    mediaRecorderRef, audioChunksRef, timerRef, liveSessionRef,
    handleFileUpload,
    startRecording,
    stopRecording,
    startLiveCall
  };
}

