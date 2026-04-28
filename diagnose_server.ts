import http from 'http';

console.log('--- DIAGNOSTICS ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CWD:', process.cwd());

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error('Error connecting to server:', e.message);
});

req.end();
