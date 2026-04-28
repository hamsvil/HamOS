 
import { useState, useEffect, useRef } from 'react';
// useBrain Hook
import { openDB } from 'idb';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const DB_NAME = 'quantum-brain-db';
const STORE_BRAINS = 'brains';
const STORE_CHUNKS = 'chunks';
const STORE_METADATA = 'metadata';

export const useBrain = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [brainUrl, setBrainUrl] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [installedBrain, setInstalledBrain] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkInstalledBrain();
  }, []);

  const checkInstalledBrain = async () => {
    try {
      const db = await openDB(DB_NAME, 3, {
        upgrade(db, oldVersion, newVersion, transaction) {
          if (!db.objectStoreNames.contains(STORE_BRAINS)) {
            db.createObjectStore(STORE_BRAINS, { keyPath: 'name' });
          }
          
          let chunkStore;
          if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
            chunkStore = db.createObjectStore(STORE_CHUNKS, { keyPath: 'id', autoIncrement: true });
            chunkStore.createIndex('url', 'url', { unique: false });
          } else {
            chunkStore = transaction.objectStore(STORE_CHUNKS);
            if (!chunkStore.indexNames.contains('url')) {
              chunkStore.createIndex('url', 'url', { unique: false });
            }
          }

          if (!db.objectStoreNames.contains(STORE_METADATA)) {
            db.createObjectStore(STORE_METADATA, { keyPath: 'url' });
          }
        },
      });
      
      const brains = await db.getAll(STORE_BRAINS);
      if (brains.length > 0) {
        setInstalledBrain({ name: brains[0].name, size: brains[0].size });
      } else {
        setInstalledBrain(null);
      }

      const metadata = await db.getAll(STORE_METADATA);
      if (metadata.length > 0) {
        const activeDownload = metadata[0];
        setBrainUrl(activeDownload.url);
        setDownloadedBytes(activeDownload.downloadedBytes);
        setTotalBytes(activeDownload.totalBytes);
        setDownloadProgress((activeDownload.downloadedBytes / activeDownload.totalBytes) * 100);
        setIsPaused(true);
      }

    } catch (err) {
      console.error('Failed to check installed brain:', err);
    }
  };

  const handleBrainUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setError(null);
      
      try {
        const buffer = await file.slice(0, 4).arrayBuffer();
        const view = new DataView(buffer);
        const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
        
        if (magic !== 'GGUF') {
          setError('File tidak valid: Header bukan GGUF. Konversi otomatis tidak didukung di browser ini.');
          return;
        }

        const db = await openDB(DB_NAME, 3);
        await db.put(STORE_BRAINS, { name: file.name, data: file, size: file.size, type: 'local' });
        setInstalledBrain({ name: file.name, size: file.size });
        
        // Also save to NativeStorage so NativeAI can access it
        try {
            const { NativeStorage } = await import('../plugins/NativeStorage');
            const { nativeBridge } = await import('../utils/nativeBridge');
            const path = `/models/${file.name}`;
            await NativeStorage.mkdir({ path: '/models' });
            
            if (nativeBridge.isAvailable()) {
                const CHUNK_SIZE = 1024 * 1024;
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    const buffer = await chunk.arrayBuffer();
                    let binary = '';
                    const bytes = new Uint8Array(buffer);
                    for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j]);
                    await nativeBridge.call('writeChunk', {
                        path, chunk: btoa(binary), index: i, total: totalChunks, encoding: 'base64'
                    });
                    await new Promise(r => setTimeout(r, 10));
                }
            } else {
                const buffer = await file.arrayBuffer();
                await NativeStorage.writeFile({ path, data: buffer });
            }
            // Set the path so webLlmService knows where to find it
            const { safeStorage } = await import('../utils/storage');
            safeStorage.setItem('quantum_local_model_path', path);
        } catch (e) {
            console.error("Failed to sync to NativeStorage:", e);
        }

        showToast(`Berhasil menginstall otak: ${file.name}`, 'success');
      } catch (err: any) {
        setError(`Gagal mengupload: ${err.message}`);
      }
    }
  };

  const handleDownload = async () => {
    if (!brainUrl) return;
    setError(null);
    setIsDownloading(true);
    setIsPaused(false);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const db = await openDB(DB_NAME, 3);
      
      const metadata = await db.get(STORE_METADATA, brainUrl);
      let startByte = 0;
      let existingTotal = 0;

      if (metadata) {
        startByte = metadata.downloadedBytes;
        existingTotal = metadata.totalBytes;
        setDownloadedBytes(startByte);
        setTotalBytes(existingTotal);
      }

      const headers: HeadersInit = {};
      if (startByte > 0) {
        headers['Range'] = `bytes=${startByte}-`;
      }

      const response = await fetch(brainUrl, { signal, headers });
      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentLength = response.headers.get('content-length');
      const total = existingTotal || (contentLength ? parseInt(contentLength, 10) + startByte : 0);
      
      if (total > 0 && total !== existingTotal) {
        setTotalBytes(total);
        if (!metadata) {
          await db.put(STORE_METADATA, { url: brainUrl, downloadedBytes: 0, totalBytes: total });
        }
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      let receivedLength = startByte;
      let lastSpeedUpdate = Date.now();
      let bytesSinceLastUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        await db.add(STORE_CHUNKS, { url: brainUrl, data: value });

        receivedLength += value.length;
        bytesSinceLastUpdate += value.length;
        
        if (receivedLength % (1024 * 1024) < value.length) {
             await db.put(STORE_METADATA, { url: brainUrl, downloadedBytes: receivedLength, totalBytes: total });
        }

        setDownloadedBytes(receivedLength);
        if (total > 0) setDownloadProgress((receivedLength / total) * 100);

        const currentTime = Date.now();
        if (currentTime - lastSpeedUpdate > 1000) {
          const speed = bytesSinceLastUpdate / ((currentTime - lastSpeedUpdate) / 1000);
          setDownloadSpeed(speed);
          lastSpeedUpdate = currentTime;
          bytesSinceLastUpdate = 0;
        }
      }

      const allChunks = await db.getAllFromIndex(STORE_CHUNKS, 'url', brainUrl);
      allChunks.sort((a, b) => a.id - b.id);
      
      const blob = new Blob(allChunks.map(c => c.data));
      const fileName = brainUrl.split('/').pop() || 'downloaded_model.gguf';

      await db.put(STORE_BRAINS, { name: fileName, data: blob, size: blob.size, type: 'downloaded' });
      
      // Also save to NativeStorage so NativeAI can access it
      try {
          const { NativeStorage } = await import('../plugins/NativeStorage');
          const { nativeBridge } = await import('../utils/nativeBridge');
          const path = `/models/${fileName}`;
          await NativeStorage.mkdir({ path: '/models' });
          
          if (nativeBridge.isAvailable()) {
              const CHUNK_SIZE = 1024 * 1024;
              const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
              for (let i = 0; i < totalChunks; i++) {
                  const chunk = blob.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                  const buffer = await chunk.arrayBuffer();
                  let binary = '';
                  const bytes = new Uint8Array(buffer);
                  for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j]);
                  await nativeBridge.call('writeChunk', {
                      path, chunk: btoa(binary), index: i, total: totalChunks, encoding: 'base64'
                  });
                  await new Promise(r => setTimeout(r, 10));
              }
          } else {
              const buffer = await blob.arrayBuffer();
              await NativeStorage.writeFile({ path, data: buffer });
          }
          // Set the path so webLlmService knows where to find it
          const { safeStorage } = await import('../utils/storage');
          safeStorage.setItem('quantum_local_model_path', path);
      } catch (e) {
          console.error("Failed to sync downloaded model to NativeStorage:", e);
      }
      
      const tx = db.transaction(STORE_CHUNKS, 'readwrite');
      const index = tx.store.index('url');
      let cursor = await index.openCursor(IDBKeyRange.only(brainUrl));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
      
      await db.delete(STORE_METADATA, brainUrl);

      setInstalledBrain({ name: fileName, size: blob.size });
      setIsDownloading(false);
      setDownloadProgress(0);
      setBrainUrl('');
      showToast('Download selesai dan otak berhasil diinstall!', 'success');

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsPaused(true);
        setIsDownloading(false);
        const db = await openDB(DB_NAME, 3);
        await db.put(STORE_METADATA, { url: brainUrl, downloadedBytes: downloadedBytes, totalBytes: totalBytes });
      } else {
        setError(`Download gagal: ${err.message}`);
        setIsDownloading(false);
      }
    }
  };

  const handlePause = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsPaused(true);
      setIsDownloading(false);
    }
  };

  const handleResume = () => {
    handleDownload();
  };

  const handleDeleteBrain = async () => {
    if (!installedBrain) return;
    if (await confirm('Apakah Anda yakin ingin menghapus otak ini?')) {
      const db = await openDB(DB_NAME, 3);
      await db.delete(STORE_BRAINS, installedBrain.name);
      
      // Also delete from NativeStorage
      try {
          const { NativeStorage } = await import('../plugins/NativeStorage');
          const path = `/models/${installedBrain.name}`;
          await NativeStorage.deleteFile({ path });
          const { safeStorage } = await import('../utils/storage');
          safeStorage.removeItem('quantum_local_model_path');
      } catch (e) {
          console.error("Failed to delete from NativeStorage:", e);
      }
      
      setInstalledBrain(null);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return {
    brainUrl,
    setBrainUrl,
    downloadProgress,
    downloadSpeed,
    downloadedBytes,
    totalBytes,
    isDownloading,
    isPaused,
    installedBrain,
    error,
    handleBrainUpload,
    handleDownload,
    handlePause,
    handleResume,
    handleDeleteBrain,
    formatBytes
  };
};
