/* eslint-disable no-useless-assignment */
import { structuredDb } from '../../db/structuredDb';
import { vfs as virtualFS } from '../vfs';

export class VFSIndexer {
  public async indexFile(path: string, content: string) {
    const name = path.split('/').pop() || '';
    const type = name.includes('.') ? name.split('.').pop() || 'unknown' : 'file';
    const projectId = virtualFS.getCurrentProjectId();
    
    try {
      await structuredDb.fileMetadata.put({
        path,
        name,
        type,
        size: content.length,
        lastModified: Date.now(),
        projectId
      });
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        try {
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          await structuredDb.fileMetadata.where('lastModified').below(thirtyDaysAgo).delete();
          await structuredDb.fileMetadata.put({
            path, name, type, size: content.length, lastModified: Date.now(), projectId
          });
        } catch (retryError) {}
      }
    }
  }

  public async unindexFile(path: string) {
    try {
      const projectId = virtualFS.getCurrentProjectId();
      const file = await structuredDb.fileMetadata.where({ path, projectId }).first();
      if (file && file.id) {
        await structuredDb.fileMetadata.delete(file.id);
      }
    } catch (e) {}
  }
}
