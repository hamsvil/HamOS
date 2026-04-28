import fs from 'fs';
import path from 'path';

function replaceAliases(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceAliases(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const srcDir = path.resolve('src/Keygen/artifacts/ham-key-gen/src');
      const relativeToSrc = path.relative(path.dirname(fullPath), srcDir);
      const prefix = relativeToSrc === '' ? '.' : relativeToSrc.startsWith('.') ? relativeToSrc : './' + relativeToSrc;
      
      content = content.replace(/@\//g, prefix + '/');
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceAliases('src/Keygen/artifacts/ham-key-gen/src');
console.log('Aliases replaced!');
