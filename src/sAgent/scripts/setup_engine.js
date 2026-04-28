import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('\x1b[36m%s\x1b[0m', '[HAMLI ENGINE] Initializing Quantum Python Environment...');

const requirementsPath = path.join(process.cwd(), 'quantum_layer', 'requirements.txt');

// 1. Detect Python Command
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

exec(`${pythonCmd} --version`, (error, stdout, stderr) => {
    if (error) {
        console.error('\x1b[31m%s\x1b[0m', '[ERROR] Python is not installed. Quantum Mining features will be disabled.');
        console.error('Please install Python 3.10+ and add it to PATH.');
        return;
    }
    console.log(`[HAMLI ENGINE] Detected: ${stdout.trim()}`);

    // 2. Install Dependencies
    console.log('[HAMLI ENGINE] Installing/Verifying Python Dependencies...');
    const installCmd = `${pythonCmd} -m pip install -r "${requirementsPath}"`;

    const installProcess = exec(installCmd);

    installProcess.stdout.on('data', (data) => {
        // Filter noisy pip logs
        if(data.includes('Requirement already satisfied')) return;
        console.log(`[PIP] ${data.trim()}`);
    });

    installProcess.stderr.on('data', (data) => {
        console.error(`[PIP ERROR] ${data.trim()}`);
    });

    installProcess.on('close', (code) => {
        if (code === 0) {
            console.log('\x1b[32m%s\x1b[0m', '[SUCCESS] Quantum Engine Dependencies Installed.');
        } else {
            console.error('\x1b[31m%s\x1b[0m', `[FAILURE] Dependency installation failed with code ${code}.`);
        }
    });
});
