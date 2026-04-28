 
 
import { ProjectData, AgentActivity } from '../types';
import { CDN_URLS } from '../../../constants/dependencies';

export const runBlobPreview = async (
  targetProject: ProjectData,
  setAgentActivities: React.Dispatch<React.SetStateAction<AgentActivity[]>>,
  setError: React.Dispatch<React.SetStateAction<{ title: string; message: string } | null>>,
  setWebProjectUrl: (url: string | null) => void
) => {
  setWebProjectUrl(null); // Reset URL at the start of preview generation
  setAgentActivities([{ id: 'preview-build', type: 'action', details: 'Building local preview...', timestamp: Date.now(), title: 'Preview' }]);
  
  if (!targetProject || !targetProject.files || targetProject.files.length === 0) {
    const emptyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb; color: #374151; }
          .container { text-align: center; }
          h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
          p { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Project is Empty</h1>
          <p>Start by asking the AI to generate some code, or create files manually.</p>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([emptyHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setWebProjectUrl(url);
    setAgentActivities(prev => [...prev, { id: 'preview-empty', type: 'warning', details: 'Project is empty', timestamp: Date.now(), title: 'Preview' }]);
    return;
  }

  // PROTOKOL: Autonomous Preview-Ready Bundling (Single-File Inlining)
  const indexFile = targetProject.files.find(f => f.path === 'index.html' || f.path === 'public/index.html');
  let htmlBase = indexFile ? indexFile.content : '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>';

  // 1. Asset Audit & Path Mapping
  const assetMap: Record<string, string> = {};
  for (const file of targetProject.files) {
    if (!file.path.match(/\.(js|jsx|ts|tsx|css|html|json)$/i)) {
      const mimeType = file.path.endsWith('.png') ? 'image/png' : 
                       file.path.endsWith('.jpg') || file.path.endsWith('.jpeg') ? 'image/jpeg' : 
                       file.path.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
      
      if (file.content.startsWith('data:')) {
         assetMap[file.path] = file.content;
      } else {
         // Convert raw content to base64 data URI
         try {
             const base64 = btoa(unescape(encodeURIComponent(file.content)));
             assetMap[file.path] = `data:${mimeType};base64,${base64}`;
         } catch (e) {
             console.warn('Failed to convert asset to base64', file.path);
             // Fallback to blob if base64 fails, though it might break in sandboxed iframe
             const blob = new Blob([file.content], { type: mimeType });
             assetMap[file.path] = URL.createObjectURL(blob);
         }
      }
    }
  }

  // 2. Extract & Inline CSS
  const cssFiles = targetProject.files.filter(f => f.path.endsWith('.css'));
  let combinedCss = cssFiles.map(f => {
    let content = f.content
      .replace(/@import\s+['"]tailwindcss['"];?/g, '')
      .replace(/@tailwind\s+(base|components|utilities);?/g, '');
    Object.keys(assetMap).forEach(path => {
      content = content.replace(new RegExp(`url\\(['"]?${path.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}['"]?\\)`, 'g'), `url(${assetMap[path]})`);
    });
    return `/* ${f.path} */\n${content}`;
  }).join('\n');

  // 3. Prepare JS Modules for Inlining
  const jsFiles = targetProject.files.filter(f => f.path.match(/\.(js|jsx|ts|tsx)$/));
  const moduleSystem = `
    (function() {
      const modules = {};
      const cache = {};
      function resolvePath(base, relative) {
          const baseParts = base.split('/');
          baseParts.pop();
          const relParts = relative.split('/');
          for (const part of relParts) {
              if (part === '.') continue;
              if (part === '..') baseParts.pop();
              else baseParts.push(part);
          }
          return baseParts.join('/');
      }
      function createRequire(currentPath) {
          return function require(name) {
            if (name.endsWith('.css')) return {}; // Ignore CSS imports in JS
            let resolvedName = name;
            if (name.startsWith('.')) {
                resolvedName = resolvePath(currentPath, name);
            }
            const norm = resolvedName.replace(/^\\.\\//, '').replace(/\\.(js|jsx|ts|tsx)$/, '');
            
            // Circular Dependency Handling (SQR-SVFS V5.0)
            if (cache[norm]) return cache[norm].exports;
            
            const mod = modules[norm] || modules[name];
            if (!mod) {
                if (window[name]) return window[name];
                // Fallback for common libs that might be on window but with different case
                const commonLibs = ['React', 'ReactDOM', 'Babel'];
                for (const lib of commonLibs) {
                    if (name.toLowerCase() === lib.toLowerCase() && window[lib]) return window[lib];
                }
                throw new Error('Module not found: ' + name + ' (resolved as ' + norm + ')');
            }
            
            const m = { exports: {} };
            cache[norm] = m; // Set cache BEFORE executing to handle circularity
            
            try {
                mod.fn(createRequire(norm), m.exports, m);
            } catch (e) {
                console.error('Error executing module ' + norm + ':', e);
                throw e;
            }
            return m.exports;
          }
      }
      window.__HAM_MODULES__ = modules;
      window.__HAM_REQUIRE__ = createRequire('');
    })();
  `;

  // 4. Construct Final HTML
  const entryFile = targetProject.files.find(f => f.path.match(/(src\/)?(main|index)\.(tsx|ts|jsx|js)$/));
  const entryModuleName = entryFile ? entryFile.path.replace(/^\//, '').replace(/\.(js|jsx|ts|tsx)$/, '') : '';
  
  // Extract React version from package.json if available
  let reactVersion = '18.2.0';
  const pkgFile = targetProject.files.find(f => f.path === 'package.json');
  if (pkgFile) {
      try {
          const pkg = JSON.parse(pkgFile.content);
          if (pkg.dependencies && pkg.dependencies.react) {
              reactVersion = pkg.dependencies.react.replace(/[\^~]/g, '');
          }
      } catch (e) {}
  }

  let htmlContent = htmlBase
    .replace(/<head[^>]*>/i, (match) => `
      ${match}
      <script src="${CDN_URLS.TAILWIND}"></script>
      <script src="${CDN_URLS.BABEL}"></script>
      <style>${combinedCss}</style>
      <script>
        // Console & Error Bridge
        (function() {
          const originalLog = console.log;
          function safeStringify(obj) {
            const cache = new Set();
            return JSON.stringify(obj, (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) return '[Circular]';
                cache.add(value);
              }
              return value;
            });
          }
          console.log = function() {
            const msg = Array.from(arguments).map(arg => typeof arg === 'object' ? safeStringify(arg) : String(arg)).join(' ');
            window.parent.postMessage({ type: 'PREVIEW_CONSOLE', payload: { method: 'log', args: [msg] } }, '*');
            originalLog.apply(console, arguments);
          };
        })();
      </script>
    `)
    .replace(/<\/body>/i, `
      <script>${moduleSystem}</script>
      ${(() => {
         // Inlining all JS files
         return jsFiles.map(f => {
            const moduleName = f.path.replace(/^\//, '').replace(/\.(js|jsx|ts|tsx)$/, '');
            const escapedContent = f.content.replace(/<\/script>/gi, '<\\/script>');
            return `<script type="text/babel" data-presets="env,react,typescript">
              window.__HAM_MODULES__["${moduleName}"] = {
                id: "${moduleName}",
                fn: function(require, exports, module) {
                  ${escapedContent}
                }
              };
            </script>`;
         }).join('\n');
      })()}
      <script type="text/babel" data-presets="env,react,typescript">
        (async function() {
          try {
            // Load External Libs
            const libs = {
              "react": "${CDN_URLS.REACT}",
              "react-dom/client": "${CDN_URLS.REACT_DOM}"
            };
            
            // Add dependencies from package.json
            ${(() => {
                if (pkgFile) {
                    try {
                        const pkg = JSON.parse(pkgFile.content);
                        const deps = Object.keys(pkg.dependencies || {});
                        return deps.map(dep => {
                            if (dep !== 'react' && dep !== 'react-dom') {
                                return `libs["${dep}"] = "https://esm.sh/${dep}";`;
                            }
                            return '';
                        }).join('\n            ');
                    } catch (e) {}
                }
                return '';
            })()}

            for (const [name, url] of Object.entries(libs)) {
              try {
                window[name] = await import(url);
              } catch (err) {
                console.warn("Failed to load external lib:", name, err);
              }
            }
            if ("${entryModuleName}") window.__HAM_REQUIRE__("${entryModuleName}");
          } catch (e) {
            console.error("Boot Error:", e);
            console.error(\`Gagal mem-boot preview: \${e.message}\`);
          }
        })();
      </script>
      </body>
    `);

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  setWebProjectUrl(url);
  setAgentActivities([{ id: 'preview-ready', type: 'action', title: 'Preview', details: 'Local preview ready', timestamp: Date.now() }]);
};
