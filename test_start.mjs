import { spawn } from 'child_process';
const p = spawn('npm', ['run', 'dev']);
p.stdout.on('data', d => console.log('STDOUT:', d.toString().trim()));
p.stderr.on('data', d => console.log('STDERR:', d.toString().trim()));
p.on('close', code => console.log('EXITED WITH', code));
setTimeout(() => { p.kill(); process.exit(0); }, 15000);
