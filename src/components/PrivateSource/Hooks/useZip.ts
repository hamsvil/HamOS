 
import { useCallback, useRef } from 'react';
import { useTaskStore } from '../../../store/taskStore';

export const useZip = () => {
  const { addTask, updateTask } = useTaskStore();
  const workerRef = useRef<Worker | null>(null);

  const zip = useCallback(async (name: string, data: any) => {
    const taskId = await addTask({ name: `Zipping ${name}`, type: 'zip' });
    
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../../workers/zip.worker.ts', import.meta.url));
    }

    workerRef.current.onmessage = (e) => {
      const { type, result } = e.data;
      if (type === 'RESULT') {
        updateTask(taskId, { progress: 100, status: 'completed' });
        // Handle result (e.g., download)
        // console.log('Zipped data:', result);
      }
    };

    workerRef.current.postMessage({ type: 'ZIP', data });
    updateTask(taskId, { progress: 50, status: 'running' });
  }, [addTask, updateTask]);

  const unzip = useCallback(async (name: string, data: any) => {
    const taskId = await addTask({ name: `Unzipping ${name}`, type: 'unzip' });
    
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../../workers/zip.worker.ts', import.meta.url));
    }

    workerRef.current.onmessage = (e) => {
      const { type, result } = e.data;
      if (type === 'RESULT') {
        updateTask(taskId, { progress: 100, status: 'completed' });
        // Handle result
        // console.log('Unzipped data:', result);
      }
    };

    workerRef.current.postMessage({ type: 'UNZIP', data });
    updateTask(taskId, { progress: 50, status: 'running' });
  }, [addTask, updateTask]);

  return { zip, unzip };
};
