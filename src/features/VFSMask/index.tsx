import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Eye, ShieldCheck, Database, Folder, File, ChevronRight, ChevronDown, Lock, Unlock, Loader2, Search, AlertCircle, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface VFSNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  isMasked: boolean;
  children?: VFSNode[];
}

const VFSMaskContent: React.FC = () => {
  const [nodes, setNodes] = useState<VFSNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVFS = async () => {
      try {
        setIsLoading(true);
        // Simulate OPFS scan
        await new Promise(resolve => setTimeout(resolve, 1800));
        setNodes([
          { 
            id: 'root', name: 'src', type: 'directory', isMasked: false,
            children: [
              { id: '1', name: 'secrets.env', type: 'file', isMasked: true },
              { id: '2', name: 'main.tsx', type: 'file', isMasked: false },
              { 
                id: '3', name: 'services', type: 'directory', isMasked: false,
                children: [
                  { id: '4', name: 'auth.ts', type: 'file', isMasked: true },
                  { id: '5', name: 'api.ts', type: 'file', isMasked: false },
                ]
              }
            ]
          },
          { id: '6', name: 'package.json', type: 'file', isMasked: false },
          { id: '7', name: 'hamli_memory.json', type: 'file', isMasked: true },
        ]);
      } catch (err) {
        setError('Failed to mount Virtual File System');
      } finally {
        setIsLoading(false);
      }
    };
    loadVFS();
  }, []);

  const toggleMask = (id: string) => {
    const updateNodes = (list: VFSNode[]): VFSNode[] => {
      return list.map(node => {
        if (node.id === id) return { ...node, isMasked: !node.isMasked };
        if (node.children) return { ...node, children: updateNodes(node.children) };
        return node;
      });
    };
    setNodes(updateNodes(nodes));
  };

  const renderNode = (node: VFSNode, depth = 0) => {
    return (
      <div key={node.id} className="space-y-1">
        <div 
          className="flex items-center justify-between group px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          <div className="flex items-center gap-2">
            {node.type === 'directory' ? (
              <ChevronDown size={14} className="text-slate-500" />
            ) : (
              <File size={14} className="text-slate-500" />
            )}
            <span className={`text-sm font-mono ${node.isMasked ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
              {node.name}
            </span>
            {node.isMasked && <Lock size={10} className="text-emerald-500" />}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => toggleMask(node.id)}
          >
            {node.isMasked ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-slate-600" />}
          </Button>
        </div>
        {node.children && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-full text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-mono">
            Aura / VFS Mask
          </h1>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-[10px]">QUANTUM SYNC ACTIVE</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <Input 
              className="pl-9 bg-slate-900/50 border-emerald-500/20 text-xs h-9 focus-visible:ring-emerald-500/30" 
              placeholder="Search VFS nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900/40 border-emerald-500/20 backdrop-blur-md flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-emerald-500/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              OPFS Node Topology
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-emerald-400/60 border-emerald-500/20">HYBRID-FS</Badge>
          </CardHeader>
          <CardContent className="flex-1 p-2">
            <ScrollArea className="h-[500px] pr-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-slate-500 font-mono text-xs uppercase animate-pulse">Scanning mount points...</p>
                </div>
              ) : (
                <div className="py-2">
                  {nodes.map(node => renderNode(node))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900/40 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Encryption & Masking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-xs font-mono text-slate-400">Security Layer</span>
                <span className="text-xs text-emerald-400 font-bold uppercase">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-xs font-mono text-slate-400">Masking Mode</span>
                <span className="text-xs text-emerald-400 font-bold uppercase">Dynamic Hash</span>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 mt-2">
                Rotate Master Keys
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                VFS Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>MASKED COVERAGE</span>
                    <span>15%</span>
                  </div>
                  <div className="h-1.5 w-full bg-emerald-500/10 rounded-full overflow-hidden">
                    <div className="h-full w-[15%] bg-emerald-500" />
                  </div>
               </div>
               <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-500">Total Nodes:</span>
                    <span className="text-slate-200">1,248</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-500">Sync Latency:</span>
                    <span className="text-emerald-400">0.4ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-500">Integrity:</span>
                    <span className="text-emerald-400">Verified</span>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const VFSMask: React.FC = () => (
  <ErrorBoundary>
    <VFSMaskContent />
  </ErrorBoundary>
);

export default VFSMask;
