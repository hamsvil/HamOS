import express from 'express';
const app = express();
const port = 3000;

console.log('[MinimalTS] Booting...');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.send('Minimal TS server works!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[MinimalTS] Listening at http://0.0.0.0:${port}`);
});
