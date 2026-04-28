import { spawn } from 'child_process';
const p = spawn('npm', ['run', 'dev']);
p.stdout.on('data', d => console.log('STDOUT:', d.toString()));
p.stderr.on('data', d => console.error('STDERR:', d.toString()));
p.on('close', code => console.log('Exited with', code));
setTimeout(() => { console.log('Timeout reached'); p.kill(); process.exit(0); }, 30000);
