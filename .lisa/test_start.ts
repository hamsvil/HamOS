import { spawn } from 'child_process';
const p = spawn('npm', ['run', 'dev']);
p.stdout.on('data', d => console.log('STDOUT:', d.toString()));
p.stderr.on('data', d => console.error('STDERR:', d.toString()));
setTimeout(() => { p.kill(); process.exit(0); }, 10000);
