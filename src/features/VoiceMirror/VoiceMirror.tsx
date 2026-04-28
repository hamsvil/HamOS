import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Radio, Share2, Waves } from 'lucide-react';

const VoiceMirror: React.FC = () => {
  return (
    <div className="p-6 space-y-6 bg-background/50 backdrop-blur-xl min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Bio-Metric Voice Mirror
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-purple-500/30"><Share2 className="w-4 h-4 mr-2" /> Export Voice Profile</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-black/20 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              Calibration & Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex flex-col items-center justify-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center animate-pulse">
               <Mic className="w-10 h-10 text-purple-500" />
            </div>
            <p className="text-muted-foreground text-sm text-center px-8">
              Voice Mirror requires microphone access for real-time bio-metric analysis.
            </p>
            <p className="text-xs text-purple-400/60 font-mono">[STUB: WASM Audio Pipeline Active]</p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Waves className="w-4 h-4 text-purple-400" />
              Spectral Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <div className="flex items-end gap-1 h-20">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-purple-500/40 rounded-t"
                  style={{ height: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full bg-black/20 border-purple-500/20">
          <CardHeader>
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <Radio className="w-4 h-4 text-purple-400" />
               Edge-TTS Synthesis
             </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Enter text to synthesize with your voice mirror..." 
              className="flex-1 bg-white/5 border border-purple-500/10 rounded px-4 py-2 text-sm focus:outline-none focus:border-purple-500/40"
            />
            <Button variant="secondary">Synthesize</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoiceMirror;
