 
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { useFileSystemCore } from './useFileSystemCore';
import { useFileOperations } from './useFileOperations';
import { useBulkOperations } from './useBulkOperations';
import { useArchiveOperations } from './useArchiveOperations';

export function useFileSystem(token: string, isAuthenticated: boolean) {
  const core = useFileSystemCore(token, isAuthenticated);
  const fileOps = useFileOperations(core.apiCall, core.currentPath, core.loadDirectory, core.invalidateCache);
  const bulkOps = useBulkOperations(core.apiCall, core.currentPath, core.loadDirectory, core.invalidateCache, token);
  const archiveOps = useArchiveOperations(core.apiCall, core.currentPath, core.loadDirectory, core.invalidateCache);

  return {
    ...core,
    ...fileOps,
    ...bulkOps,
    ...archiveOps
  };
}
