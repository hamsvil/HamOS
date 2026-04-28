import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (file.includes('node_modules') || file.includes('dist')) return;
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('./src');
let replaced = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('@google/genai')) {
        content = content.replace(/@google\/genai/g, '@google/generative-ai');
        fs.writeFileSync(file, content, 'utf8');
        replaced++;
        console.log(`Updated imports in ${file}`);
    }
});

console.log(`Global AST Migration complete. Updated ${replaced} files.`);
