 
import React from 'react';
import { ProjectData, ProjectFile } from '../types';
import { vfs } from '../../../services/vfsService';
import { useToast } from '../../../context/ToastContext';
import { NativeStorage } from '../../../plugins/NativeStorage';
import { nativeBridge } from '../../../utils/nativeBridge';

interface UseFileOperationsProps {
  generatedProject: ProjectData | null;
  setGeneratedProject: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  selectedFile: ProjectFile | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<ProjectFile | null>>;
}

export function useFileOperations({
  generatedProject,
  setGeneratedProject,
  selectedFile,
  setSelectedFile
}: UseFileOperationsProps) {
  const { showToast } = useToast();
  const [backups, setBackups] = React.useState<Map<string, string>>(new Map());

  const createBackup = (path: string) => {
    if (!generatedProject) return;
    const file = generatedProject.files.find(f => f.path === path);
    if (file) {
      setBackups(prev => new Map(prev).set(path, file.content));
    }
  };

  const restoreBackup = async (path: string) => {
    if (!generatedProject) return;
    const content = backups.get(path);
    if (content !== undefined) {
      await handleFileContentChange(path, content);
      showToast(`Restored backup for ${path}`, 'success');
    } else {
      showToast(`No backup found for ${path}`, 'error');
    }
  };

  const handleNewFile = async (path: string, isFolder: boolean = false) => {
    if (!generatedProject || !path) return;

    const newPath = isFolder ? (path.endsWith('/') ? path : `${path}/`) : path;

    if (generatedProject.files.some(f => f.path === newPath)) {
      showToast('File or folder with that name already exists.', 'error');
      return;
    }

    let defaultContent = '';
    if (!isFolder) {
      if (newPath.endsWith('.html')) defaultContent = '<!-- New file created by Ham AiStudio -->\n';
      else if (newPath.endsWith('.css')) defaultContent = '/* New file created by Ham AiStudio */\n';
      else if (newPath.endsWith('.json')) defaultContent = '{\n  \n}\n';
      else if (newPath.endsWith('.md')) defaultContent = '# New File\n\nCreated by Ham AiStudio.';
      else defaultContent = '// New file created by Ham AiStudio\n';
    }

    const newFile: ProjectFile = {
      path: newPath,
      content: defaultContent,
    };

    try {
      if (isFolder) {
        await vfs.mkdir(newPath);
      } else {
        await vfs.writeFile(newPath, newFile.content, 'user');
      }

      const updatedProject = {
        ...generatedProject,
        files: [...generatedProject.files, newFile].sort((a, b) => a.path.localeCompare(b.path)),
      };

      setGeneratedProject(updatedProject);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-file-changed', { 
          detail: { path: newPath, content: newFile.content, project: updatedProject } 
        }));
      }
    } catch (e: any) {
      console.error("VFS Create Error", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast(`Gagal membuat file/folder: ${errorMessage}`, 'error');
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!generatedProject) return;

    const isFolder = path.endsWith('/');
    const updatedFiles = generatedProject.files.filter(f => 
      isFolder ? !f.path.startsWith(path) : f.path !== path
    );

    if (updatedFiles.length === generatedProject.files.length) {
      showToast('File or folder not found.', 'error');
      return;
    }

    try {
      if (isFolder) {
        const filesToDelete = generatedProject.files.filter(f => f.path.startsWith(path)).map(f => f.path);
        await vfs.bulkDelete(filesToDelete);
        // Sync delete for folder is tricky with bulkDelete, let's just delete the folder if possible or files
        // NativeStorage doesn't have rmdir recursive exposed easily in bulk, but has rmdir.
      } else {
        await vfs.unlink(path);
      }

      const updatedProject = {
        ...generatedProject,
        files: updatedFiles,
      };

      setGeneratedProject(updatedProject);
      if (selectedFile?.path === path) {
        setSelectedFile(null);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-file-changed', { 
          detail: { path, content: '__DELETED__', project: updatedProject } 
        }));
      }
    } catch (e: any) {
      console.error("VFS Delete Error", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast(`Gagal menghapus file/folder: ${errorMessage}`, 'error');
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!generatedProject) return;
    
    if (generatedProject.files.some(f => f.path === newPath)) {
      showToast(`File ${newPath} already exists.`, 'error');
      return;
    }

    try {
      const file = generatedProject.files.find(f => f.path === oldPath);
      const isFolder = !file && generatedProject.files.some(f => f.path.startsWith(oldPath + '/'));
      
      if (file) {
        await vfs.writeFile(newPath, file.content, 'user');
        await vfs.unlink(oldPath);
      } else if (isFolder) {
        const folderFiles = generatedProject.files.filter(f => f.path.startsWith(oldPath + '/'));
        for (const f of folderFiles) {
          const newFilePath = f.path.replace(oldPath, newPath);
          await vfs.writeFile(newFilePath, f.content, 'user');
          await vfs.unlink(f.path);
        }
        // Folder is implicitly deleted when empty in this VFS
      }

      const updatedFiles = generatedProject.files.map(f => {
        if (f.path === oldPath) return { ...f, path: newPath };
        if (f.path.startsWith(oldPath + '/')) return { ...f, path: f.path.replace(oldPath, newPath) };
        return f;
      });

      const updatedProject = { ...generatedProject, files: updatedFiles };
      setGeneratedProject(updatedProject);
      
      if (typeof window !== 'undefined') {
        if (file) {
          window.dispatchEvent(new CustomEvent('ham-file-changed', { 
            detail: { path: oldPath, content: '__DELETED__', project: updatedProject } 
          }));
          window.dispatchEvent(new CustomEvent('ham-file-changed', { 
            detail: { path: newPath, content: file.content, project: updatedProject } 
          }));
        } else if (isFolder) {
          const folderFiles = generatedProject.files.filter(f => f.path.startsWith(oldPath + '/'));
          for (const f of folderFiles) {
            window.dispatchEvent(new CustomEvent('ham-file-changed', { 
              detail: { path: f.path, content: '__DELETED__', project: updatedProject } 
            }));
            const newFilePath = f.path.replace(oldPath, newPath);
            window.dispatchEvent(new CustomEvent('ham-file-changed', { 
              detail: { path: newFilePath, content: f.content, project: updatedProject } 
            }));
          }
        }
      }
      
      if (selectedFile) {
        if (selectedFile.path === oldPath) {
          const newFile = updatedFiles.find(f => f.path === newPath);
          if (newFile) setSelectedFile(newFile);
        } else if (selectedFile.path.startsWith(oldPath + '/')) {
          const newSelectedPath = selectedFile.path.replace(oldPath, newPath);
          const newFile = updatedFiles.find(f => f.path === newSelectedPath);
          if (newFile) setSelectedFile(newFile);
        }
      }
    } catch (e: any) {
      console.error("VFS Rename Error", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast(`Gagal mengganti nama: ${errorMessage}`, 'error');
    }
  };

  const handleMoveFile = async (sourcePath: string, targetPath: string) => {
    if (!generatedProject) return;
    
    if (generatedProject.files.some(f => f.path === targetPath)) {
      showToast(`File ${targetPath} already exists.`, 'error');
      return;
    }

    try {
      const file = generatedProject.files.find(f => f.path === sourcePath);
      const isFolder = !file && generatedProject.files.some(f => f.path.startsWith(sourcePath + '/'));
      
      if (file) {
        await vfs.writeFile(targetPath, file.content, 'user');
        await vfs.unlink(sourcePath);
      } else if (isFolder) {
        const folderFiles = generatedProject.files.filter(f => f.path.startsWith(sourcePath + '/'));
        for (const f of folderFiles) {
          const newFilePath = f.path.replace(sourcePath, targetPath);
          await vfs.writeFile(newFilePath, f.content, 'user');
          await vfs.unlink(f.path);
        }
      }

      const updatedFiles = generatedProject.files.map(f => {
        if (f.path === sourcePath) return { ...f, path: targetPath };
        if (f.path.startsWith(sourcePath + '/')) return { ...f, path: f.path.replace(sourcePath, targetPath) };
        return f;
      });

      const updatedProject = { ...generatedProject, files: updatedFiles };
      setGeneratedProject(updatedProject);
      
      if (typeof window !== 'undefined') {
        if (file) {
          window.dispatchEvent(new CustomEvent('ham-file-changed', { 
            detail: { path: sourcePath, content: '__DELETED__', project: updatedProject } 
          }));
          window.dispatchEvent(new CustomEvent('ham-file-changed', { 
            detail: { path: targetPath, content: file.content, project: updatedProject } 
          }));
        } else if (isFolder) {
          const folderFiles = generatedProject.files.filter(f => f.path.startsWith(sourcePath + '/'));
          for (const f of folderFiles) {
            window.dispatchEvent(new CustomEvent('ham-file-changed', { 
              detail: { path: f.path, content: '__DELETED__', project: updatedProject } 
            }));
            const newFilePath = f.path.replace(sourcePath, targetPath);
            window.dispatchEvent(new CustomEvent('ham-file-changed', { 
              detail: { path: newFilePath, content: f.content, project: updatedProject } 
            }));
          }
        }
      }
      
      if (selectedFile) {
        if (selectedFile.path === sourcePath) {
          const newFile = updatedFiles.find(f => f.path === targetPath);
          if (newFile) setSelectedFile(newFile);
        } else if (selectedFile.path.startsWith(sourcePath + '/')) {
          const newSelectedPath = selectedFile.path.replace(sourcePath, targetPath);
          const newFile = updatedFiles.find(f => f.path === newSelectedPath);
          if (newFile) setSelectedFile(newFile);
        }
      }
    } catch (e: any) {
      console.error("VFS Move Error", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast(`Gagal memindahkan file: ${errorMessage}`, 'error');
    }
  };

  const handleDuplicateFile = async (path: string) => {
    if (!generatedProject) return;

    const file = generatedProject.files.find(f => f.path === path);
    const isFolder = !file && generatedProject.files.some(f => f.path.startsWith(path + '/'));

    if (!file && !isFolder) return;

    if (file) {
      const parts = path.split('.');
      const ext = parts.length > 1 ? `.${parts.pop()}` : '';
      const name = parts.join('.');
      let newPath = `${name}_copy${ext}`;
      let counter = 1;

      while (generatedProject.files.some(f => f.path === newPath)) {
        newPath = `${name}_copy${counter}${ext}`;
        counter++;
      }

      const newFile: ProjectFile = {
        path: newPath,
        content: file.content,
      };

      try {
        await vfs.writeFile(newPath, file.content, 'user');
        const updatedProject = {
          ...generatedProject,
          files: [...generatedProject.files, newFile].sort((a, b) => a.path.localeCompare(b.path)),
        };
        setGeneratedProject(updatedProject);
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ham-file-changed', { 
            detail: { path: newPath, content: newFile.content, project: updatedProject } 
          }));
        }
      } catch (e: any) {
        console.error("VFS Duplicate Error", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        showToast(`Gagal menduplikasi file: ${errorMessage}`, 'error');
      }
    } else if (isFolder) {
      let newPath = `${path}_copy`;
      let counter = 1;

      while (generatedProject.files.some(f => f.path.startsWith(newPath + '/'))) {
        newPath = `${path}_copy${counter}`;
        counter++;
      }

      const folderFiles = generatedProject.files.filter(f => f.path.startsWith(path + '/'));
      const newFiles: ProjectFile[] = [];

      try {
        for (const f of folderFiles) {
          const newFilePath = f.path.replace(path, newPath);
          await vfs.writeFile(newFilePath, f.content, 'user');
          newFiles.push({ path: newFilePath, content: f.content });
        }
        const updatedProject = {
          ...generatedProject,
          files: [...generatedProject.files, ...newFiles].sort((a, b) => a.path.localeCompare(b.path)),
        };
        setGeneratedProject(updatedProject);
        
        if (typeof window !== 'undefined') {
          for (const f of newFiles) {
            window.dispatchEvent(new CustomEvent('ham-file-changed', { 
              detail: { path: f.path, content: f.content, project: updatedProject } 
            }));
          }
        }
      } catch (e: any) {
        console.error("VFS Duplicate Folder Error", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        showToast(`Gagal menduplikasi folder: ${errorMessage}`, 'error');
      }
    }
  };

  const handleFileContentChange = async (path: string, content: string) => {
    if (!generatedProject) return;

    // Auto-backup before change if not exists
    if (!backups.has(path)) {
       createBackup(path);
    }

    const fileExists = generatedProject.files.some(f => f.path === path);
    const updatedFiles = fileExists 
      ? generatedProject.files.map(f => f.path === path ? { ...f, content } : f)
      : [...generatedProject.files, { path, content }];

    setGeneratedProject(prev => prev ? { ...prev, files: updatedFiles } : null);
    
    // Auto-sync to Native Storage via VFS
    try {
      await vfs.writeFile(path, content, 'user');
      
      // Trigger preview update for real-time HMR/auto-reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-file-changed', { 
          detail: { path, content, project: { ...generatedProject, files: updatedFiles } } 
        }));
      }
    } catch (e: any) {
      console.error("Failed to sync file to native storage", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast(`Gagal menyimpan perubahan file: ${errorMessage}`, 'error');
    }
  };

  const handleSaveSingleFile = async (path: string, content: string) => {
    try {
      await vfs.writeFile(path, content, 'user');
      
      // If we are on web, we might still want to trigger a download for convenience
      // But vfs handles IndexedDB on web, so it 'saves' to the browser storage.
      // If the user explicitly wants to 'export' the file to their OS filesystem on web:
      if (typeof window !== 'undefined' && !window.navigator.userAgent.includes('Android')) { // Simple check, or use Capacitor.isNativePlatform()
         const blob = new Blob([content], { type: 'text/plain' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = path.split('/').pop() || 'file.txt';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
      } else {
         // Silently save
      }
    } catch (e: any) {
      console.error("Save failed", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast(`Gagal menyimpan file: ${errorMessage}`, 'error');
    }
  };

  const handleImportFiles = async (files: { path: string, content: string }[]) => {
    if (!generatedProject) return;

    const newFiles = [...generatedProject.files];
    let addedCount = 0;
    const successfulFiles: { path: string, content: string }[] = [];

    for (const file of files) {
      try {
        await vfs.writeFile(file.path, file.content, 'user');
        
        const existingIndex = newFiles.findIndex(f => f.path === file.path);
        if (existingIndex >= 0) {
          newFiles[existingIndex] = { ...newFiles[existingIndex], content: file.content };
        } else {
          newFiles.push({ path: file.path, content: file.content });
          addedCount++;
        }
        successfulFiles.push(file);
      } catch (e: any) {
        console.error(`Failed to sync imported file ${file.path}`, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        showToast(`Gagal mengimpor file ${file.path}: ${errorMessage}`, 'error');
      }
    }
    
    newFiles.sort((a, b) => a.path.localeCompare(b.path));

    const updatedProject = { ...generatedProject, files: newFiles };
    setGeneratedProject(updatedProject);
    
    if (typeof window !== 'undefined' && successfulFiles.length > 0) {
      window.dispatchEvent(new CustomEvent('ham-bulk-file-changed', { 
        detail: { files: successfulFiles, project: updatedProject } 
      }));
    }
    
    showToast(`Imported ${files.length} files (${addedCount} new).`, 'success');
  };

  return {
    handleNewFile,
    handleDeleteFile,
    handleRenameFile,
    handleMoveFile,
    handleDuplicateFile,
    handleFileContentChange,
    handleSaveSingleFile,
    handleImportFiles,
    createBackup,
    restoreBackup
  };
}
