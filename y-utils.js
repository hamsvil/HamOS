import * as Y from 'yjs';
import * as sync from 'y-protocols/dist/sync.cjs';
import * as awareness from 'y-protocols/dist/awareness.cjs';
import * as encoding from 'lib0/dist/encoding.cjs';
import * as decoding from 'lib0/dist/decoding.cjs';
import * as map from 'lib0/dist/map.cjs';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

const docs = new Map();

const messageSync = 0;
const messageAwareness = 1;

const updateHandler = (update, origin, doc) => {
  const encoder = encoding.createEncoder();
  encoding.writeUint8(encoder, messageSync);
  sync.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super();
    this.name = name;
    this.conns = new Map();
    this.awareness = new awareness.Awareness(this);
    this.awareness.setLocalState(null);
    
    const awarenessChangeHandler = ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeUint8(encoder, messageAwareness);
      encoding.writeVarUint(encoder, awareness.encodeAwarenessUpdate(this.awareness, changedClients));
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, conn) => send(this, conn, buff));
    };
    
    this.awareness.on('update', awarenessChangeHandler);
    this.on('update', updateHandler);
  }
}

const send = (doc, conn, m) => {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, (err) => {
      if (err != null) {
        closeConn(doc, conn);
      }
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const closeConn = (doc, conn) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awareness.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
    if (doc.conns.size === 0) {
      docs.delete(doc.name);
      doc.destroy();
    }
  }
  conn.close();
};

export const setupWSConnection = (conn, req, { docName = req.url.slice(1).split('?')[0], gc = true } = {}) => {
  conn.binaryType = 'arraybuffer';
  const doc = map.setIfUndefined(docs, docName, () => {
    const doc = new WSSharedDoc(docName);
    doc.gc = gc;
    docs.set(docName, doc);
    return doc;
  });
  doc.conns.set(conn, new Set());
  
  conn.on('message', (message) => {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(new Uint8Array(message));
    const messageType = decoding.readUint8(decoder);
    switch (messageType) {
      case messageSync:
        encoding.writeUint8(encoder, messageSync);
        sync.readSyncMessage(decoder, encoder, doc, null);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness:
        awareness.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn);
        break;
    }
  });

  conn.on('close', () => {
    closeConn(doc, conn);
  });

  // send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeUint8(encoder, messageSync);
  sync.writeSyncStep1(encoder, doc);
  send(doc, conn, encoding.toUint8Array(encoder));
  
  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeUint8(encoder, messageAwareness);
    encoding.writeVarUint(encoder, awareness.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())));
    send(doc, conn, encoding.toUint8Array(encoder));
  }
};
