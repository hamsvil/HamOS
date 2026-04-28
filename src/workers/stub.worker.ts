/* eslint-disable no-useless-assignment */
self.onmessage = (e: MessageEvent) => {
  const { type, id } = e.data;
  // console.log(`[Stub Worker] Received ${type}`);
  self.postMessage({ type: `${type}_RESULT`, payload: null, id });
};
export {};
