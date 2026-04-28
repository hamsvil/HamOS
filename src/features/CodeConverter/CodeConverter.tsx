import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, Cpu, ShieldCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CodeConverter: React.FC = () => {
  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-200">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
          Legacy Code Converter
        </h1>
        <Button variant="outline" size="sm" className="border-amber-500/20 hover:bg-amber-500/10">
          <History className="w-4 h-4 mr-2" /> Migration History
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        <Card className="bg-amber-950/10 border-amber-500/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono text-amber-500 uppercase tracking-tighter">Source (Legacy ES5/AMD)</CardTitle>
            <div className="text-[10px] text-slate-500 font-mono">DETECTED: CommonJS</div>
          </CardHeader>
          <CardContent className="flex-1 font-mono text-[11px] p-4 bg-black/40 m-2 rounded overflow-auto border border-amber-500/5">
            <p className="text-slate-500">const react = require('react');</p>
            <p className="text-slate-500">module.exports = function(props) {'{'}</p>
            <p className="text-slate-500">  return react.createElement('div', null, props.name);</p>
            <p className="text-slate-500">{'}'};</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-950/10 border-amber-500/20 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono text-emerald-500 uppercase tracking-tighter">Target (Modern ES2022+)</CardTitle>
            <div className="text-[10px] text-slate-500 font-mono">CONVERSION RATIO: 1.0</div>
          </CardHeader>
          <CardContent className="flex-1 font-mono text-[11px] p-4 bg-black/40 m-2 rounded overflow-auto border border-emerald-500/5">
            <p className="text-emerald-400/80 font-bold italic">// Migration performed by HAM AI Studio</p>
            <p className="text-emerald-400">import React from 'react';</p>
            <p className="text-emerald-400">export default ({'{'} name {'}'}) =&gt; {'{'}</p>
            <p className="text-emerald-400">  return &lt;div&gt;{'{'}name{'}'}&lt;/div&gt;;</p>
            <p className="text-emerald-400">{'}'};</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button className="bg-amber-500 text-black hover:bg-amber-400 w-64 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <ArrowRightLeft className="w-4 h-4 mr-2" /> Start Migration
        </Button>
      </div>
      
      <p className="text-center text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
        WASM powered AST Transformer Active
      </p>
    </div>
  );
};

export default CodeConverter;
