/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { useProjectStore } from '../../../store/projectStore';

export function sanitizePath(path: string): string {
  // Remove leading/trailing whitespace and quotes
  let cleanPath = path.trim().replace(/^["']|["']$/g, '');
  
  // Normalize slashes and remove null bytes
  cleanPath = cleanPath.replace(/\0/g, '').replace(/\\/g, '/');
  cleanPath = cleanPath.replace(/^\/+/, '');
  
  // Remove leading ./ or / for path checking
  let checkPath = cleanPath;
  if (checkPath.startsWith('./')) {
      checkPath = checkPath.substring(2);
  } else if (checkPath.startsWith('/')) {
      checkPath = checkPath.substring(1);
  }

  // Auto-fix common path mistakes (missing src/)
  if (!checkPath.startsWith('src/') && 
      (checkPath.startsWith('components/') || checkPath.startsWith('pages/') || 
       checkPath.startsWith('hooks/') || checkPath.startsWith('utils/') || 
       checkPath.startsWith('services/') || checkPath.startsWith('store/') ||
       checkPath.startsWith('types/') || checkPath.startsWith('assets/') ||
       checkPath.startsWith('constants/') || checkPath.startsWith('contexts/') ||
       checkPath.startsWith('styles/') || 
       checkPath === 'App.tsx' || checkPath === 'App.jsx' || 
       checkPath === 'main.tsx' || checkPath === 'main.jsx' || 
       checkPath === 'index.css' || checkPath === 'App.css' || 
       checkPath === 'vite-env.d.ts')) {
      cleanPath = 'src/' + checkPath;
  }

  const parts = cleanPath.split('/');
  const safeParts = [];
  for (const part of parts) {
      if (part === '..') {
          safeParts.pop();
      } else if (part !== '.' && part !== '') {
          safeParts.push(part);
      }
  }

  // Anti-Duplicate Root Files Protocol
  const rootFiles = ['package.json', 'vite.config.ts', 'vite.config.js', 'index.html', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'postcss.config.ts', 'tsconfig.json', 'tsconfig.node.json', '.gitignore', '.env', 'eslint.config.js', 'README.md'];
  const fileName = safeParts[safeParts.length - 1];
  if (safeParts.length > 1 && safeParts[0] === 'src' && rootFiles.includes(fileName)) {
      return fileName; // Force root files to stay in root
  }

  return safeParts.join('/');
}

export function flexibleReplace(originalContent: string, target: string, replacement: string): string {
  // 1. Exact Match
  if (originalContent.includes(target)) {
      return originalContent.replace(target, replacement);
  }

  // 2. Trimmed Match (ignores leading/trailing whitespace differences)
  const trimmedTarget = target.trim();
  if (originalContent.includes(trimmedTarget)) {
      return originalContent.replace(trimmedTarget, replacement);
  }

  // 3. Line-by-Line Match (handles indentation and minor whitespace differences)
  const targetLines = target.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const originalLines = originalContent.split('\n');
  
  if (targetLines.length > 0) {
      for (let i = 0; i <= originalLines.length - targetLines.length; i++) {
          let match = true;
          for (let j = 0; j < targetLines.length; j++) {
              if (originalLines[i + j].trim() !== targetLines[j]) {
                  match = false;
                  break;
              }
          }
          if (match) {
              // Found a match! Replace these lines.
              const before = originalLines.slice(0, i).join('\n');
              const after = originalLines.slice(i + targetLines.length).join('\n');
              return `${before}\n${replacement}\n${after}`;
          }
      }
  }

  // 4. Strict Logical Character Match (Ignores all whitespace differences)
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokens = target.trim().split(/\s+/);
  if (tokens.length > 0) {
      const regexPattern = tokens.map(escapeRegExp).join('\\s+');
      const regex = new RegExp(regexPattern);
      const match = originalContent.match(regex);
      if (match) {
          return originalContent.replace(regex, replacement);
      }
  }

  // If all fails, throw an error to trigger self-healing
  throw new Error("Target content not found. Please verify the exact string or use a smaller target block.");
}
