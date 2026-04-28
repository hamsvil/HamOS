import { spawn } from 'child_process';
import http from 'http';

const server = spawn('npx', ['tsx', 'server.ts']);

server.stdout.on('data', (data) => console.log('OUT:', data.toString().trim()));
server.stderr.on('data', (data) => console.log('ERR:', data.toString().trim()));

setTimeout(() => {
  http.get('http://localhost:3000/api/health', (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      console.log('HEALTH CHECK RESP:', res.statusCode, raw);
      server.kill();
      process.exit(0);
    });
  }).on('error', (e) => {
    console.error('HEALTH CHECK ERROR:', e.message);
    server.kill();
    process.exit(1);
  });
}, 10000); // give it 10 seconds to start
