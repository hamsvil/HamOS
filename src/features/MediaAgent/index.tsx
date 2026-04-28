// [AUTO-GENERATED-IMPORTS-START]
import { AuthCredentialInput } from './components/AuthCredentialInput';
import { AutoCleanupToggle } from './components/AutoCleanupToggle';
import { BatchDownloadControl } from './components/BatchDownloadControl';
import { CancelTaskButton } from './components/CancelTaskButton';
import { CaptureActivityTimeline } from './components/CaptureActivityTimeline';
import { CaptureHistoryList } from './components/CaptureHistoryList';
import { CaptureScheduleForm } from './components/CaptureScheduleForm';
import { ClearHistoryButton } from './components/ClearHistoryButton';
import { CloudSyncToggle } from './components/CloudSyncToggle';
import { DownloaderProgressList } from './components/DownloaderProgressList';
import { EncodingStatsTable } from './components/EncodingStatsTable';
import { ExportConfigModal } from './components/ExportConfigModal';
import { ExportLogsButton } from './components/ExportLogsButton';
import { FavoriteMediaManager } from './components/FavoriteMediaManager';
import { FilterRuleEditor } from './components/FilterRuleEditor';
import { FormatSelector } from './components/FormatSelector';
import { MediaDiffViewer } from './components/MediaDiffViewer';
import { MediaGalleryGrid } from './components/MediaGalleryGrid';
import { MediaMetadataTable } from './components/MediaMetadataTable';
import { MediaPreviewModal } from './components/MediaPreviewModal';
import { MediaSettingsPanel } from './components/MediaSettingsPanel';
import { MediaSourcePicker } from './components/MediaSourcePicker';
import { MetaDataEditor } from './components/MetaDataEditor';
import { NotificationPreferences } from './components/NotificationPreferences';
import { PauseResumeControl } from './components/PauseResumeControl';
import { PriorityToggle } from './components/PriorityToggle';
import { ProxySettingsForm } from './components/ProxySettingsForm';
import { QualitySlider } from './components/QualitySlider';
import { ResolutionSelector } from './components/ResolutionSelector';
import { RetryFailedButton } from './components/RetryFailedButton';
import { StartCaptureButton } from './components/StartCaptureButton';
import { StopAllTasksButton } from './components/StopAllTasksButton';
import { StorageRetentionConfig } from './components/StorageRetentionConfig';
import { StorageUsageChart } from './components/StorageUsageChart';
import { StreamStatusBadge } from './components/StreamStatusBadge';
import { TargetFolderPicker } from './components/TargetFolderPicker';
import { TaskQueueManager } from './components/TaskQueueManager';
import { ThemeSelector } from './components/ThemeSelector';
import { ThumbnailStrip } from './components/ThumbnailStrip';
import { VerbosityLevelSelector } from './components/VerbosityLevelSelector';
// [AUTO-GENERATED-IMPORTS-END]
import React, { useState, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, Send, TrendingUp, Calendar, AlertCircle, Bot } from 'lucide-react';
import { useMediaAgent } from '../../components/HamAiStudio/hooks/useMediaAgent';
import { useFeatureAgent } from '../../components/HamAiStudio/hooks/useFeatureAgent';
import { MediaPost, Trend } from '../../types/mediaAgent';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const MediaAgentContent = () => {
  const { boundInstance } = useFeatureAgent('media-agent');
  const { queue, trends, loading, error, addToQueue } = useMediaAgent();
  const [newPost, setNewPost] = useState('');

  const handlePost = async () => {
    if (!newPost) return;
    try {
      const success = await addToQueue(newPost);
      if (success) setNewPost('');
    } catch (err) {
      console.error('Failed to add to queue', err);
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-slate-950 text-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Media Agent</h1>
          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 flex gap-2 items-center">
            <Bot size={12} />
            Agent: The Maestro
          </Badge>
          {boundInstance && (
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 flex gap-2 items-center">
              <Bot size={12} />
              Legacy: {boundInstance.agent.displayName}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="border-primary/50 text-primary">Autonomous Empire v7.2</Badge>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Quick Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              placeholder="What's the trend today?" 
              value={newPost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPost(e.target.value)}
              className="bg-slate-800 border-slate-700"
              disabled={loading}
            />
            <Button onClick={handlePost} disabled={loading || !newPost} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : 'Add to Queue'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Live Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && trends.length === 0 ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-500" /></div>
            ) : (
              <div className="space-y-2">
                {trends.map((t: Trend, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-800">
                    <span className="text-sm">{t.topic}</span>
                    <Badge variant={t.velocity === 'high' ? 'default' : 'secondary'} className="text-[10px] h-5">{t.velocity}</Badge>
                  </div>
                ))}
                {trends.length === 0 && !loading && <p className="text-xs text-slate-500 text-center">No trends detected</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Publication Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {loading && queue.length === 0 ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-500 w-8 h-8" /></div>
              ) : queue.length === 0 ? (
                <p className="text-slate-500 text-center py-10">Queue is empty</p>
              ) : (
                <div className="space-y-4">
                  {queue.map((item: MediaPost) => (
                    <div key={item.id} className="p-4 rounded-lg bg-slate-800 border border-slate-700 flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.content}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <Badge variant={item.status === 'posted' ? 'default' : 'outline'}>{item.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-8 opacity-50 border-t border-slate-800 pt-4">
          // [AUTO-GENERATED-COMPONENTS-START]
          <AuthCredentialInput />
          <AutoCleanupToggle />
          <BatchDownloadControl />
          <CancelTaskButton />
          <CaptureActivityTimeline />
          <CaptureHistoryList />
          <CaptureScheduleForm />
          <ClearHistoryButton />
          <CloudSyncToggle />
          <DownloaderProgressList />
          <EncodingStatsTable />
          <ExportConfigModal />
          <ExportLogsButton />
          <FavoriteMediaManager />
          <FilterRuleEditor />
          <FormatSelector />
          <MediaDiffViewer />
          <MediaGalleryGrid />
          <MediaMetadataTable />
          <MediaPreviewModal />
          <MediaSettingsPanel />
          <MediaSourcePicker />
          <MetaDataEditor />
          <NotificationPreferences />
          <PauseResumeControl />
          <PriorityToggle />
          <ProxySettingsForm />
          <QualitySlider />
          <ResolutionSelector />
          <RetryFailedButton />
          <StartCaptureButton />
          <StopAllTasksButton />
          <StorageRetentionConfig />
          <StorageUsageChart />
          <StreamStatusBadge />
          <TargetFolderPicker />
          <TaskQueueManager />
          <ThemeSelector />
          <ThumbnailStrip />
          <VerbosityLevelSelector />
          // [AUTO-GENERATED-COMPONENTS-END]
        </div>
</div>
  );
};

export const MediaAgent = () => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
      <MediaAgentContent />
    </Suspense>
  </ErrorBoundary>
);


