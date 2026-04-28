 
import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, Clock, Trash2, Plus, Maximize2, Play, Upload } from 'lucide-react';
import JSZip from 'jszip';
import { ProjectData, ChatMessageData } from './types';
import { projectService } from '../../services/projectService';

interface ProjectHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: ProjectData, chatHistory?: ChatMessageData[]) => void;
  onNewProject: () => void;
  onPreviewProject: (project: ProjectData) => void;
  onBuildProject: (project: ProjectData) => void;
}

interface SavedProject {
  id: string;
  timestamp: number;
  name: string;
  data: ProjectData;
  chatHistory?: ChatMessageData[];
}

import { safeStorage } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function ProjectHistoryModal({ isOpen, onClose, onLoadProject, onNewProject, onPreviewProject, onBuildProject }: ProjectHistoryModalProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, projectId: string | null, projectName: string }>({
    isOpen: false,
    projectId: null,
    projectName: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const fetchedProjects = await projectService.getProjects();
      setProjects(fetchedProjects);
    } catch (e) {
      console.error("Failed to load project history from idb", e);
      // Fallback to local storage if idb fails
      try {
        const historyStr = safeStorage.getItem('ham_project_history');
        if (historyStr) {
          setProjects(JSON.parse(historyStr));
        }
      } catch (e: any) {
        console.error("Failed to load project history from local storage", e);
        showToast(`Gagal memuat riwayat proyek: ${e.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (project: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      projectId: project.id,
      projectName: project.data.name
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.projectId) return;
    
    try {
      await projectService.deleteProject(deleteConfirmation.projectId);
      setProjects(prev => prev.filter(p => p.id !== deleteConfirmation.projectId));
      setDeleteConfirmation({ isOpen: false, projectId: null, projectName: '' });
      showToast("Project deleted successfully.", "success");
    } catch (e) {
      console.error("Failed to delete project from idb", e);
      showToast("Failed to delete project. Please try again.", "error");
    }
  };

  const handleClearAll = async () => {
    if (await confirm("Are you sure you want to clear ALL project history?")) {
      try {
        await projectService.clearAllProjects();
        setProjects([]);
        showToast("All project history cleared.", "success");
      } catch (e) {
        console.error("Failed to clear all projects from idb", e);
        showToast("Failed to clear history. Please try again.", "error");
      }
    }
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const files: { path: string; content: string }[] = [];
      
      for (const [path, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async("string");
          files.push({ path, content });
        }
      }

      const projectName = file.name.replace('.zip', '');
      const newProjectData: ProjectData = {
        id: `imported-${Date.now()}`,
        name: projectName,
        files: files,
        dependencies: {},
        chatHistory: [{ role: 'ai', content: `Project imported from ${file.name}` }]
      };

      const newRecord = {
        id: newProjectData.id,
        timestamp: Date.now(),
        name: projectName,
        data: newProjectData,
        chatHistory: newProjectData.chatHistory || []
      };

      await projectService.saveProject(newRecord);
      await loadHistory();
      
      onLoadProject(newProjectData, newProjectData.chatHistory);
      showToast("Project imported successfully.", "success");
      onClose();
    } catch (error) {
      console.error("Failed to import project", error);
      showToast("Failed to import project. Please ensure it is a valid zip file.", "error");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredProjects = projects.filter(p => 
    p.data.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-[var(--border-color)] relative">
        
        {/* Delete Confirmation Overlay */}
        {deleteConfirmation.isOpen && (
          <div className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-[var(--bg-secondary)] border border-red-500/30 rounded-xl p-6 w-full max-w-sm shadow-2xl transform scale-100 transition-all">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Hapus Project?</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Apakah Anda yakin ingin menghapus project <span className="text-[var(--text-primary)] font-semibold">"{deleteConfirmation.projectName}"</span>? 
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button 
                    onClick={() => setDeleteConfirmation({ isOpen: false, projectId: null, projectName: '' })}
                    className="flex-1 py-2 px-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm font-medium rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-500/20"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-400" />
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Project History</h3>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".zip" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImportZip} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-[11px] font-medium rounded-md transition-colors shadow-lg shadow-green-500/20"
              title="Import Project from ZIP"
            >
              <Upload size={12} />
              Import
            </button>
            <button 
              onClick={() => {
                onNewProject();
                onClose();
              }}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium rounded-md transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus size={12} />
              New Project
            </button>
            <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-blue-400 rounded-full hover:bg-[var(--bg-secondary)] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-2 border-b border-[var(--border-color)] shrink-0 bg-[var(--bg-tertiary)]">
          <input 
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div className="p-2 overflow-y-auto flex-1 bg-[var(--bg-primary)]">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-color)] animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-md"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4"></div>
                    <div className="h-2 bg-[var(--bg-tertiary)] rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center text-[var(--text-secondary)] py-12">
              <Folder size={48} className="mx-auto mb-4 opacity-20 text-blue-400" />
              <p>No project history found.</p>
              <p className="text-sm mt-1 opacity-70">Projects you build will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => {
                    onLoadProject(project.data, project.chatHistory);
                    onClose();
                  }}
                  className="bg-[var(--bg-secondary)] p-2.5 rounded-lg border border-[var(--border-color)] shadow-sm hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-md shrink-0">
                      <Folder size={16} />
                    </div>
                    <div className="truncate">
                      <h4 className="font-medium text-[var(--text-primary)] truncate text-xs">{project.data.name}</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        {new Date(project.timestamp).toLocaleString()} • {project.data.files.length} files
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewProject(project.data);
                      }}
                      className="p-1 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all shrink-0 flex items-center gap-1"
                      title="Preview Full Project"
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuildProject(project.data);
                        onClose();
                      }}
                      className="p-1 text-[var(--text-secondary)] hover:text-green-400 hover:bg-green-500/10 rounded-md transition-all shrink-0 flex items-center gap-1"
                      title="Build/Run Project"
                    >
                      <Play size={12} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteClick(project, e)}
                      className="p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all shrink-0 flex items-center gap-1"
                      title="Delete Project"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {projects.length > 0 && (
          <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex justify-end shrink-0">
            <button 
              onClick={handleClearAll}
              className="text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors"
            >
              Clear All History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
