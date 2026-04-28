 
 
// [UI LAYER] Direct DOM manipulation acknowledged and isolated.
import { ProjectFile } from '../types';
import { CDN_URLS } from '../../../constants/dependencies';

export interface PreviewGeneratorOptions {
    files: ProjectFile[];
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export const generatePreviewContent = async (options: PreviewGeneratorOptions): Promise<string> => {
    const { files, showToast } = options;

    // PROTOKOL: Autonomous Preview-Ready Bundling
    // 1. Find Entry Point & Base HTML
    let htmlBase = '<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body><div id="root"></div></body></html>';
    const indexFile = files.find(f => f.path.endsWith('index.html'));
    if (indexFile) {
        htmlBase = indexFile.content;
    }

    // 2. Asset Audit & Path Mapping
    const assetMap: Record<string, string> = {};
    for (const file of files) {
        if (!file.path.match(/\.(js|jsx|ts|tsx|css|html|json)$/i)) {
            const mimeType = file.path.endsWith('.png') ? 'image/png' :
                             file.path.endsWith('.jpg') || file.path.endsWith('.jpeg') ? 'image/jpeg' :
                             file.path.endsWith('.svg') ? 'image/svg+xml' :
                             file.path.endsWith('.gif') ? 'image/gif' : 'application/octet-stream';
            
            let blob: Blob;
            if (file.content.startsWith('data:')) {
                const res = await fetch(file.content);
                blob = await res.blob();
            } else {
                blob = new Blob([file.content], { type: mimeType });
            }
            assetMap[file.path] = URL.createObjectURL(blob);
            const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
            assetMap['./' + cleanPath] = assetMap[file.path];
            assetMap[cleanPath] = assetMap[file.path];
        }
    }

    // 3. Extract & Inline CSS
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    let combinedCss = cssFiles.map(f => {
        let content = f.content;
        Object.keys(assetMap).forEach(path => {
            const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            content = content.replace(new RegExp(`url\\(['"]?${escapedPath}['"]?\\)`, 'g'), `url(${assetMap[path]})`);
        });
        return `/* ${f.path} */\n${content}`;
    }).join('\n');

    // 4. Prepare JS Modules
    const jsFiles = files.filter(f => f.path.match(/\.(js|jsx|ts|tsx)$/));
    
    const moduleSystem = `
        (function() {
            const modules = {};
            const cache = {};
            
            function normalizePath(path, base) {
                if (!path.startsWith('.')) return path;
                const parts = (base || '').split('/').filter(Boolean);
                parts.pop();
                const pathParts = path.split('/').filter(Boolean);
                for (const p of pathParts) {
                    if (p === '..') parts.pop();
                    else if (p !== '.') parts.push(p);
                }
                return parts.join('/');
            }

            function require(name, base) {
                let resolvedName = name;
                if (resolvedName.startsWith('@/')) {
                    resolvedName = 'src/' + resolvedName.substring(2);
                }
                const normalizedName = normalizePath(resolvedName, base).replace(/\\.(js|jsx|ts|tsx)$/, '');
                if (cache[normalizedName]) return cache[normalizedName].exports;
                if (window.__HAM_ASSETS__ && window.__HAM_ASSETS__[normalizedName]) return window.__HAM_ASSETS__[normalizedName];
                if (window.__HAM_ASSETS__ && window.__HAM_ASSETS__[resolvedName]) return window.__HAM_ASSETS__[resolvedName];
                
                const module = modules[normalizedName] || modules[resolvedName] || modules[resolvedName.replace(/^\\.\\//, '')];
                if (!module) {
                    if (!resolvedName.startsWith('.') && !resolvedName.startsWith('/')) return window[resolvedName] || {};
                    throw new Error('Module not found: ' + resolvedName + (base ? ' (required from ' + base + ')' : ''));
                }
                const m = { exports: {} };
                cache[normalizedName] = m;
                module.fn((n) => require(n, normalizedName), m.exports, m);
                return m.exports;
            }
            window.__HAM_MODULES__ = modules;
            window.__HAM_REQUIRE__ = (name) => require(name, '');
            window.__HAM_ASSETS__ = ${JSON.stringify(assetMap)};
        })();
    `;

    const workerBlob = new Blob([`
        importScripts('${CDN_URLS.BABEL}');
        self.onmessage = function(e) {
            const { id, code, options } = e.data;
            try {
                const result = Babel.transform(code, options);
                self.postMessage({ id, result: result.code });
            } catch (err) {
                self.postMessage({ id, error: err.message });
            }
        };
    `], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);

    const transpileFile = (file: ProjectFile, preprocessedContent: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const id = file.path;
            const handler = (e: MessageEvent) => {
                if (e.data.id === id) {
                    worker.removeEventListener('message', handler);
                    if (e.data.error) reject(new Error(e.data.error));
                    else resolve(e.data.result);
                }
            };
            worker.addEventListener('message', handler);
            worker.postMessage({
                id,
                code: preprocessedContent,
                options: {
                    presets: ['env', ['react', { runtime: 'automatic' }], 'typescript'],
                    filename: file.path
                }
            });
        });
    };

    const transpilationPromises = jsFiles.map(async (file) => {
        try {
            let preprocessedContent = file.content;
            preprocessedContent = preprocessedContent.replace(/import\s+['"]([^'"]+\.css)['"]\s*;?/g, (match, p1) => {
                return `/* Inlined CSS: ${p1} */`;
            });

            let code = await transpileFile(file, preprocessedContent);
            Object.keys(assetMap).forEach(path => {
                const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                code = code.replace(new RegExp(`(['"])${escapedPath}(['"])`, 'g'), `$1${assetMap[path]}$2`);
            });

            const moduleName = file.path.replace(/^\//, '').replace(/\.(js|jsx|ts|tsx)$/, '');
            return `
                window.__HAM_MODULES__["${moduleName}"] = {
                    fn: function(require, exports, module) {
                        ${code}
                    }
                };
            `;
        } catch (err: any) {
            showToast(`Error Transpilasi di ${file.path}: ${err.message}`, 'error');
            throw new Error(`Transpilation Error in ${file.path}: ${err.message}`, { cause: err });
        }
    });

    const transpiledScripts = await Promise.all(transpilationPromises);
    const inlinedScripts = transpiledScripts.join('\n');
    
    worker.terminate();
    URL.revokeObjectURL(workerUrl);

    // 5. Construct Final Single-File HTML
    const entryFile = files.find(f => f.path.match(/(src\/)?(main|index)\.(tsx|ts|jsx|js)$/)) || files.find(f => f.path.match(/(src\/)?App\.(tsx|ts|jsx|js)$/));
    if (!entryFile) {
        throw new Error("No entry file found. Please ensure your project has a src/main.tsx, src/index.tsx, or src/App.tsx file.");
    }
    const entryModuleName = entryFile.path.replace(/^\//, '').replace(/\.(js|jsx|ts|tsx)$/, '');

    const packageJsonFile = files.find(f => f.path === 'package.json');
    let dynamicLibs = '';
    const hardcoded = ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client', 'lucide-react', 'framer-motion', 'recharts', 'd3'];
    const extraLibsMap = new Map<string, string>();

    if (packageJsonFile) {
        try {
            const pkg = JSON.parse(packageJsonFile.content);
            const deps = { ...(pkg.dependencies || {}) };
            Object.entries(deps).forEach(([name, version]) => {
                if (!hardcoded.includes(name)) {
                    const cleanVersion = (version as string).replace(/^[^\d]/, '');
                    extraLibsMap.set(name, `https://esm.sh/${name}@${cleanVersion}`);
                }
            });
        } catch (e) {
            // console.warn("Failed to parse package.json for dependencies", e);
        }
    }

    if (extraLibsMap.size > 0) {
        const extraLibs = Array.from(extraLibsMap.entries()).map(([name, url]) => `"${name}": "${url}"`);
        dynamicLibs = ',\n                    ' + extraLibs.join(',\n                    ');
    }

    const finalHtml = htmlBase
        .replace(/<head[^>]*>/i, (match) => `
            ${match}
            <script src="${CDN_URLS.TAILWIND}"></script>
            <style>
                ${combinedCss}
                #error-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 0, 0, 0.9); color: white; padding: 20px; z-index: 9999; font-family: monospace; overflow: auto; }
                #boot-loader { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: sans-serif; color: #666; display: flex; flex-direction: column; align-items: center; gap: 10px; }
                .spinner { width: 24px; height: 24px; border: 3px solid #ccc; border-top-color: #007bff; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
            <script type="importmap">
                {
                    "imports": {
                        "react": "https://esm.sh/react@18.2.0",
                        "react-dom": "https://esm.sh/react-dom@18.2.0",
                        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                        "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
                        "lucide-react": "https://esm.sh/lucide-react@0.263.1",
                        "motion/react": "https://esm.sh/framer-motion@12.0.0-alpha.0/react",
                        "framer-motion": "https://esm.sh/framer-motion@12.0.0-alpha.0",
                        "recharts": "https://esm.sh/recharts@2.8.0",
                        "d3": "https://esm.sh/d3@7.8.5"${dynamicLibs}
                    }
                }
            </script>
            <script>
                ${moduleSystem}
                (function() {
                    window.onerror = function(msg, url, lineNo, columnNo, error) {
                        const overlay = document.getElementById('error-overlay');
                        const msgEl = document.getElementById('error-message');
                        if (overlay && msgEl) {
                            overlay.style.display = 'block';
                            msgEl.textContent = msg + '\\n' + (error && error.stack ? error.stack : '');
                        }
                        // console.error('Runtime Error:', msg, error);
                        return false;
                    };
                    window.addEventListener('unhandledrejection', function(event) {
                        const overlay = document.getElementById('error-overlay');
                        const msgEl = document.getElementById('error-message');
                        if (overlay && msgEl) {
                            overlay.style.display = 'block';
                            msgEl.textContent = 'Unhandled Promise Rejection: ' + (event.reason && event.reason.stack ? event.reason.stack : event.reason);
                        }
                        // console.error('Unhandled Rejection:', event.reason);
                    });
                })();
            </script>
        `)
        .replace(/<\/body>/i, `
            <div id="error-overlay"><h3>Runtime Error</h3><pre id="error-message"></pre></div>
            <script>
                ${inlinedScripts}
                (function() {
                    try {
                        window.__HAM_REQUIRE__("${entryModuleName}");
                    } catch (err) {
                        // console.error("Runtime Error:", err);
                        document.body.innerHTML = '<div style="padding: 20px; color: #ef4444; font-family: sans-serif;"><h3>Runtime Error</h3><pre>' + err.message + '</pre></div>';
                    }
                })();
            </script>
            </body>
        `);

    return finalHtml;
};
