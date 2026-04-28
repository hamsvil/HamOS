/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import express from 'express';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { broadcast } from './privateSourceService';

const router = express.Router();
const activeProcesses = new Map<string, ChildProcess>();

router.post('/execute', (req, res) => {
  const { command, taskId } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'No command provided' });
  }

  // AI Studio Enhanced Sanitization & Auto-Enhancement
  let finalCommand = command;
  
  // Block dangerous commands
  const dangerousPatterns = [
    /rm\s+-rf\s+\//,
    /:\(\)\{/,
    /wget\s+http.*\|.*sh/,
    /chmod\s+-R\s+777/,
    /chown\s+-R\s+root/
  ];
  
  if (dangerousPatterns.some(pattern => pattern.test(finalCommand))) {
    return res.status(403).json({ error: 'Command blocked by Singularity Safety Protocol' });
  }

  // Auto-enhance grep
  if (finalCommand.includes('grep ') && !finalCommand.includes('--exclude-dir')) {
    finalCommand = finalCommand.replace('grep ', 'grep -rI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.next ');
  }

  // Auto-enhance npx
  if (finalCommand.includes('npx ') && !finalCommand.includes('-y')) {
    finalCommand = finalCommand.replace('npx ', 'npx -y ');
  }

  // SELF-HEALING: Check if bash is available, fallback to sh
  const shellToUse = fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh';

  const id = taskId || Math.random().toString(36).substring(7);
  console.log(`[Shell API] [${id}] Executing via ${shellToUse}: ${finalCommand}`);
  
  try {
    // Use detected shell for better compatibility and force color
    const proc = spawn(finalCommand, { 
      shell: shellToUse, 
      cwd: process.cwd(),
      env: { 
        ...process.env, 
        FORCE_COLOR: '1',
        TERM: 'xterm-256color'
      }
    });
    activeProcesses.set(id, proc);
    
    let output = '';
    let isError = false;

    // 15 minute timeout for HTTP as well (900,000ms)
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      activeProcesses.delete(id);
      if (!res.headersSent) {
        res.status(504).json({ output: output + '\n\n[Error: Command timed out on server (900s)]', isError: true });
      }
    }, 900000);

    // Handle client disconnect to prevent zombie processes
    req.on('close', () => {
      if (activeProcesses.has(id)) {
        console.log(`[Shell API] [${id}] Client disconnected, killing process.`);
        proc.kill('SIGKILL');
        activeProcesses.delete(id);
        clearTimeout(timeout);
      }
    });

    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // Stream real-time output to UI
      broadcast(req, 'shell_output', { taskId: id, chunk });
      
      if (output.length > 10000000) { // 10MB limit
        output = output.substring(0, 10000000) + '\n\n[Output truncated]';
        proc.kill('SIGKILL');
      }
    });

    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      isError = true;
      
      // Stream real-time error output to UI
      broadcast(req, 'shell_output', { taskId: id, chunk, isError: true });
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      activeProcesses.delete(id);
      
      // Trigger UI refresh via WebSocket
      broadcast(req, 'shell_complete', { command, code });
      
      if (!res.headersSent && !res.writableEnded) {
        res.json({ output, isError: code !== 0 || isError });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      activeProcesses.delete(id);
      if (!res.headersSent && !res.writableEnded) {
        res.status(500).json({ output: `Error: ${err.message}`, isError: true });
      }
    });
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ output: `Failed to spawn: ${err.message}`, isError: true });
    }
  }
});

router.post('/kill', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'No taskId provided' });

  const proc = activeProcesses.get(taskId);
  if (proc) {
    proc.kill('SIGKILL');
    activeProcesses.delete(taskId);
    return res.json({ success: true, message: 'Process killed' });
  }
  res.status(404).json({ error: 'Process not found' });
});

export default router;
