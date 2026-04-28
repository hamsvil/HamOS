/* STUB WORKER for Build Stability */
self.onmessage = (e: MessageEvent) => {
  const { type, id } = e.data;
  self.postMessage({ type: `${type}_RESULT`, payload: null, id });
};
export {};
