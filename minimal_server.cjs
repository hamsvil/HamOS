const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Minimal server works!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Minimal server listening at http://0.0.0.0:${port}`);
});
