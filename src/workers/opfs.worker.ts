/* eslint-disable no-useless-assignment */
/* eslint-disable no-case-declarations */
// [STABILITY] Promise chains verified

/**
 * OPFS SYNC WORKER - The Singularity High-Performance Filesystem Engine
 * Uses createSyncAccessHandle for byte-level synchronous I/O.
 */

let opfsRoot: FileSystemDirectoryHandle | null = null;
let opfsInitPromise: Promise<FileSystemDirectoryHandle> | null = null;

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  if (opfsRoot) return opfsRoot;
  if (!opfsInitPromise) {
    opfsInitPromise = navigator.storage.getDirectory().then(root => {
      opfsRoot = root;
      return root;
    });
  }
  return opfsInitPromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, sab, id } = e.data;

  await getOpfsRoot();

  if (type === 'INIT_SAB') {
    // SharedArrayBuffer bridge initialization
    handleSharedBuffer(sab);
    return;
  }

  // Standard async fallback for non-SAB requests
  try {
    switch (type) {
      case 'WRITE':
        await writeFile(payload.path, payload.content);
        self.postMessage({ id, type: 'SUCCESS' });
        break;
      case 'READ':
        const content = await readFile(payload.path);
        self.postMessage({ id, type: 'SUCCESS', payload: content });
        break;
      case 'DELETE':
        await deleteFile(payload.path);
        self.postMessage({ id, type: 'SUCCESS' });
        break;
    }
  } catch (err: any) {
    self.postMessage({ id, type: 'ERROR', payload: err.message });
  }
};

async function getFileHandle(path: string, create = false) {
  const parts = path.split('/').filter(Boolean);
  let currentDir = await getOpfsRoot();
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i], { create });
  }
  return await currentDir.getFileHandle(parts[parts.length - 1], { create });
}

async function writeFile(path: string, content: string | Uint8Array) {
  const handle = await getFileHandle(path, true);
  // @ts-ignore - createSyncAccessHandle is available in workers
  const accessHandle = await handle.createSyncAccessHandle();
  
  const encoder = new TextEncoder();
  const data = typeof content === 'string' ? encoder.encode(content) : content;
  
  accessHandle.truncate(0);
  accessHandle.write(data, { at: 0 });
  accessHandle.flush();
  accessHandle.close();
}

async function readFile(path: string): Promise<Uint8Array | null> {
  try {
    const handle = await getFileHandle(path);
    // @ts-ignore
    const accessHandle = await handle.createSyncAccessHandle();
    
    const size = accessHandle.getSize();
    const buffer = new Uint8Array(size);
    accessHandle.read(buffer, { at: 0 });
    accessHandle.close();
    return buffer;
  } catch (e) {
    return null;
  }
}

async function deleteFile(path: string) {
  const parts = path.split('/').filter(Boolean);
  let currentDir = await getOpfsRoot();
  for (let i = 0; i < parts.length - 1; i++) {
    currentDir = await currentDir.getDirectoryHandle(parts[i]);
  }
  await currentDir.removeEntry(parts[parts.length - 1]);
}

/**
 * Synchronous Bridge via SharedArrayBuffer
 */
function handleSharedBuffer(sab: SharedArrayBuffer) {
  const int32 = new Int32Array(sab);
  const uint8 = new Uint8Array(sab, 4); // Data starts at offset 4
  
  // Worker loop for synchronous requests
  // In a real implementation, we might use a separate thread or a more complex protocol
  // But for this "Singularity" architecture, we'll use a busy-wait or Atomics.wait if supported
  
  const poll = async () => {
    while (true) {
      try {
        if (Atomics.load(int32, 0) === 1) {
          // Request received
          const rawData = uint8.slice(0, findNull(uint8));
          const decoded = new TextDecoder().decode(rawData);
          
          let requestData;
          try {
            requestData = JSON.parse(decoded);
          } catch (e) {
            console.error('[OpfsWorker] Failed to parse request JSON:', decoded);
            Atomics.store(int32, 0, 4); // Error
            Atomics.notify(int32, 0);
            continue;
          }

          const { type, path, content } = requestData;
          
          try {
            if (type === 'READ') {
              const data = await readFile(path);
              if (data) {
                uint8.set(data);
                Atomics.store(int32, 0, 2); // Success
              } else {
                Atomics.store(int32, 0, 3); // Not found
              }
            } else if (type === 'WRITE') {
              await writeFile(path, content);
              Atomics.store(int32, 0, 2); // Success
            } else if (type === 'DELETE') {
              await deleteFile(path);
              Atomics.store(int32, 0, 2); // Success
            }
          } catch (e) {
            Atomics.store(int32, 0, 4); // Error
          }
          
          Atomics.notify(int32, 0);
        }
      } catch (globalError) {
        console.error('[OpfsWorker] Global poll error:', globalError);
        Atomics.store(int32, 0, 4); // Error
        Atomics.notify(int32, 0);
      }
      
      await new Promise(r => setTimeout(r, 10)); // Yield to event loop
    }
  };
  
  poll();
}

function findNull(arr: Uint8Array) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 0) return i;
  }
  return arr.length;
}
