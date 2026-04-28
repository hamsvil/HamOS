/* eslint-disable no-useless-assignment */
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';

export async function gitClone(fs: any, url: string, dir: string, onSave: () => void) {
  await git.clone({
    fs: fs as unknown as import('isomorphic-git').FsClient,
    http,
    dir,
    url,
    corsProxy: 'https://cors.isomorphic-git.org',
    singleBranch: true,
    depth: 1,
  });
  onSave();
}

export async function gitStatus(fs: any, dir: string) {
  return await git.statusMatrix({
    fs: fs as unknown as import('isomorphic-git').FsClient,
    dir,
  });
}

export async function gitCommit(fs: any, dir: string, message: string, author: { name: string, email: string }, listDirRecursive: (d: string) => Promise<string[]>, onSave: () => void) {
  const files = await listDirRecursive(dir);
  for (const file of files) {
    if (!file.includes('.git')) {
      await git.add({ fs: fs as unknown as import('isomorphic-git').FsClient, dir, filepath: file.replace(`${dir}/`, '') });
    }
  }

  const sha = await git.commit({
    fs: fs as unknown as import('isomorphic-git').FsClient,
    dir,
    message,
    author,
  });
  onSave();
  return sha;
}

export async function gitReadObject(fs: any, dir: string, filepath: string) {
  try {
    const oid = await git.resolveRef({ fs: fs as unknown as import('isomorphic-git').FsClient, dir, ref: 'HEAD' });
    const { object } = await git.readObject({
      fs: fs as unknown as import('isomorphic-git').FsClient,
      dir,
      oid,
      filepath,
      encoding: 'utf8',
    });
    return object as string;
  } catch (e) {
    return '';
  }
}

export async function gitPush(fs: any, dir: string, url: string, token: string) {
  return await git.push({
    fs: fs as unknown as import('isomorphic-git').FsClient,
    http,
    dir,
    url,
    onAuth: () => ({ username: token }),
  });
}

export async function gitPull(fs: any, dir: string, url: string, token: string) {
  return await git.pull({
    fs: fs as unknown as import('isomorphic-git').FsClient,
    http,
    dir,
    url,
    onAuth: () => ({ username: token }),
    singleBranch: true,
    author: { name: 'Ham User', email: 'user@ham.ai' }
  });
}

export async function listDirRecursive(fs: any, dir: string, listDir: (d: string) => Promise<string[]>): Promise<string[]> {
  const results: string[] = [];
  const list = await listDir(dir);
  for (const file of list) {
    const path = dir === '/' ? `/${file}` : `${dir}/${file}`;
    const stat = fs.statSync(path);
    if (stat && stat.isDirectory()) {
      results.push(...(await listDirRecursive(fs, path, listDir)));
    } else {
      results.push(path);
    }
  }
  return results;
}
