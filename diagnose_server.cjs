const http = require('http');

console.log('--- DIAGNOSTICS (JS) ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CWD:', process.cwd());
console.log('PORT ENV:', process.env.PORT);

const checkPort = (host, port) => {
  console.log(`Checking ${host}:${port}...`);
  const options = {
    hostname: host,
    port: port,
    path: '/api/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`[${host}:${port}] Status Code:`, res.statusCode);
    console.log(`[${host}:${port}] Headers:`, res.headers);
    let data = '';
    res.on('data', (d) => { data += d; });
    res.on('end', () => { console.log(`[${host}:${port}] Body:`, data); });
  });

  req.on('error', (e) => {
    console.error(`[${host}:${port}] Error:`, e.message);
  });

  req.end();
};

const ports = [3000, 8080];
const hosts = ['127.0.0.1', 'localhost', '0.0.0.0'];

for (const p of ports) {
  for (const h of hosts) {
    checkPort(h, p);
  }
}
