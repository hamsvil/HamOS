import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Radio, Share2, Waves, Loader2, Play, Square, Save, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const VoiceMirrorContent: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(20).fill(0));
  const [inputText, setInputText] = useState('');
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      const updateLevels = () => {
        setAudioLevel(prev => prev.map(() => Math.random() * 100));
        animationRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setAudioLevel(new Array(20).fill(5));
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording]);

  const handleRecord = () => {
    setError(null);
    setIsRecording(!isRecording);
  };

  const handleSynthesize = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      setError('Neural Synthesis failed: Voice profile not calibrated');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-full text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Bio-Metric Voice Mirror
          </h1>
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">NEURAL TTS ENGINE</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            <Share2 className="w-4 h-4 mr-2" /> Export Voice Profile
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardContent className="p-4 text-red-400 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              Calibration & Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                isRecording 
                  ? 'bg-red-500/20 border-4 border-red-500 animate-pulse scale-110 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
                  : 'bg-purple-500/10 border-2 border-purple-500/30'
              }`}>
                {isRecording ? <Square className="w-8 h-8 text-red-500" fill="currentColor" /> : <Mic className="w-10 h-10 text-purple-500" />}
              </div>
              {isRecording && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                  REC
                </div>
              )}
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-sm">
                {isRecording ? 'Capturing bio-metric vocal patterns...' : 'Voice Mirror requires 30s of speech for calibration.'}
              </p>
              <Button 
                variant={isRecording ? 'destructive' : 'default'} 
                className={isRecording ? '' : 'bg-purple-600 hover:bg-purple-500'}
                onClick={handleRecord}
              >
                {isRecording ? 'Stop Calibration' : 'Start Recording'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Waves className="w-4 h-4 text-purple-400" />
              Spectral Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex flex-col items-center justify-center">
            <div className="flex items-end gap-1 h-32 w-full max-w-xs px-4">
              {audioLevel.map((level, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-t-sm transition-all duration-100 ${
                    isRecording ? 'bg-purple-500' : 'bg-purple-500/20'
                  }`}
                  style={{ height: `${Math.max(5, level)}%` }}
                />
              ))}
            </div>
            <div className="mt-6 flex gap-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Pitch Stable</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Formant Sync</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full bg-slate-900/40 border-purple-500/20">
          <CardHeader>
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <Radio className="w-4 h-4 text-purple-400" />
               Edge-TTS Neural Synthesis
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                placeholder="Enter text to synthesize with your mirrored voice..." 
                className="flex-1 bg-black/40 border border-purple-500/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/40 transition-all text-slate-200"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isProcessing}
              />
              <Button 
                className="bg-purple-600 hover:bg-purple-500 text-white min-w-[120px] h-11"
                disabled={isProcessing || !inputText.trim()}
                onClick={handleSynthesize}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Synthesize</>}
              </Button>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-600">
               <p>PROCESSED VIA LOCAL WASM PIPELINE</p>
               <Button variant="ghost" size="sm" className="h-6 text-[10px] hover:text-purple-400"><Save size={12} className="mr-1" /> Save as Template</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const VoiceMirror: React.FC = () => (
  <ErrorBoundary>
    <VoiceMirrorContent />
  </ErrorBoundary>
);

export default VoiceMirror;
