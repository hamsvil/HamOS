 
import React, { useState, useEffect, useCallback } from 'react';
import { Database, Table, X, AlertCircle, Play, FileText, LayoutGrid, RefreshCw, Loader2 } from 'lucide-react';
import { ProjectData, ProjectFile } from './types';
import initSqlJs, { Database as SQLDatabase, QueryExecResult } from 'sql.js';

interface DatabaseVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedProject: ProjectData | null;
}

type TableInfo = {
  name: string;
  columns: { name: string; type: string }[];
};

export default function DatabaseVisualizerModal({ isOpen, onClose, generatedProject }: DatabaseVisualizerModalProps) {
  const [db, setDb] = useState<SQLDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedDbFile, setSelectedDbFile] = useState<ProjectFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'schema' | 'data' | 'sql'>('schema');
  
  // Data View State
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryExecResult | null>(null);
  
  // SQL View State
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryExecResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const dbFiles = generatedProject?.files.filter(f => f.path.endsWith('.db') || f.path.endsWith('.sqlite')) || [];

  const initDb = async (file: ProjectFile) => {
    if (!file.content) return;
    setIsLoading(true);
    setError(null);
    setTables([]);
    setDb(null);
    
    try {
      const SQL = await initSqlJs({ 
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      // Decode base64 content
      const binaryString = window.atob(file.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const database = new SQL.Database(bytes);
      setDb(database);

      // Fetch tables
      const result = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      if (result.length > 0) {
        const tableNames = result[0].values.map(row => row[0] as string);
        const tablesInfo: TableInfo[] = [];
        
        for (const name of tableNames) {
            try {
                const tableResult = database.exec(`PRAGMA table_info(${name});`);
                if (tableResult.length > 0) {
                    const columns = tableResult[0].values.map(row => ({ 
                        name: row[1] as string, 
                        type: row[2] as string 
                    }));
                    tablesInfo.push({ name, columns });
                }
            } catch (e) {
                console.warn(`Failed to get info for table ${name}`, e);
            }
        }
        setTables(tablesInfo);
        if (tablesInfo.length > 0) setSelectedTable(tablesInfo[0].name);
      } else {
        setError('No tables found in this database.');
      }

    } catch (e) {
      console.error(e);
      setError('Failed to load database. Ensure it is a valid SQLite file.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && dbFiles.length > 0 && !selectedDbFile) {
      setSelectedDbFile(dbFiles[0]);
      initDb(dbFiles[0]);
    }
  }, [isOpen, dbFiles]);

  const handleFileSelect = (filePath: string) => {
    const file = dbFiles.find(f => f.path === filePath);
    if (file) {
      setSelectedDbFile(file);
      initDb(file);
    }
  };

  const fetchTableData = useCallback(() => {
    if (!db || !selectedTable) return;
    try {
        const result = db.exec(`SELECT * FROM ${selectedTable} LIMIT 100`);
        setTableData(result.length > 0 ? result[0] : null);
    } catch (e) {
        console.error(e);
    }
  }, [db, selectedTable]);

  useEffect(() => {
    if (activeTab === 'data' && selectedTable) {
        fetchTableData();
    }
  }, [activeTab, selectedTable, fetchTableData]);

  const executeQuery = () => {
    if (!db || !query.trim()) return;
    setQueryError(null);
    try {
        const result = db.exec(query);
        setQueryResult(result.length > 0 ? result[0] : null);
        
        // Refresh table list if schema changed
        if (query.toLowerCase().includes('create') || query.toLowerCase().includes('drop')) {
            // Re-fetch tables logic... simplified for now
        }
    } catch (e: any) {
        setQueryError(e.message);
        setQueryResult(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#141414] rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#1e1e1e]">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-200 flex items-center gap-2 text-sm">
                <Database size={16} className="text-orange-400" />
                Database Visualizer
            </h3>
            
            {dbFiles.length > 0 && (
                <select 
                    onChange={(e) => handleFileSelect(e.target.value)}
                    value={selectedDbFile?.path || ''}
                    className="bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-orange-500"
                >
                    {dbFiles.map(file => <option key={file.path} value={file.path}>{file.path}</option>)}
                </select>
            )}
          </div>
          
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center border-b border-white/10 bg-[#1a1a1a] px-2">
            <button 
                onClick={() => setActiveTab('schema')}
                className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'schema' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <LayoutGrid size={14} /> Schema
            </button>
            <button 
                onClick={() => setActiveTab('data')}
                className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'data' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <Table size={14} /> Data
            </button>
            <button 
                onClick={() => setActiveTab('sql')}
                className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'sql' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
                <FileText size={14} /> SQL Console
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#0a0a0a] overflow-hidden relative flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Loader2 size={32} className="mb-4 animate-spin text-orange-400" />
              <p className="text-xs">Loading Database...</p>
            </div>
          ) : error ? (
             <div className="flex-1 flex flex-col items-center justify-center text-red-400">
              <AlertCircle size={32} className="mb-4" />
              <p className="text-sm">{error}</p>
            </div>
          ) : !db ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <p>Select a database file to view.</p>
             </div>
          ) : (
            <>
                {activeTab === 'schema' && (
                    <div className="p-4 overflow-auto h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                        {tables.map((table) => (
                            <div key={table.name} className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-lg overflow-hidden h-fit">
                                <div className="bg-orange-500/10 px-3 py-2 border-b border-orange-500/20 flex items-center gap-2">
                                    <Table size={14} className="text-orange-400" />
                                    <span className="font-mono font-bold text-xs text-orange-300">{table.name}</span>
                                </div>
                                <div className="p-2 space-y-1">
                                    {table.columns.map((col) => (
                                    <div key={col.name} className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-gray-300 bg-[#141414] rounded font-mono">
                                        <span>{col.name}</span>
                                        <span className="text-orange-400/70">{col.type}</span>
                                    </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {tables.length === 0 && <p className="text-gray-500 text-sm col-span-full text-center mt-10">No tables found.</p>}
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="flex h-full">
                        <div className="w-48 border-r border-white/10 bg-[#141414] overflow-y-auto p-2">
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Tables</h4>
                            {tables.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => setSelectedTable(t.name)}
                                    className={`w-full text-left px-3 py-2 rounded text-xs font-mono mb-1 transition-colors ${selectedTable === t.name ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-auto bg-[#0a0a0a] p-4">
                            {tableData ? (
                                <div className="border border-white/10 rounded-lg overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#1e1e1e] border-b border-white/10">
                                                {tableData.columns.map(col => (
                                                    <th key={col} className="px-4 py-2 text-xs font-medium text-gray-400 font-mono border-r border-white/5 last:border-0 whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tableData.values.map((row, i) => (
                                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    {row.map((cell, j) => (
                                                        <td key={j} className="px-4 py-2 text-xs text-gray-300 font-mono border-r border-white/5 last:border-0 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                                                            {cell === null ? <span className="text-gray-600 italic">NULL</span> : String(cell)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                                    Select a table to view data (Limit 100 rows)
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'sql' && (
                    <div className="flex flex-col h-full">
                        <div className="h-1/3 border-b border-white/10 bg-[#141414] p-2 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400 font-mono">SQL Query</span>
                                <button 
                                    onClick={executeQuery}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold transition-colors"
                                >
                                    <Play size={12} /> Execute
                                </button>
                            </div>
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="flex-1 bg-[#0a0a0a] border border-white/10 rounded p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-orange-500 resize-none"
                                placeholder="SELECT * FROM table_name..."
                            />
                        </div>
                        <div className="flex-1 overflow-auto bg-[#0a0a0a] p-4">
                            {queryError ? (
                                <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-xs font-mono">
                                    Error: {queryError}
                                </div>
                            ) : queryResult ? (
                                <div className="border border-white/10 rounded-lg overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#1e1e1e] border-b border-white/10">
                                                {queryResult.columns.map(col => (
                                                    <th key={col} className="px-4 py-2 text-xs font-medium text-gray-400 font-mono border-r border-white/5 last:border-0 whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queryResult.values.map((row, i) => (
                                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    {row.map((cell, j) => (
                                                        <td key={j} className="px-4 py-2 text-xs text-gray-300 font-mono border-r border-white/5 last:border-0 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                                                            {cell === null ? <span className="text-gray-600 italic">NULL</span> : String(cell)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                                    Execute a query to see results
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
