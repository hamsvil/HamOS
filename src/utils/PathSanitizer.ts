/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
export class PathSanitizer {
  public static sanitize(inputPath: string): string {
    if (!inputPath) return '/';
    let cleanPath = inputPath.trim().replace(/^["']|["']$/g, '');
    
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
        return '/' + fileName; // Force root files to stay in root
    }

    return '/' + safeParts.join('/');
  }
}
