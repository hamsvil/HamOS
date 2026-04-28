const { spawn } = require('child_process');
const fs = require('fs');
const out = fs.openSync('./out.log', 'w');
const p = spawn('npm', ['run', 'dev'], { stdio: ['ignore', out, out] });
console.log('Started', p.pid);
setTimeout(() => { p.kill(); process.exit(0); }, 20000); // 20s
