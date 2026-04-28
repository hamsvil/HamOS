import { io } from 'socket.io-client';
import axios from 'axios';
import fs from 'fs';

async function test() {
  console.log('--- Smoke Test Starting ---');
  
  // 1. WebSocket Terminal
  const socket = io('http://localhost:3000', { path: '/terminal-socket/' });
  socket.on('connect', () => {
    console.log('[PASS] WebSocket Connected');
    socket.emit('start_terminal', { cols: 80, rows: 24 });
  });
  
  socket.on('terminal_output', (data) => {
    if (data.includes('Welcome') || data.includes('$')) {
      console.log('[PASS] Terminal Output Received');
    }
  });

  // 2. File Explorer API
  try {
    const list = await axios.get('http://localhost:3000/api/file-explorer/list');
    if (Array.isArray(list.data)) {
      console.log('[PASS] File Explorer List');
    }

    // 3. Upload/Download
    const dummyPath = 'smoke_test_dummy.txt';
    const content = 'Hello S+ Terminal';
    await axios.post('http://localhost:3000/api/file-explorer/write', { path: dummyPath, content });
    console.log('[PASS] File Write');

    const read = await axios.get(`http://localhost:3000/api/file-explorer/read?path=${dummyPath}`);
    if (read.data === content) {
      console.log('[PASS] File Read & Integrity');
    }

    await axios.delete(`http://localhost:3000/api/file-explorer/delete?path=${dummyPath}`);
    console.log('[PASS] File Delete');
  } catch (err: any) {
    console.error('[FAIL] API Test:', err.message);
  }

  setTimeout(() => {
    console.log('--- Smoke Test Finished ---');
    process.exit(0);
  }, 5000);
}

test();
