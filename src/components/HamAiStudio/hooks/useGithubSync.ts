 
import { useState } from 'react';
import { safeStorage } from '../../../utils/storage';
import { githubService } from '../../../services/githubService';
import { ProjectData } from '../types';

export function useGithubSync() {
  const [githubSyncStatus, setGithubSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [githubRepoUrl, setGithubRepoUrl] = useState<string | null>(null);

  const handleGitHubAutoSync = async (project: ProjectData | null) => {
    const token = safeStorage.getItem('ham_github_token');
    const autoSync = safeStorage.getItem('ham_github_autosync') === 'true';

    if (token && autoSync && project) {
      setGithubSyncStatus('syncing');
      try {
        const user = await githubService.verifyToken(token);
        const repoUrl = await githubService.syncProject(token, project, user);
        setGithubRepoUrl(repoUrl);
        setGithubSyncStatus('success');
        setTimeout(() => setGithubSyncStatus('idle'), 5000);
      } catch (error) {
        console.error("GitHub Auto-Sync Failed", error);
        setGithubSyncStatus('error');
        setTimeout(() => setGithubSyncStatus('idle'), 5000);
      }
    }
  };

  return {
    githubSyncStatus,
    setGithubSyncStatus,
    githubRepoUrl,
    setGithubRepoUrl,
    handleGitHubAutoSync
  };
}
