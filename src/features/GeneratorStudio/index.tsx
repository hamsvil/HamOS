// [AUTO-GENERATED-IMPORTS-START]
import { AspectRatioPreview } from './components/AspectRatioPreview';
import { AutoDownloadToggle } from './components/AutoDownloadToggle';
import { BatchResultGrid } from './components/BatchResultGrid';
import { ClearCanvasButton } from './components/ClearCanvasButton';
import { CompareView } from './components/CompareView';
import { ControlNetConfig } from './components/ControlNetConfig';
import { DeleteResultButton } from './components/DeleteResultButton';
import { DownloadBatchButton } from './components/DownloadBatchButton';
import { ExtensionManager } from './components/ExtensionManager';
import { FavoritePromptsManager } from './components/FavoritePromptsManager';
import { GenerateButton } from './components/GenerateButton';
import { GenerationCanvas } from './components/GenerationCanvas';
import { GenerationHistoryList } from './components/GenerationHistoryList';
import { GenerationTimeline } from './components/GenerationTimeline';
import { GuidanceScaleSlider } from './components/GuidanceScaleSlider';
import { ImageMetadataInspector } from './components/ImageMetadataInspector';
import { InterruptButton } from './components/InterruptButton';
import { LoraWeightEditor } from './components/LoraWeightEditor';
import { ModelDownloader } from './components/ModelDownloader';
import { ModelInfoCard } from './components/ModelInfoCard';
import { ModelPicker } from './components/ModelPicker';
import { NegativePromptInput } from './components/NegativePromptInput';
import { OutputNamingPattern } from './components/OutputNamingPattern';
import { PerformanceModeToggle } from './components/PerformanceModeToggle';
import { PromptAnalysisPanel } from './components/PromptAnalysisPanel';
import { PromptEditor } from './components/PromptEditor';
import { PromptHistoryTable } from './components/PromptHistoryTable';
import { PromptPresetLibrary } from './components/PromptPresetLibrary';
import { QueuePositionIndicator } from './components/QueuePositionIndicator';
import { SamplerSelector } from './components/SamplerSelector';
import { SeedGenerator } from './components/SeedGenerator';
import { SendToEditorButton } from './components/SendToEditorButton';
import { ShareToGalleryButton } from './components/ShareToGalleryButton';
import { StepSlider } from './components/StepSlider';
import { StudioSettingsPanel } from './components/StudioSettingsPanel';
import { UpscaleControl } from './components/UpscaleControl';
import { VaeSelector } from './components/VaeSelector';
import { VariationGenerator } from './components/VariationGenerator';
import { VramUsageGauge } from './components/VramUsageGauge';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
// [AUTO-GENERATED-IMPORTS-END]
import React, { useState, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Video, Music, Mic, Wand2, Download, Loader2, AlertCircle, Bot } from 'lucide-react';
import { useGeneratorStudio } from '../../components/HamAiStudio/hooks/useGeneratorStudio';
import { useFeatureAgent } from '../../components/HamAiStudio/hooks/useFeatureAgent';
import { GenerationResult } from '../../types/generatorStudio';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const GeneratorStudioContent = () => {
  const { boundInstance } = useFeatureAgent('generator-studio');
  const [prompt, setPrompt] = useState<string>('');
  const [type, setType] = useState<'video' | 'audio' | 'voice'>('video');
  const { generate, generating, result, error } = useGeneratorStudio();

  const handleGenerate = async () => {
    if (!prompt) return;
    try {
      await generate({ prompt, type });
    } catch (err) {
      console.error('Generation failed', err);
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-slate-950 text-slate-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Generator Studio</h1>
          <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400 flex gap-2 items-center">
            <Bot size={12} />
            Agent: The Illusionist
          </Badge>
          {boundInstance && (
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 flex gap-2 items-center">
              <Bot size={12} />
              Legacy: {boundInstance.agent.displayName}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="border-purple-500/50 text-purple-400">Omni-Gen Engine</Badge>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle className="text-sm">Engine Select</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button 
                variant={type === 'video' ? 'default' : 'outline'} 
                className="justify-start gap-2"
                onClick={() => setType('video')}
                disabled={generating}
              >
                <Video className="w-4 h-4" /> Video Morph
              </Button>
              <Button 
                variant={type === 'audio' ? 'default' : 'outline'} 
                className="justify-start gap-2"
                onClick={() => setType('audio')}
                disabled={generating}
              >
                <Music className="w-4 h-4" /> Neural Music
              </Button>
              <Button 
                variant={type === 'voice' ? 'default' : 'outline'} 
                className="justify-start gap-2"
                onClick={() => setType('voice')}
                disabled={generating}
              >
                <Mic className="w-4 h-4" /> Bio-Voice
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle>Prompt Synapse</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Describe your creation in detail..." 
                className="min-h-[150px] bg-slate-800 border-slate-700"
                value={prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                disabled={generating}
              />
              <Button 
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                onClick={handleGenerate}
                disabled={generating || !prompt}
              >
                {generating ? <Loader2 className="animate-spin" /> : <><Wand2 className="w-4 h-4" /> Synthesize</>}
              </Button>
            </CardContent>
          </Card>

          {result ? (
            <Card className="bg-slate-900 border-purple-500/30 animate-in fade-in slide-in-from-bottom-4">
              <CardHeader>
                <CardTitle className="flex justify-between items-center text-sm">
                  <span>Output Ready</span>
                  <Badge variant="default">{(result as GenerationResult).status.toUpperCase()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-md">
                    <Video className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{(result as GenerationResult).type.toUpperCase()} Master Export</p>
                    <p className="text-xs text-slate-400">{(result as GenerationResult).url}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon"><Download className="w-5 h-5" /></Button>
              </CardContent>
            </Card>
          ) : !generating && (
             <div className="flex flex-col items-center justify-center py-10 opacity-20 border-2 border-dashed border-slate-800 rounded-lg">
                <Wand2 size={48} className="mb-2" />
                <p className="text-sm">Synthesizer Idle</p>
             </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-8 opacity-50 border-t border-slate-800 pt-4">
          // [AUTO-GENERATED-COMPONENTS-START]
          <AspectRatioPreview />
          <AutoDownloadToggle />
          <BatchResultGrid />
          <ClearCanvasButton />
          <CompareView />
          <ControlNetConfig />
          <DeleteResultButton />
          <DownloadBatchButton />
          <ExtensionManager />
          <FavoritePromptsManager />
          <GenerateButton />
          <GenerationCanvas />
          <GenerationHistoryList />
          <GenerationTimeline />
          <GuidanceScaleSlider />
          <ImageMetadataInspector />
          <InterruptButton />
          <LoraWeightEditor />
          <ModelDownloader />
          <ModelInfoCard />
          <ModelPicker />
          <NegativePromptInput />
          <OutputNamingPattern />
          <PerformanceModeToggle />
          <PromptAnalysisPanel />
          <PromptEditor />
          <PromptHistoryTable />
          <PromptPresetLibrary />
          <QueuePositionIndicator />
          <SamplerSelector />
          <SeedGenerator />
          <SendToEditorButton />
          <ShareToGalleryButton />
          <StepSlider />
          <StudioSettingsPanel />
          <UpscaleControl />
          <VaeSelector />
          <VariationGenerator />
          <VramUsageGauge />
          <WorkspaceSwitcher />
          // [AUTO-GENERATED-COMPONENTS-END]
        </div>
</div>
  );
};

export const GeneratorStudio = () => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-purple-500" /></div>}>
      <GeneratorStudioContent />
    </Suspense>
  </ErrorBoundary>
);


