/* eslint-disable no-useless-assignment */
import { ProjectData } from '../components/HamAiStudio/types';
import { safeStorage } from '../utils/storage';

const GITHUB_API_URL = 'https://api.github.com';
const REPO_NAME = 'ham-ai-memory'; // Nama repository untuk menyimpan memori
const MEMORY_FILE_PATH = 'global_memory.json';

export interface GlobalMemory {
  projects: {
    id: string;
    name: string;
    lastUpdated: number;
    summary: string;
  }[];
  lastSync: number;
}

class GitHubMemoryService {
  private token: string | null = null;
  private repoOwner: string | null = null;

  constructor() {
    this.token = safeStorage.getItem('github_pat');
    this.repoOwner = safeStorage.getItem('github_username');
  }

  async setToken(token: string) {
    this.token = token;
    safeStorage.setItem('github_pat', token);
    
    // Auto-fetch username
    try {
        const response = await fetch(`${GITHUB_API_URL}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            }
        });
        if (response.ok) {
            const user = await response.json();
            this.repoOwner = user.login;
            safeStorage.setItem('github_username', user.login);
        }
    } catch (e) {
        // Failed to fetch GitHub user
    }
  }

  private async getHeaders() {
    if (!this.token) {
      throw new Error("GitHub Token not set. Please configure it in Settings.");
    }
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  private async checkRepoExists(): Promise<boolean> {
    if (!this.repoOwner) return false;
    try {
      const response = await fetch(`${GITHUB_API_URL}/repos/${this.repoOwner}/${REPO_NAME}`, {
        headers: await this.getHeaders(),
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  private async createRepo(): Promise<void> {
    if (!this.repoOwner) return;
    try {
      const response = await fetch(`${GITHUB_API_URL}/user/repos`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({
          name: REPO_NAME,
          description: 'Global Memory for Ham AI Studio',
          private: true,
          auto_init: true,
        }),
      });
      if (!response.ok) {
        // Failed to create repository
      }
    } catch (e) {
      // Error creating repository
    }
  }

  private async verifyUser(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const response = await fetch(`${GITHUB_API_URL}/user`, {
        headers: await this.getHeaders(),
      });
      if (!response.ok) return false;
      const user = await response.json();
      
      // If repoOwner is not set, set it now
      if (!this.repoOwner) {
          this.repoOwner = user.login;
          safeStorage.setItem('github_username', user.login);
      }
      
      // Strict check: Token owner must match repo owner
      return user.login.toLowerCase() === this.repoOwner?.toLowerCase();
    } catch (e) {
      // User verification failed
      return false;
    }
  }

  async loadMemory(): Promise<GlobalMemory | null> {
    if (!this.token) return null;
    
    // Security Check: Verify ownership before loading
    const isOwner = await this.verifyUser();
    if (!isOwner || !this.repoOwner) {
      // Security Alert: IDOR attempt detected or Token mismatch. Access denied.
      throw new Error("Access Denied: You do not own this repository.");
    }

    try {
      const repoExists = await this.checkRepoExists();
      if (!repoExists) {
        await this.createRepo();
        return { projects: [], lastSync: Date.now() };
      }

      const response = await fetch(`${GITHUB_API_URL}/repos/${this.repoOwner}/${REPO_NAME}/contents/${MEMORY_FILE_PATH}`, {
        headers: await this.getHeaders(),
      });

      if (response.status === 404) {
        return { projects: [], lastSync: Date.now() };
      }

      if (!response.ok) {
        if (response.status === 401) {
            this.token = null;
            safeStorage.removeItem('github_pat');
            throw new Error("GitHub Token is invalid or expired. Please re-authenticate.");
        }
        throw new Error(`Failed to fetch memory: ${response.statusText}`);
      }

      const data = await response.json();
      // Use TextDecoder for UTF-8 support
      const binaryString = atob(data.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const content = new TextDecoder().decode(bytes);
      return JSON.parse(content) as GlobalMemory;
    } catch (error) {
      // Error loading global memory from GitHub
      return null;
    }
  }

  async saveMemory(project: ProjectData, summary: string): Promise<void> {
    if (!this.token) return;
    
    // Ensure we have repo owner
    if (!this.repoOwner) {
        const isOwner = await this.verifyUser();
        if (!isOwner || !this.repoOwner) return;
    }
    
    try {
      // Optimistic Locking: Fetch current SHA first
      let sha = undefined;
      let currentMemory: GlobalMemory = { projects: [], lastSync: Date.now() };

      try {
        const fileResponse = await fetch(`${GITHUB_API_URL}/repos/${this.repoOwner}/${REPO_NAME}/contents/${MEMORY_FILE_PATH}`, {
          headers: await this.getHeaders(),
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          sha = fileData.sha;
          
          const binaryString = atob(fileData.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const content = new TextDecoder().decode(bytes);
          currentMemory = JSON.parse(content);
        } else if (fileResponse.status === 404) {
           // File doesn't exist, create new
           await this.createRepo();
        }
      } catch (e) {
        // Could not fetch existing memory, assuming new.
      }

      const existingProjectIndex = currentMemory.projects.findIndex(p => p.id === project.id);
      
      const projectEntry = {
        id: project.id,
        name: project.name,
        lastUpdated: Date.now(),
        summary: summary
      };

      if (existingProjectIndex >= 0) {
        currentMemory.projects[existingProjectIndex] = projectEntry;
      } else {
        currentMemory.projects.push(projectEntry);
      }

      currentMemory.lastSync = Date.now();

      // Use TextEncoder for UTF-8 support
      const jsonString = JSON.stringify(currentMemory, null, 2);
      const bytes = new TextEncoder().encode(jsonString);
      let binaryString = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const contentBase64 = btoa(binaryString);

      const updateResponse = await fetch(`${GITHUB_API_URL}/repos/${this.repoOwner}/${REPO_NAME}/contents/${MEMORY_FILE_PATH}`, {
        method: 'PUT',
        headers: await this.getHeaders(),
        body: JSON.stringify({
          message: `Update memory for project: ${project.name}`,
          content: contentBase64,
          sha: sha // Include SHA to prevent overwriting if changed elsewhere
        }),
      });

      if (updateResponse.status === 409) {
         // Conflict detected! Memory has been updated by another session. Retrying...
         throw new Error("Sync Conflict: Please refresh to get latest memory.");
      }

      if (!updateResponse.ok) {
        // Failed to save memory to GitHub
      } else {
        // Successfully saved global memory to GitHub
      }

    } catch (error) {
      // Error saving global memory to GitHub
    }
  }
}

export const githubMemoryService = new GitHubMemoryService();
