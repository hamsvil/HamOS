 
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, X, AlertCircle, UploadCloud, Loader2, Table } from 'lucide-react';
import { ProjectData, ProjectFile } from './types';
import { ResponsiveContainer, BarChart, LineChart, PieChart, Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedProject: ProjectData | null;
}

type ChartType = 'bar' | 'line' | 'pie' | 'table';

export default function AnalyticsDashboardModal({ isOpen, onClose, generatedProject }: AnalyticsDashboardModalProps) {
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [error, setError] = useState<string | null>(null);

  const dataFiles = useMemo(() => 
    generatedProject?.files.filter(f => f.path.endsWith('.json') || f.path.endsWith('.csv')) || [], 
    [generatedProject]
  );

  const handleFileChange = useCallback((file: ProjectFile) => {
    setSelectedFile(file);
    setError(null);
    try {
      let parsedData;
      if (file.path.endsWith('.json')) {
        parsedData = JSON.parse(file.content);
      } else { // CSV
        const lines = file.content.split('\n').filter(l => l.trim() !== '');
        if (lines.length > 0) {
          const header = lines[0].split(',');
          parsedData = lines.slice(1).map(line => {
            const values = line.split(',');
            return header.reduce((obj, nextKey, index) => ({ ...obj, [nextKey]: values[index] }), {});
          });
        } else {
          parsedData = [];
        }
      }
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        setData(parsedData);
        setHeaders(Object.keys(parsedData[0]));
      } else {
        setError('Invalid or empty data format.');
      }
    } catch (e) {
      setError('Failed to parse data file.');
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (dataFiles.length > 0 && !selectedFile) {
      handleFileChange(dataFiles[0]);
    }
  }, [dataFiles, selectedFile, handleFileChange]);

  if (!isOpen) return null;
  
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[90vh]">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#1e1e1e]">
          <h3 className="font-semibold text-gray-200 flex items-center gap-2 text-sm">
            <BarChartIcon size={16} className="text-purple-400" />
            Data Analytics Dashboard
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 bg-[#0a0a0a] p-4 overflow-auto flex flex-col">
          {dataFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <p>No data files (.csv, .json) found in the project.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              <div className="flex gap-4 mb-4 items-center">
                <select 
                  onChange={(e) => handleFileChange(dataFiles.find(f => f.path === e.target.value)!)}
                  value={selectedFile?.path || ''}
                  className="bg-[#1e1e1e] border border-white/10 rounded-md px-2.5 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {dataFiles.map(file => <option key={file.path} value={file.path}>{file.path}</option>)}
                </select>
                <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-white/10">
                  {(['bar', 'line', 'pie', 'table'] as ChartType[]).map(type => (
                    <button key={type} onClick={() => setChartType(type)} className={`px-2 py-0.5 text-xs rounded ${chartType === type ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 bg-[#1e1e1e] p-3 rounded-xl border border-white/5">
                {error ? (
                  <div className="flex items-center justify-center h-full text-red-400"><AlertCircle className="mr-2"/>{error}</div>
                ) : headers.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey={headers[0]} stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                        <Legend />
                        <Bar dataKey={headers[1]} fill="#8884d8" />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey={headers[0]} stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                        <Legend />
                        <Line type="monotone" dataKey={headers[1]} stroke="#82ca9d" />
                      </LineChart>
                    ) : chartType === 'pie' ? (
                      <PieChart>
                        <Pie data={data} dataKey={headers[1]} nameKey={headers[0]} cx="50%" cy="50%" outerRadius={150} fill="#8884d8">
                          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                        <Legend />
                      </PieChart>
                    ) : (
                      <div className="overflow-auto h-full">
                        <table className="w-full text-sm text-left text-gray-300">
                          <thead className="text-xs text-gray-400 uppercase bg-[#2a2a2a]">
                            <tr>{headers.map(h => <th key={h} className="px-4 py-2">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {data.map((row, i) => (
                              <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                                {headers.map(h => <td key={h} className="px-4 py-2.5">{row[h]}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
