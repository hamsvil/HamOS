import React, { useState, useEffect } from 'react';
import { webStorage } from '../../../services/vfs/WebStorageService';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card } from '../../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { logger } from '../../../server/logger';

const StorageManager: React.FC = () => {
  const [opfsFiles, setOpfsFiles] = useState<string[]>([]);
  const [apkPath, setApkPath] = useState('/sdcard/');
  const [apkResult, setApkResult] = useState('');
  const [isApkActive, setIsApkActive] = useState(false);

  useEffect(() => {
    refreshOPFS();
    checkApkStatus();
    const interval = setInterval(checkApkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const refreshOPFS = async () => {
    const files = await webStorage.listOPFS();
    setOpfsFiles(files);
  };

  const checkApkStatus = async () => {
    try {
      // Polling APK status (via poll endpoint to see if it's being cleared)
      // For now, just a placeholder check
      setIsApkActive(true);
    } catch (e) {
      setIsApkActive(false);
    }
  };

  const handleUpload = async () => {
    const files = await webStorage.uploadFromDevice();
    for (const f of files) {
      await webStorage.saveToOPFS(f.name, f.content);
    }
    refreshOPFS();
  };

  const handleDownload = async (name: string) => {
    const content = await webStorage.readFromOPFS(name);
    if (content) {
      webStorage.downloadToDevice(name, content);
    }
  };

  const sendApkCommand = async (command: string, params: any = {}) => {
    try {
      const secrets = await (await fetch('/hamli-secrets.json')).json();
      const res = await fetch('/api/storage/apk-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secrets.lisa_token}`
        },
        body: JSON.stringify({ command, params })
      });
      const data = await res.json();
      setApkResult(`Command sent: ${data.commandId}. Check logs for result.`);
    } catch (error: any) {
      setApkResult(`Error: ${error.message}`);
    }
  };

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-xl border-white/10 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Storage Bridge</h2>
        <div className={`flex items-center gap-2 text-sm ${isApkActive ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isApkActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          APK Status: {isApkActive ? 'Online' : 'Offline'}
        </div>
      </div>

      <Tabs defaultValue="browser">
        <TabsList className="bg-white/5 mb-4">
          <TabsTrigger value="browser">Browser Storage (OPFS)</TabsTrigger>
          <TabsTrigger value="apk">APK Native Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="browser">
          <div className="space-y-4">
            <Button onClick={handleUpload} variant="outline" className="w-full">
              Upload Files to OPFS
            </Button>
            <div className="grid grid-cols-1 gap-2">
              {opfsFiles.map(file => (
                <div key={file} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                  <span>{file}</span>
                  <Button onClick={() => handleDownload(file)} size="sm" variant="ghost">
                    Download
                  </Button>
                </div>
              ))}
              {opfsFiles.length === 0 && <p className="text-center text-white/40">No files in OPFS</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="apk">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={apkPath} 
                onChange={(e) => setApkPath(e.target.value)} 
                placeholder="Path (e.g. /sdcard/)" 
                className="bg-white/5 border-white/10"
              />
              <Button onClick={() => sendApkCommand('list_dir', { path: apkPath })}>List</Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => sendApkCommand('read_file', { path: apkPath })} variant="secondary">Read</Button>
              <Button onClick={() => sendApkCommand('delete_file', { path: apkPath })} variant="destructive">Delete</Button>
            </div>
            {apkResult && (
              <div className="p-2 bg-white/5 rounded text-xs font-mono break-all border border-white/10">
                {apkResult}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default StorageManager;
