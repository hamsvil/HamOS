/* eslint-disable no-useless-assignment */

/**
 * PILAR 1: AST-SURGEON & PILAR 3: SHADOW-ENGINE
 * Mesin pembedah kode berbasis regex tingkat lanjut untuk performa tinggi tanpa OOM.
 */
export class ShadowEngine {
    /**
     * Traces all imports using an advanced regex that supports:
     * - Default imports: import x from 'y'
     * - Named imports: import { x } from 'y'
     * - Side-effect imports: import 'y'
     * - Dynamic imports: import('y')
     * - CommonJS: require('y')
     */
    public traceDependencies(content: string): string[] {
        const dependencies: string[] = [];
        
        // Static imports, dynamic imports, and require()
        const staticImportRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"](.+?)['"])|(?:import\(['"](.+?)['"]\))|(?:require\(['"](.+?)['"]\))/g;
        
        let match;
        while ((match = staticImportRegex.exec(content)) !== null) {
            const path = match[1] || match[2] || match[3];
            if (path && !dependencies.includes(path)) {
                dependencies.push(path);
            }
        }
        
        return dependencies;
    }

    /**
     * Extracts the semantic skeleton with improved pattern matching.
     */
    public extractSemanticContext(content: string): any {
        const classes = Array.from(content.matchAll(/class\s+([\w\d_$]+)/g)).map(m => m[1]);
        const functions = Array.from(content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([\w\d_$]+)/g)).map(m => m[1]);
        const arrowFunctions = Array.from(content.matchAll(/(?:export\s+)?const\s+([\w\d_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g)).map(m => m[1]);
        const interfaces = Array.from(content.matchAll(/interface\s+([\w\d_$]+)/g)).map(m => m[1]);
        const enums = Array.from(content.matchAll(/enum\s+([\w\d_$]+)/g)).map(m => m[1]);

        return { 
            classes, 
            functions: Array.from(new Set([...functions, ...arrowFunctions])), 
            interfaces,
            enums
        };
    }
}

export class OmniGraph extends ShadowEngine {
    /**
     * Pilar 2: OMNI-GRAPH (The Universal AST Mapper)
     * Advanced graph construction capable of identifying dead branches and orphaned modules.
     */
    public buildSemanticGraph(filesContexts: Record<string, any>): Record<string, string[]> {
        const graph: Record<string, string[]> = {};
        for (const [file, context] of Object.entries(filesContexts)) {
            // Context would contain imports/exports
            graph[file] = context.dependencies || [];
        }
        return graph;
    }

    public detectOrphans(graph: Record<string, string[]>, entryPoints: string[]): string[] {
        const visited = new Set<string>();
        const traverse = (node: string) => {
            if (visited.has(node)) return;
            visited.add(node);
            const deps = graph[node] || [];
            deps.forEach(traverse);
        };
        entryPoints.forEach(traverse);

        return Object.keys(graph).filter(node => !visited.has(node));
    }
}

export class ASTSurgeon {
    /**
     * Safely renames a symbol within a scope using word boundaries.
     */
    public renameSymbol(content: string, oldName: string, newName: string): string {
        // Prevents partial matching (e.g., 'data' matching 'database')
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        return content.replace(regex, newName);
    }

    /**
     * Strips comments for cleaner processing or minification simulation.
     */
    public stripComments(content: string): string {
        return content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
    }
}
