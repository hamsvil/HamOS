import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Box, Play, BoxSelect, Download } from 'lucide-react';

const MeshStudio: React.FC = () => {
  return (
    <div className="p-6 space-y-6 bg-background/50 backdrop-blur-xl min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Procedural Mesh Studio
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><BoxSelect className="w-4 h-4 mr-2" /> Select Area</Button>
          <Button size="sm"><Play className="w-4 h-4 mr-2" /> Generate Mesh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-black/20 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-400" />
              Viewport (WebGPU Preview)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center border-2 border-dashed border-blue-500/10 rounded-lg m-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">3D Preview Hardware Dependent</p>
              <p className="text-xs text-blue-400/60 font-mono">[STUB: Three.js Renderer Active]</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Generation Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-blue-500/5 border border-blue-500/10">
              <p className="text-xs text-blue-400 font-mono uppercase tracking-widest mb-1">Status</p>
              <p className="text-sm font-medium">Engine Ready</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Complexity</label>
              <div className="h-1 w-full bg-blue-500/20 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-blue-500" />
              </div>
            </div>
            <Button className="w-full mt-4" variant="secondary">
              <Download className="w-4 h-4 mr-2" /> Export GLTF/OBJ
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeshStudio;
