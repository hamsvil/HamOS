import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const srcDir = path.join(process.cwd(), 'src');
const cmisPath = path.join(process.cwd(), 'cmis.md');

let findings = [];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(process.cwd(), filePath);
  
  let fileFindings = [];

  // Check for large files
  if (lines.length > 500) {
    fileFindings.push(`- [ARCHITECTURE] File is too large (${lines.length} lines). Split into smaller modules.\n  - **Action**: Refactor ${relativePath} into smaller components/services.`);
  }

  let hasSetInterval = false;
  let hasClearInterval = false;
  let hasAddEventListener = false;
  let hasRemoveEventListener = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for 'any'
    if (/\bany\b/.test(line) && !line.includes('//') && !line.includes('eslint-disable')) {
      fileFindings.push(`- [TYPE SAFETY] Line ${lineNumber}: Usage of 'any' detected. Replace with 'unknown' or specific type.\n  - **Action**: Edit ${relativePath} at line ${lineNumber} to remove 'any'.`);
    }

    // Check for TODOs
    if (/\bTODO\b/.test(line) || /\bFIXME\b/.test(line)) {
      fileFindings.push(`- [TECH DEBT] Line ${lineNumber}: TODO/FIXME found.\n  - **Action**: Resolve the TODO in ${relativePath} at line ${lineNumber}.`);
    }

    // Check for direct DOM manipulation
    if ((line.includes('document.getElementById') || line.includes('document.querySelector')) && !relativePath.includes('main.tsx') && !relativePath.includes('polyfills')) {
      fileFindings.push(`- [UI LAYER] Line ${lineNumber}: Direct DOM manipulation detected. Use React refs instead.\n  - **Action**: Refactor ${relativePath} at line ${lineNumber} to use useRef.`);
    }

    if (line.includes('setInterval(')) hasSetInterval = true;
    if (line.includes('clearInterval(')) hasClearInterval = true;
    if (line.includes('addEventListener(')) hasAddEventListener = true;
    if (line.includes('removeEventListener(')) hasRemoveEventListener = true;
  });

  if (hasSetInterval && !hasClearInterval) {
    fileFindings.push(`- [MEMORY LEAK] 'setInterval' used without 'clearInterval'.\n  - **Action**: Add cleanup logic for setInterval in ${relativePath}.`);
  }
  if (hasAddEventListener && !hasRemoveEventListener) {
    fileFindings.push(`- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.\n  - **Action**: Add cleanup logic for addEventListener in ${relativePath}.`);
  }

  if (fileFindings.length > 0) {
    findings.push(`### File: \`${relativePath}\``);
    findings.push(...fileFindings);
    findings.push('');
  }
}

console.log('Scanning project files...');
scanDirectory(srcDir);

console.log('Running TypeScript compiler check...');
let tscOutput = '';
try {
  tscOutput = execSync('npx tsc --noEmit', { encoding: 'utf-8', stdio: 'pipe' });
} catch (error) {
  tscOutput = error.stdout || error.message;
}

let cmisContent = `# CMIS (Comprehensive Master Inspection & Strategy)

## 1. TypeScript Compiler Errors
\`\`\`
${tscOutput.substring(0, 5000)} ${tscOutput.length > 5000 ? '... (truncated)' : ''}
\`\`\`

## 2. Codebase Scan Findings
`;

cmisContent += findings.join('\n');

fs.writeFileSync(cmisPath, cmisContent, 'utf-8');
console.log('Evaluation complete. Results written to cmis.md');
