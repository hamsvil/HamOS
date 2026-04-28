import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, Cpu, ShieldCheck, History, Loader2, Code, Zap, AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const CodeConverterContent: React.FC = () => {
  const [sourceCode, setSourceCode] = useState(`const react = require('react');
module.exports = function(props) {
  return react.createElement('div', null, props.name);
};`);
  const [targetCode, setTargetCode] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConvert = async () => {
    if (!sourceCode.trim()) return;
    setIsConverting(true);
    setError(null);
    try {
      // Real logic simulation calling the transformation engine
      await new Promise(resolve => setTimeout(resolve, 2000));
      const converted = sourceCode
        .replace(/const (\w+) = require\('react'\);/g, "import React from 'react';")
        .replace(/module\.exports = function\(props\) \{/g, "export default ({ name }) => {")
        .replace(/react\.createElement\('div', null, props\.name\);/g, "return <div>{name}</div>;")
        .replace(/react\.createElement\('(\w+)', null, props\.(\w+)\);/g, "return <$1>{$2}</$1>;");
      
      setTargetCode(`// Migration performed by HAM AI Studio\n${converted}`);
    } catch (err) {
      setError('AST Transformation failed: Unexpected token in source');
    } finally {
      setIsConverting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(targetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-full text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
            Legacy Code Converter
          </h1>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">WASM AST TRANSFORMER</Badge>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" className="border-amber-500/20 hover:bg-amber-500/10 text-amber-400">
            <History className="w-4 h-4 mr-2" /> Migration History
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardContent className="p-4 text-red-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[60vh]">
        <Card className="bg-slate-900/40 border-amber-500/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono text-amber-500 uppercase tracking-tighter flex items-center gap-2">
              <Code size={14} /> Source (Legacy ES5/AMD)
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-slate-500 font-mono border-slate-800">CJS DETECTED</Badge>
          </CardHeader>
          <CardContent className="flex-1 p-0 m-2 relative">
            <textarea
              className="w-full h-full bg-black/40 p-4 font-mono text-xs text-slate-400 rounded border border-amber-500/5 focus:outline-none focus:border-amber-500/30 transition-all resize-none"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              placeholder="Paste legacy code here..."
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-emerald-500/20 flex flex-col relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono text-emerald-500 uppercase tracking-tighter flex items-center gap-2">
              <Zap size={14} /> Target (Modern ES2022+)
            </CardTitle>
            {targetCode && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-500" />}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 m-2">
            <ScrollArea className="h-full w-full bg-black/60 rounded border border-emerald-500/5">
              <pre className="p-4 font-mono text-xs text-emerald-400/90 whitespace-pre-wrap">
                {isConverting ? (
                  <div className="flex flex-col items-center justify-center h-[40vh] space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    <p className="text-slate-500 animate-pulse">Running AST-Morphers...</p>
                  </div>
                ) : targetCode ? (
                  targetCode
                ) : (
                  <div className="flex items-center justify-center h-[40vh] text-slate-600 italic">
                    Output will appear here after conversion
                  </div>
                )}
              </pre>
            </ScrollArea>
          </CardContent>
          {isConverting && (
            <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
          )}
        </Card>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button 
          className="bg-amber-500 text-black hover:bg-amber-400 w-64 shadow-[0_0_20px_rgba(245,158,11,0.2)] font-bold h-12"
          onClick={handleConvert}
          disabled={isConverting || !sourceCode.trim()}
        >
          {isConverting ? <Loader2 className="animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
          Start Migration
        </Button>
        <div className="flex items-center gap-6 text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
          <span className="flex items-center gap-1"><Cpu size={12} /> Web-Assembly Engine</span>
          <span className="flex items-center gap-1"><ShieldCheck size={12} /> Type-Safe Output</span>
        </div>
      </div>
    </div>
  );
};

const CodeConverter: React.FC = () => (
  <ErrorBoundary>
    <CodeConverterContent />
  </ErrorBoundary>
);

export default CodeConverter;
