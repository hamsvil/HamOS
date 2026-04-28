/* eslint-disable no-useless-assignment */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const docs = new Map<string, Y.Doc>();
const providers = new Map<string, WebsocketProvider>();

self.onmessage = (e) => {
    const { type, path, projectId, roomSuffix, update, host, protocol } = e.data;

    if (type === 'init') {
        if (!docs.has(path)) {
            const doc = new Y.Doc();
            
            const provider = new WebsocketProvider(
                `${protocol}//${host}/collab`,
                `${projectId}-${path}-${roomSuffix}`,
                doc,
                {
                    maxBackoffTime: 2500,
                    resyncInterval: 5000
                }
            );

            provider.awareness.setLocalStateField('user', {
                name: 'User ' + Math.floor(Math.random() * 1000),
                color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
            });

            doc.on('update', (updateMessage: Uint8Array, origin: any) => {
                if (origin !== 'main-thread') {
                    self.postMessage({ type: 'update', path, update: updateMessage });
                }
            });

            docs.set(path, doc);
            providers.set(path, provider);
        }
    } else if (type === 'update') {
        const doc = docs.get(path);
        if (doc && update) {
            Y.applyUpdate(doc, update, 'main-thread');
        }
    } else if (type === 'cleanup') {
        const provider = providers.get(path);
        if (provider) provider.destroy();
        providers.delete(path);

        const doc = docs.get(path);
        if (doc) doc.destroy();
        docs.delete(path);
    } else if (type === 'cleanupAll') {
        providers.forEach(p => p.destroy());
        docs.forEach(d => d.destroy());
        providers.clear();
        docs.clear();
    }
};
