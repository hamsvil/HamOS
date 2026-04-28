 
import React, { useEffect, useState, useCallback } from 'react';
import { Package, Search, Download, Trash2, ExternalLink, Loader2, Check, AlertCircle, Play, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData } from '../types';
import { useConfirm } from '../../../context/ConfirmContext';

interface PackageManagerProps {
  project: ProjectData | null;
  onInstall: (pkg: string) => void;
  onUninstall: (pkg: string) => void;
  onRunScript?: (scriptName: string) => void;
}

interface NpmPackage {
  name: string;
  version: string;
  description: string;
  isDev?: boolean;
}

export default function PackageManager({ project, onInstall, onUninstall, onRunScript }: PackageManagerProps) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NpmPackage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [installedPackages, setInstalledPackages] = useState<NpmPackage[]>([]);
  const [npmScripts, setNpmScripts] = useState<Record<string, string>>({});
  const [installingPackages, setInstallingPackages] = useState<Set<string>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const { confirm } = useConfirm();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleInstall = async (pkgName: string) => {
    if (installingPackages.has(pkgName)) return;
    setInstallingPackages(prev => {
        const next = new Set(prev);
        next.add(pkgName);
        return next;
    });
    try {
        await onInstall(pkgName);
    } finally {
        setInstallingPackages(prev => {
            const next = new Set(prev);
            next.delete(pkgName);
            return next;
        });
    }
  };

  const handleUninstall = async (pkgName: string) => {
    if (installingPackages.has(pkgName)) return;
    if (!(await confirm(`Are you sure you want to uninstall ${pkgName}?`))) return;
    
    setInstallingPackages(prev => {
        const next = new Set(prev);
        next.add(pkgName);
        return next;
    });
    try {
        await onUninstall(pkgName);
    } finally {
        setInstallingPackages(prev => {
            const next = new Set(prev);
            next.delete(pkgName);
            return next;
        });
    }
  };

  const isPackageInstalled = (pkgName: string) => {
    return installedPackages.some(p => p.name === pkgName);
  };

  useEffect(() => {
    if (project) {
      const pkgJsonFile = project.files.find(f => f.path === 'package.json');
      if (pkgJsonFile) {
        try {
          const pkgJson = JSON.parse(pkgJsonFile.content);
          const deps = Object.entries(pkgJson.dependencies || {}).map(([name, version]) => ({
            name,
            version: version as string,
            description: 'Dependency',
            isDev: false
          }));
          const devDeps = Object.entries(pkgJson.devDependencies || {}).map(([name, version]) => ({
            name,
            version: version as string,
            description: 'Dev Dependency',
            isDev: true
          }));
          
          setInstalledPackages([...deps, ...devDeps]);
          
          if (pkgJson.scripts) {
            setNpmScripts(pkgJson.scripts);
          } else {
            setNpmScripts({});
          }
          setParseError(null);
        } catch (e) {
          console.error("Failed to parse package.json", e);
          setParseError("Invalid package.json file. Please fix syntax errors.");
          setInstalledPackages([]);
          setNpmScripts({});
        }
      } else {
          setInstalledPackages([]);
          setNpmScripts({});
          setParseError(null);
      }
    }
  }, [project]);

  useEffect(() => {
    const search = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
          // Use npms.io API for search
          const response = await fetch(`https://api.npms.io/v2/search?q=${encodeURIComponent(searchQuery)}`);
          if (!response.ok) throw new Error('Search failed');
          const data = await response.json();
          const results = data.results.map((r: any) => ({
            name: r.package.name,
            version: r.package.version,
            description: r.package.description
          }));
          setSearchResults(results);
        } catch (e) {
          console.error("NPM Search Error", e);
        } finally {
          setIsSearching(false);
        }
    };
    search();
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-xs font-mono">
      <div className="p-3 border-b border-white/10 bg-[#141414]">
        <h3 className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-2">
          <Package size={16} className="text-blue-400" />
          Package Manager
        </h3>
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search NPM packages..."
            className="w-full bg-[#050505] border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-gray-300 focus:outline-none focus:border-blue-500/50"
          />
          <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
          {isSearching && <Loader2 size={14} className="absolute right-2.5 top-2 text-blue-500 animate-spin" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {parseError && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2 text-red-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold">Error parsing package.json</p>
                    <p className="opacity-80">{parseError}</p>
                </div>
            </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Search Results</h4>
            <div className="space-y-2">
              {searchResults.map((pkg) => (
                <div key={pkg.name} className="bg-[#1e1e1e] border border-white/5 rounded-lg p-3 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-400 truncate">{pkg.name}</span>
                      <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400">{pkg.version}</span>
                    </div>
                    <p className="text-gray-500 truncate mt-0.5">{pkg.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                        onClick={() => handleInstall(pkg.name)}
                        disabled={isPackageInstalled(pkg.name) || installingPackages.has(pkg.name)}
                        className={`p-1.5 rounded-md transition-colors ${
                            isPackageInstalled(pkg.name) 
                            ? 'bg-green-500/20 text-green-400 cursor-default' 
                            : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                        }`}
                        title={isPackageInstalled(pkg.name) ? "Installed" : "Install Dependency"}
                    >
                        {installingPackages.has(pkg.name) ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : isPackageInstalled(pkg.name) ? (
                            <Check size={14} />
                        ) : (
                            <Download size={14} />
                        )}
                    </button>
                    {!isPackageInstalled(pkg.name) && !installingPackages.has(pkg.name) && (
                        <button
                            onClick={() => handleInstall(pkg.name + ' -D')}
                            className="p-1.5 rounded-md bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600 hover:text-white transition-colors"
                            title="Install as Dev Dependency"
                        >
                            <span className="text-[10px] font-bold">DEV</span>
                        </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NPM Scripts - Only show if not searching */}
        {!searchQuery && Object.keys(npmScripts).length > 0 && (
          <div className="mb-4">
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">NPM Scripts</h4>
            <div className="space-y-1.5">
              {Object.entries(npmScripts).map(([name, cmd]) => (
                <div key={name} className="bg-[#1e1e1e] border border-white/5 rounded-lg p-2 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                  <div className="flex-1 min-w-0 mr-2">
                    <span className="font-bold text-orange-400 text-xs">{name}</span>
                    <p className="text-gray-500 text-[9px] truncate font-mono mt-0.5" title={cmd}>{cmd}</p>
                  </div>
                  <button
                    onClick={() => onRunScript && onRunScript(name)}
                    className="p-1.5 bg-orange-600/20 text-orange-400 rounded-md hover:bg-orange-600 hover:text-white transition-colors"
                    title={`Run npm run ${name}`}
                  >
                    <Play size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Installed Packages - Only show if not searching */}
        {!searchQuery && (
            <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Installed Dependencies</h4>
            {installedPackages.length === 0 && !parseError ? (
                <p className="text-gray-600 italic text-center py-4">No packages installed yet.</p>
            ) : (
                <div className="space-y-2">
                {installedPackages.map((pkg) => (
                    <div key={pkg.name} className="bg-[#1e1e1e] border border-white/5 rounded-lg p-3 flex items-center justify-between group">
                    <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                        <span className={`font-bold truncate ${pkg.isDev ? 'text-yellow-400' : 'text-green-400'}`}>{pkg.name}</span>
                        <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400">{pkg.version}</span>
                        {pkg.isDev && <span className="text-[9px] border border-yellow-500/30 text-yellow-500/70 px-1 rounded">dev</span>}
                        </div>
                    </div>
                    <button
                        onClick={() => handleUninstall(pkg.name)}
                        disabled={installingPackages.has(pkg.name)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Uninstall"
                    >
                        {installingPackages.has(pkg.name) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                    </div>
                ))}
                </div>
            )}
            </div>
        )}
      </div>
    </div>
  );
}
