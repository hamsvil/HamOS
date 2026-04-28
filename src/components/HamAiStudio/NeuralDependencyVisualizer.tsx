 
import React, { useLayoutEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useProjectStore } from '../../store/projectStore';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'file' | 'folder';
  radius: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: 'hierarchy' | 'dependency';
}

export const NeuralDependencyVisualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const project = useProjectStore(state => state.project);
  const setIsDatabaseVisualizerOpen = useProjectStore(state => state.setUiState);

  useLayoutEffect(() => {
    if (!svgRef.current || !project) return;

    const width = 800;
    const height = 600;

    const nodesMap = new Map<string, Node>();
    const links: Link[] = [];

    // 1. Build Hierarchy (Folders and Files)
    project.files.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const isFile = i === parts.length - 1;
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodesMap.has(currentPath)) {
          nodesMap.set(currentPath, {
            id: currentPath,
            name: part,
            type: isFile ? 'file' : 'folder',
            radius: isFile ? 6 : 10,
          });
        }

        if (parentPath && !links.some(l => l.source === parentPath && l.target === currentPath)) {
          links.push({
            source: parentPath,
            target: currentPath,
            type: 'hierarchy'
          });
        }
      }
    });

    // 2. Build Dependencies (Imports)
    project.files.forEach(file => {
      const importRegex = /(?:import|export)\s+.*\s+from\s+['"](.*)['"]/g;
      const dynamicImportRegex = /import\(['"](.*)['"]\)/g;
      
      const processMatch = (match: string) => {
        if (match.startsWith('.')) {
          const currentDir = file.path.substring(0, file.path.lastIndexOf('/'));
          // Extremely basic path resolution
          let resolvedPath = match;
          if (match.startsWith('./')) {
            resolvedPath = currentDir ? `${currentDir}/${match.substring(2)}` : match.substring(2);
          } else if (match.startsWith('../')) {
            const dirParts = currentDir.split('/');
            const matchParts = match.split('/');
            while (matchParts[0] === '..') {
              matchParts.shift();
              dirParts.pop();
            }
            resolvedPath = [...dirParts, ...matchParts].join('/');
          }

          // Try to find the actual file
          const targetFile = project.files.find(f => 
            f.path === resolvedPath || 
            f.path === `${resolvedPath}.ts` || 
            f.path === `${resolvedPath}.tsx` ||
            f.path === `${resolvedPath}.js` ||
            f.path === `${resolvedPath}.jsx` ||
            f.path === `${resolvedPath}/index.ts` ||
            f.path === `${resolvedPath}/index.tsx`
          );

          if (targetFile && nodesMap.has(targetFile.path)) {
             // Avoid duplicate links
             if (!links.some(l => l.source === file.path && l.target === targetFile.path)) {
                links.push({ source: file.path, target: targetFile.path, type: 'dependency' });
             }
          }
        }
      };

      let match;
      while ((match = importRegex.exec(file.content)) !== null) processMatch(match[1]);
      while ((match = dynamicImportRegex.exec(file.content)) !== null) processMatch(match[1]);
    });

    const nodes = Array.from(nodesMap.values());

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%')
      .attr('height', '100%');

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(d => d.type === 'hierarchy' ? 50 : 150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => (d as Node).radius + 5));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.type === 'hierarchy' ? '#52525b' : '#8b5cf6') // zinc-600 vs violet-500
      .attr('stroke-opacity', d => d.type === 'hierarchy' ? 0.4 : 0.8)
      .attr('stroke-width', d => d.type === 'hierarchy' ? 1 : 1.5)
      .attr('stroke-dasharray', d => d.type === 'dependency' ? '4,4' : 'none');

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.type === 'folder' ? '#3b82f6' : '#10b981') // blue-500 vs emerald-500
      .attr('stroke', '#18181b') // zinc-900
      .attr('stroke-width', 2);

    node.append('text')
      .text(d => d.name)
      .attr('x', d => d.radius + 4)
      .attr('y', 3)
      .attr('fill', '#a1a1aa') // zinc-400
      .style('font-size', '10px')
      .style('font-family', 'monospace')
      .style('pointer-events', 'none');

    node.append('title')
      .text(d => `${d.type.toUpperCase()}: ${d.id}`);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x ?? 0)
        .attr('y1', d => (d.source as Node).y ?? 0)
        .attr('x2', d => (d.target as Node).x ?? 0)
        .attr('y2', d => (d.target as Node).y ?? 0);

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [project]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
    >
      <div className="relative w-full max-w-5xl h-[80vh] bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-100 font-mono">Neural Dependency Graph</h2>
            <div className="px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono">
              Live Topology
            </div>
          </div>
          <button 
            onClick={() => setIsDatabaseVisualizerOpen({ isDatabaseVisualizerOpen: false })}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 relative bg-zinc-950">
          <svg ref={svgRef} className="w-full h-full cursor-move" />
          
          {/* Legend */}
          <div className="absolute bottom-6 left-6 bg-zinc-900/90 backdrop-blur-md p-4 rounded-xl border border-zinc-800 shadow-xl">
            <h3 className="text-xs font-bold text-zinc-300 mb-3 uppercase tracking-wider">Legend</h3>
            <div className="space-y-2 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span>Directory</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span>File</span>
              </div>
              <div className="h-px bg-zinc-800 my-2" />
              <div className="flex items-center gap-3">
                <div className="w-4 h-0.5 bg-zinc-600" />
                <span>Hierarchy</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-0.5 bg-violet-500 border-t border-dashed border-violet-500" style={{ borderTopWidth: '2px' }} />
                <span>Import Dependency</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
