import * as acorn from 'acorn';

self.onmessage = async (e: MessageEvent) => {
  const { content, path, id } = e.data;
  
  try {
    // Point 9: Dedicated Linter Tools
    // Replaced oxc-parser with acorn to avoid WebAssembly instantiation errors in WebContainers
    acorn.parse(content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });

    self.postMessage({ id, errors: null });
  } catch (err: any) {
    self.postMessage({ id, errors: [{ 
      message: err.message || 'Unknown syntax error', 
      line: err.loc?.line,
      column: err.loc?.column,
      severity: 'error',
      source: 'acorn'
    }] });
  }
};
