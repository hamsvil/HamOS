/* eslint-disable no-case-declarations */
/* eslint-disable no-useless-assignment */
/// <reference lib="webworker" />

// import git from 'isomorphic-git';
// import http from 'isomorphic-git/http/web';
// import LightningFS from '@isomorphic-git/lightning-fs';

let git: any = null;
let http: any = null;
let fs: any = null;

async function initGit() {
    if (!git) {
        git = (await import('isomorphic-git')).default;
        http = (await import('isomorphic-git/http/web')).default;
        const LightningFS = (await import('@isomorphic-git/lightning-fs')).default;
        fs = new LightningFS('fs');
    }
}

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    await initGit();
    let result;
    switch (type) {
      case 'clone':
        await git.clone({
          fs,
          http,
          dir: payload.path,
          url: payload.url,
          corsProxy: 'https://cors.isomorphic-git.org',
          singleBranch: true,
          depth: 1,
          onProgress: (event) => self.postMessage({ type: 'progress', id, payload: event })
        });
        result = { success: true };
        break;
      
      case 'commit':
        await git.add({ fs, dir: payload.path, filepath: '.' });
        const sha = await git.commit({
          fs,
          dir: payload.path,
          message: payload.message,
          author: {
            name: payload.authorName,
            email: payload.authorEmail
          }
        });
        result = { success: true, hash: sha };
        break;

      default:
        throw new Error(`Unknown git command: ${type}`);
    }
    self.postMessage({ type: 'success', id, payload: result });
  } catch (error: any) {
    self.postMessage({ type: 'error', id, error: error.message });
  }
});
