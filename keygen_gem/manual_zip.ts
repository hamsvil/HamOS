import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

/**
 * [SINGULARITY EXPORT SCRIPT]
 * Manual trigger for zipping agent source code.
 */
async function exportSource() {
  const zip = new AdmZip();
  const sourceDir = path.join(process.cwd(), 'keygen_gem');
  const outputFile = path.join(process.cwd(), 'gemini_swarm_source.zip');

  if (!fs.existsSync(sourceDir)) {
    console.error("Source directory /keygen_gem not found!");
    return;
  }

  console.log("Re-compressing Sovereign Agent Source...");
  zip.addLocalFolder(sourceDir);
  zip.writeZip(outputFile);
  console.log(`Success! File restored at: ${outputFile}`);
}

exportSource();
