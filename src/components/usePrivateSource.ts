 
import { useState, useEffect, useRef } from 'react';
import { FileItem } from './PrivateSourceTab.types';
import { safeStorage } from '../utils/storage';
import { EnvironmentChecker } from '../services/environmentChecker';
import { resilienceEngine } from '../services/ResilienceEngine';
import { NativeStorage } from '../plugins/NativeStorage';

export const usePrivateSource = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(['project-x', 'config.json', 'assets']);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [minSizeFilter, setMinSizeFilter] = useState(0);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashItems, setTrashItems] = useState<FileItem[]>([
    { id: 't1', name: 'old_config.backup', isDirectory: false, path: 'old_config.backup', size: 1024, modifiedAt: Date.now() - 86400000 * 5 },
    { id: 't2', name: 'deleted_image.png', isDirectory: false, path: 'deleted_image.png', size: 500000, modifiedAt: Date.now() - 86400000 * 2 }
  ]);
  const [storageData] = useState<{ label: string; value: number; color: string }[]>([
    { label: 'Images', value: 35, color: '#ec4899' },
    { label: 'Videos', value: 25, color: '#a855f7' },
    { label: 'Documents', value: 20, color: '#94a3b8' },
    { label: 'Code', value: 15, color: '#3b82f6' },
    { label: 'Others', value: 5, color: '#10b981' }
  ]);
  const [isOfflineEnabled, setIsOfflineEnabled] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionLoadingMap, setActionLoadingMap] = useState<Map<string, boolean>>(new Map());
  const [previewFile, setPreviewFile] = useState<{ path: string; content: string } | null>(null);
  const [infoFile, setInfoFile] = useState<FileItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  return {
    searchQuery, setSearchQuery,
    searchHistory, setSearchHistory,
    showSearchHistory, setShowSearchHistory,
    activeTypeFilter, setActiveTypeFilter,
    dateRange, setDateRange,
    minSizeFilter, setMinSizeFilter,
    isTrashOpen, setIsTrashOpen,
    trashItems, setTrashItems,
    storageData,
    isOfflineEnabled, setIsOfflineEnabled,
    sortKey, setSortKey,
    selectedItems, setSelectedItems,
    items, setItems,
    currentPath, setCurrentPath,
    password, setPassword,
    isAuthenticated, setIsAuthenticated,
    loading, setLoading,
    editingFile, setEditingFile,
    error, setError,
    actionLoading, setActionLoading,
    debouncedSearch, setDebouncedSearch,
    actionLoadingMap, setActionLoadingMap,
    previewFile, setPreviewFile,
    infoFile, setInfoFile,
    contextMenu, setContextMenu,
    favorites, setFavorites
  };
};
