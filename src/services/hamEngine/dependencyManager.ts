/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { TaskModule, EngineState } from "./types";
import { GenerationStep } from "../../components/HamAiStudio/types";
import { healAndParseJSON, sanitizePath, saveState } from "./utils";
import { vfs } from "../vfsService";
import { useProjectStore } from "../../store/projectStore";
import { EnvironmentChecker } from "../environmentChecker";

export async function handleDependencies(
    currentCode: string,
    nextTask: TaskModule,
    state: EngineState,
    projectId: string,
    stepId: string,
    onStep: (step: GenerationStep) => void
): Promise<void> {
    const cleanCode = currentCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    const newDependencies: Set<string> = new Set();
    const NODE_BUILTINS = new Set(['fs', 'path', 'crypto', 'os', 'http', 'https', 'net', 'tls', 'events', 'stream', 'util', 'child_process', 'cluster', 'zlib', 'buffer', 'querystring', 'readline', 'dns', 'dgram', 'url', 'v8', 'vm', 'worker_threads', 'perf_hooks', 'async_hooks', 'punycode', 'string_decoder', 'tty', 'assert', 'module']);
    
    while ((match = importRegex.exec(cleanCode)) !== null) {
        const pkgName = match[1];
        if (!pkgName.startsWith('.') && !pkgName.startsWith('/') && !pkgName.startsWith('node:')) {
            const basePkg = pkgName.startsWith('@') ? pkgName.split('/').slice(0, 2).join('/') : pkgName.split('/')[0];
            if (!NODE_BUILTINS.has(basePkg)) {
                newDependencies.add(basePkg);
            }
        }
    }

    if (newDependencies.size > 0) {
        let pkgJsonStr = '{}';
        try {
            pkgJsonStr = useProjectStore.getState().shadowBuffers['package.json'] || await vfs.readFile('package.json');
        } catch (e) {
            pkgJsonStr = '{\n  "name": "ham-project",\n  "private": true,\n  "dependencies": {}\n}'; // Auto-Heal missing package.json
        }

        try {
            const pkgJson = healAndParseJSON(pkgJsonStr) as { dependencies?: Record<string, string> };
            let pkgUpdated = false;
            
            if (!pkgJson.dependencies) pkgJson.dependencies = {};
            
            for (const dep of newDependencies) {
                if (['react', 'react-dom', 'lucide-react'].includes(dep)) continue;
                
                if (!pkgJson.dependencies[dep]) {
                    try {
                        const response = await fetch(`https://registry.npmjs.org/${dep}`);
                        if (response.ok) {
                            pkgJson.dependencies[dep] = 'latest';
                            pkgUpdated = true;
                        }
                    } catch (e) {
                        pkgJson.dependencies[dep] = 'latest';
                        pkgUpdated = true;
                    }
                }
            }
            
            if (pkgUpdated) {
                const indentMatch = pkgJsonStr.match(/^[ \t]+/m);
                const indent = indentMatch ? indentMatch[0] : 2;
                const newPkgStr = JSON.stringify(pkgJson, null, indent);
                healAndParseJSON(newPkgStr); 
                useProjectStore.getState().setShadowBuffer('package.json', newPkgStr);
                
                const envMsg = EnvironmentChecker.isNativeAndroid() 
                    ? "Native Android detected. NPM install bypassed." 
                    : "Auto-installed missing packages.";
                    
                onStep({ id: stepId + '-deps', type: 'action', label: 'Dependencies Updated', status: 'completed', details: [envMsg] });
            }
        } catch (e) {}
    }

    const localImportRegex = /import\s+.*?from\s+['"](\.[^'"]+)['"]/g;
    let localMatch;
    let spawnedCount = 0;
    while ((localMatch = localImportRegex.exec(cleanCode)) !== null) {
        const importPath = localMatch[1];
        const currentDir = nextTask.path.substring(0, nextTask.path.lastIndexOf('/'));
        let resolvedPath = sanitizePath(`${currentDir}/${importPath}`);
        
        if (!resolvedPath.match(/\.(ts|tsx|js|jsx|css|scss)$/)) {
            // VFS Probe: Check for multiple extensions
            const extensions = ['.tsx', '.ts', '.jsx', '.js'];
            let foundExtension = '.ts';
            for (const ext of extensions) {
                try {
                    await vfs.stat(resolvedPath + ext);
                    foundExtension = ext;
                    break;
                } catch (e) {}
            }
            resolvedPath += foundExtension;
        }

        const existsInManifest = state.manifest.modules.some(m => m.path.replace(/\.[^/.]+$/, "") === resolvedPath.replace(/\.[^/.]+$/, ""));
        
        if (!existsInManifest) {
            let existsInVfs = false;
            try { await vfs.stat(resolvedPath); existsInVfs = true; } catch (e) {
                try { await vfs.stat(resolvedPath + 'x'); existsInVfs = true; } catch (e2) {}
            }

            if (!existsInVfs) {
                const newModuleId = `mod_spawned_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                state.manifest.modules.push({
                    id: newModuleId,
                    name: resolvedPath.split('/').pop() || 'AutoSpawnedModule',
                    path: resolvedPath,
                    description: `Auto-spawned dependency required by ${nextTask.name}`,
                    dependencies: [],
                    action: 'create',
                    status: 'pending',
                    attempts: 0
                });
                spawnedCount++;
            }
        }
    }
    if (spawnedCount > 0) {
        onStep({ id: stepId + '-spawn', type: 'action', label: 'Dynamic Spawning', status: 'completed', details: [`Auto-spawned ${spawnedCount} missing local dependencies.`] });
        await saveState(projectId, state);
    }
}
