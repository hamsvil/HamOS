// [AUTO-GENERATED-IMPORTS-START]
import { AspectRatioSwitcher } from './components/AspectRatioSwitcher';
import { AutoSaveToggle } from './components/AutoSaveToggle';
import { BurstShotButton } from './components/BurstShotButton';
import { BurstShotGallery } from './components/BurstShotGallery';
import { CameraDevicePicker } from './components/CameraDevicePicker';
import { CameraSettingsDrawer } from './components/CameraSettingsDrawer';
import { ExposureLockToggle } from './components/ExposureLockToggle';
import { ExposureSlider } from './components/ExposureSlider';
import { FaceDetectionBox } from './components/FaceDetectionBox';
import { FilterPackSelector } from './components/FilterPackSelector';
import { FlashModeToggle } from './components/FlashModeToggle';
import { FlipCameraButton } from './components/FlipCameraButton';
import { FocusLockToggle } from './components/FocusLockToggle';
import { FocusModeSelector } from './components/FocusModeSelector';
import { FrameRatePicker } from './components/FrameRatePicker';
import { GalleryQuickAccess } from './components/GalleryQuickAccess';
import { GridOverlayControl } from './components/GridOverlayControl';
import { HighQualityModeSwitch } from './components/HighQualityModeSwitch';
import { HistogramOverlay } from './components/HistogramOverlay';
import { ISOSelector } from './components/ISOSelector';
import { LastCapturePreview } from './components/LastCapturePreview';
import { LivePreviewViewport } from './components/LivePreviewViewport';
import { MotionDetectionIndicator } from './components/MotionDetectionIndicator';
import { PhotoVideoHistory } from './components/PhotoVideoHistory';
import { RawOutputToggle } from './components/RawOutputToggle';
import { RecordToggleButton } from './components/RecordToggleButton';
import { RecordingTimeDisplay } from './components/RecordingTimeDisplay';
import { ResetSettingsButton } from './components/ResetSettingsButton';
import { SensorHealthBadge } from './components/SensorHealthBadge';
import { ShutterButton } from './components/ShutterButton';
import { StorageCapacityMeter } from './components/StorageCapacityMeter';
import { TimerSelector } from './components/TimerSelector';
import { WatermarkEditor } from './components/WatermarkEditor';
import { WhiteBalanceToggle } from './components/WhiteBalanceToggle';
import { ZoomSlider } from './components/ZoomSlider';
// [AUTO-GENERATED-IMPORTS-END]
import React, { useRef, useEffect, Suspense } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Camera, Zap, Shield, Eye, Bot, Loader2, AlertCircle } from 'lucide-react';
import { useHCamera } from '../../components/HamAiStudio/hooks/useHCamera';
import { useFeatureAgent } from '../../components/HamAiStudio/hooks/useFeatureAgent';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const HCameraContent = () => {
  const { boundInstance } = useFeatureAgent('h-camera');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { active, mode, loading, error, toggleActive, setMode, setError } = useHCamera();

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (active && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          currentStream = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => {
          let msg = "Camera access denied";
          if (err.name === 'NotAllowedError') msg = "Camera permission denied";
          else if (err.name === 'NotFoundError') msg = "No camera hardware found";
          else if (err.name === 'NotReadableError') msg = "Camera is already in use";
          
          setError(msg);
          if (active) toggleActive();
        });
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [active, toggleActive, setError]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      <div className="absolute top-4 left-4 z-10 flex gap-2 items-center">
        <Badge variant="secondary" className="bg-black/50 backdrop-blur border-slate-700">H_CAMERA V7.2</Badge>
        {active && !loading && <Badge className="bg-red-500 animate-pulse">LIVE</Badge>}
        {loading && <Badge className="bg-blue-500 animate-pulse flex gap-1 items-center"><Loader2 className="w-3 h-3 animate-spin" /> SYNCING</Badge>}
        {boundInstance && (
          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 flex gap-2 items-center backdrop-blur">
            <Bot size={12} />
            Agent: {boundInstance.agent.displayName} @ {boundInstance.ruleset.displayName}
          </Badge>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {error && (
          <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
            <h3 className="text-white font-bold mb-1">System Error</h3>
            <p className="text-slate-400 text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}

        {active ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transition-all duration-500 ${
              loading ? 'opacity-50 grayscale' : ''
            } ${
              mode === 'quantum' ? 'grayscale contrast-200 hue-rotate-90' : 
              mode === 'eraser' ? 'blur-sm brightness-150' : ''
            }`}
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center gap-4">
            <Camera className="w-16 h-16 opacity-20" />
            <p>Optics System Offline</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-6 bg-slate-900/80 backdrop-blur border-t border-slate-800 flex flex-wrap justify-center gap-4">
        <div className="flex gap-2">
          <Button 
            variant={mode === 'normal' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setMode('normal')}
            className="gap-2"
            disabled={!active || loading}
          >
            <Eye className="w-4 h-4" /> Normal
          </Button>
          <Button 
            variant={mode === 'quantum' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setMode('quantum')}
            className="gap-2"
            disabled={!active || loading}
          >
            <Zap className="w-4 h-4" /> Quantum
          </Button>
          <Button 
            variant={mode === 'eraser' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setMode('eraser')}
            className="gap-2"
            disabled={!active || loading}
          >
            <Shield className="w-4 h-4" /> Eraser
          </Button>
        </div>
        <div className="hidden sm:block w-px h-8 bg-slate-700 mx-2" />
        <Button 
          variant={active ? 'destructive' : 'default'}
          onClick={() => toggleActive()}
          className="min-w-[140px]"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {active ? 'Disable System' : 'Enable System'}
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-8 opacity-50 border-t border-slate-800 pt-4">
          // [AUTO-GENERATED-COMPONENTS-START]
          <AspectRatioSwitcher />
          <AutoSaveToggle />
          <BurstShotButton />
          <BurstShotGallery />
          <CameraDevicePicker />
          <CameraSettingsDrawer />
          <ExposureLockToggle />
          <ExposureSlider />
          <FaceDetectionBox />
          <FilterPackSelector />
          <FlashModeToggle />
          <FlipCameraButton />
          <FocusLockToggle />
          <FocusModeSelector />
          <FrameRatePicker />
          <GalleryQuickAccess />
          <GridOverlayControl />
          <HighQualityModeSwitch />
          <HistogramOverlay />
          <ISOSelector />
          <LastCapturePreview />
          <LivePreviewViewport />
          <MotionDetectionIndicator />
          <PhotoVideoHistory />
          <RawOutputToggle />
          <RecordToggleButton />
          <RecordingTimeDisplay />
          <ResetSettingsButton />
          <SensorHealthBadge />
          <ShutterButton />
          <StorageCapacityMeter />
          <TimerSelector />
          <WatermarkEditor />
          <WhiteBalanceToggle />
          <ZoomSlider />
          // [AUTO-GENERATED-COMPONENTS-END]
        </div>
</div>
  );
};

export const HCamera = () => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-black"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>}>
      <HCameraContent />
    </Suspense>
  </ErrorBoundary>
);


