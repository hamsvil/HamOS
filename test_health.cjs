const http = require('http');
http.get('http://127.0.0.1:3000/api/health', r => {
  let d = '';
  r.on('data', c=>d+=c);
  r.on('end', ()=>console.log('HEALTH OK:', d));
}).on('error', e => console.error('HEALTH ERR:', e.message));
