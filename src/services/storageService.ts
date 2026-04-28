/* eslint-disable no-useless-assignment */
import { set, get, del, keys } from 'idb-keyval';
import { ProjectData, ProjectFile } from '../components/HamAiStudio/types';

const PROJECT_STORE_KEY = 'ham-ai-studio-projects';

// Initialize or migrate project storage
export const initProjectStorage = async (currentProject: ProjectData | null): Promise<void> => {
  if (currentProject) {
    await saveProjectToStorage(currentProject);
  }
};

// Save entire project to IndexedDB
export const saveProjectToStorage = async (project: ProjectData): Promise<void> => {
  try {
    // We store each project by its ID to allow multiple projects
    await set(`${PROJECT_STORE_KEY}-${project.id}`, project);
    // Also update a list of project IDs if needed, but for now we just use the prefix
  } catch (error) {
    // Failed to save project to storage
  }
};

// Load project from IndexedDB
export const loadProjectFromStorage = async (projectId: string): Promise<ProjectData | undefined> => {
  try {
    return await get<ProjectData>(`${PROJECT_STORE_KEY}-${projectId}`);
  } catch (error) {
    return undefined;
  }
};

// Auto-save hook implementation would go here in a real app
// For now, we call saveProjectToStorage manually on changes
