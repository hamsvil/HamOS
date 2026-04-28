import React, { useState, Suspense, useEffect } from 'react';
import { SocialWorkerErrorBoundary } from './ErrorBoundary';
import { useSocialWorker } from '../../components/HamAiStudio/hooks/useSocialWorker';
import { useFeatureAgent } from '../../components/HamAiStudio/hooks/useFeatureAgent';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { 
  Video, Hash, MessageSquare, Pin, Share2, 
  Lock, Unlock, LayoutDashboard, Send, Calendar, BarChart3, Settings, Library, Bot, Loader2,
  Key, Globe, AlertCircle, CheckCircle2
} from 'lucide-react';

// Substitute icons for missing ones
const Twitter = () => <div className="w-5 h-5 flex items-center justify-center font-bold text-white/40">X</div>;
const Facebook = () => <div className="w-5 h-5 flex items-center justify-center font-bold text-white/40">F</div>;
const Instagram = () => <div className="w-5 h-5 flex items-center justify-center font-bold text-white/40">I</div>;
const Linkedin = () => <div className="w-5 h-5 flex items-center justify-center font-bold text-white/40">L</div>;
const Youtube = () => <div className="w-5 h-5 flex items-center justify-center font-bold text-white/40">Y</div>;
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Lazy load components for dashboard
import { PostComposer } from './components/PostComposer';
import { QueueList } from './components/QueueList';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { EngagementChart } from './components/EngagementChart';
import { ContentTemplateLibrary } from './components/ContentTemplateLibrary';
import { PlatformStatusGrid } from './components/PlatformStatusGrid';

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, oauth: true },
  { id: 'facebook', name: 'Facebook', icon: Facebook, oauth: true },
  { id: 'instagram', name: 'Instagram', icon: Instagram, oauth: false },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, oauth: true },
  { id: 'tiktok', name: 'TikTok', icon: Video, oauth: false },
  { id: 'youtube', name: 'YouTube', icon: Youtube, oauth: false },
  { id: 'threads', name: 'Threads', icon: Hash, oauth: false },
  { id: 'reddit', name: 'Reddit', icon: MessageSquare, oauth: false },
  { id: 'pinterest', name: 'Pinterest', icon: Pin, oauth: false },
  { id: 'mastodon', name: 'Mastodon', icon: Share2, oauth: true },
];

const SocialWorkerContent = () => {
  const { boundInstance } = useFeatureAgent('social-worker');
  const [step, setStep] = useState(1);
  const [passphrase, setPassphrase] = useState('');
  const [authMode, setAuthMode] = useState<Record<string, 'key' | 'oauth'>>({});
  const [oauthConfig, setOauthConfig] = useState<Record<string, boolean>>({});
  
  const { 
    selectedPlatforms, 
    setSelectedPlatforms, 
    isLocked, 
    unlock, 
    isLoggingIn,
    saveCredential,
    credentials
  } = useSocialWorker();

  useEffect(() => {
    fetch('/api/social-worker/auth/config')
      .then(res => res.json())
      .then(setOauthConfig)
      .catch(console.error);
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success') === 'true') {
      const platform = params.get('platform');
      const dataBase64 = params.get('data');
      if (platform && dataBase64) {
        try {
          const data = JSON.parse(atob(dataBase64));
          saveCredential({
            id: `${platform}_oauth`,
            platform: platform as any,
            data,
            type: 'oauth'
          }).then(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setStep(4); // Go to dashboard
          });
        } catch (e) {
          console.error('Failed to parse OAuth data', e);
        }
      }
    }
  }, [saveCredential]);

  const handleTogglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id as any)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id as any]);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: // Platform Selector
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">Pilih Platform Auto-Posting</h1>
              <p className="text-[var(--text-secondary)] text-sm">Pilih channel mana saja yang ingin Anda kelola secara otomatis.</p>
            </div>
            
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPlatforms(PLATFORMS.map(p => p.id as any))}
                className="rounded-full border-[#00ffcc]/30 text-[#00ffcc] hover:bg-[#00ffcc]/10"
              >
                All Platforms
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedPlatforms([])}
                className="rounded-full"
              >
                Clear Selection
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPlatforms.includes(p.id as any);
                return (
                  <Card 
                    key={p.id}
                    onClick={() => handleTogglePlatform(p.id)}
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      isSelected 
                        ? 'border-[#00ffcc] bg-[#00ffcc]/5 shadow-[0_0_15px_rgba(0,255,204,0.2)]' 
                        : 'border-white/5 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <CardContent className="p-6 flex flex-col items-center gap-3">
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-[#00ffcc] text-black' : 'bg-white/5 text-white/40'}`}>
                        <Icon size={24} />
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-white/40'}`}>
                        {p.name}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end pt-6">
              <Button 
                disabled={selectedPlatforms.length === 0}
                onClick={() => setStep(2)}
                className="bg-[#00ffcc] text-black hover:bg-[#00ffcc]/90 px-8 py-6 rounded-2xl font-bold shadow-lg shadow-[#00ffcc]/20"
              >
                Lanjutkan Ke Keamanan
              </Button>
            </div>
          </div>
        );

      case 2: // Master Passphrase
        return (
          <Card className="max-w-md mx-auto bg-white/5 border-white/10 backdrop-blur-xl animate-in zoom-in-95 duration-500">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#00ffcc]/10 rounded-full flex items-center justify-center mb-4 border border-[#00ffcc]/20">
                <Lock className="text-[#00ffcc]" size={28} />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Credential Vault</CardTitle>
              <p className="text-xs text-[var(--text-secondary)]">Kredensial Anda dienkripsi end-to-end menggunakan Web Crypto API.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Master Passphrase</label>
                <input 
                  type="password"
                  placeholder="Enter your vault key..."
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00ffcc]/50 transition-colors"
                />
              </div>
              <Button 
                className="w-full bg-[#00ffcc] text-black hover:bg-[#00ffcc]/90 h-12 rounded-xl font-bold"
                onClick={async () => {
                  try {
                    const success = await unlock(passphrase);
                    if (success) setStep(3);
                  } catch (err) {
                    console.error('Failed to unlock vault', err);
                  }
                }}
              >
                {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Unlock Vault'}
              </Button>
              <p className="text-[10px] text-center text-red-400/60 leading-tight">
                Warning: Jangan lupakan passphrase Anda. <br/>Data yang sudah dienkripsi tidak dapat dipulihkan tanpa key ini.
              </p>
            </CardContent>
          </Card>
        );

      case 3: // Login Panel (Multi-login)
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Unlock className="text-[#00ffcc]" size={24} />
                Platform Authentication
              </h2>
              <span className="text-xs text-white/40 font-mono bg-white/5 px-3 py-1 rounded-full border border-white/10">
                Vault Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedPlatforms.map(platform => {
                const config = PLATFORMS.find(p => p.id === platform);
                const Icon = config?.icon || Share2;
                const mode = authMode[platform] || 'oauth';
                const isConfigured = oauthConfig[platform];
                const isConnected = credentials.some(c => c.platform === platform);

                return (
                  <Card key={platform} className="bg-white/5 border-white/10 overflow-hidden group hover:border-[#00ffcc]/30 transition-all">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="text-[#00ffcc]" />
                        <span className="font-bold text-sm text-white">{config?.name}</span>
                      </div>
                      <div className={`flex items-center gap-2`}>
                        {isConnected ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Connected</Badge>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex p-1 bg-black/40 rounded-lg border border-white/5">
                        <button 
                          onClick={() => setAuthMode({...authMode, [platform]: 'oauth'})}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold transition-all ${mode === 'oauth' ? 'bg-[#00ffcc] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                          <Globe size={14} /> Social Account
                        </button>
                        <button 
                          onClick={() => setAuthMode({...authMode, [platform]: 'key'})}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold transition-all ${mode === 'key' ? 'bg-[#00ffcc] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                          <Key size={14} /> Credential Key
                        </button>
                      </div>

                      {mode === 'oauth' ? (
                        <div className="space-y-4">
                          {!isConfigured ? (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
                              <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-bold">
                                <AlertCircle size={14} /> Setup Required
                              </div>
                              <p className="text-[9px] text-white/60 leading-relaxed">
                                OAuth untuk platform ini belum dikonfigurasi. Hubungi administrator untuk mengatur environment variables.
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-white/40 text-center py-2">
                              Klik tombol di bawah untuk login menggunakan akun {config?.name} Anda secara aman.
                            </p>
                          )}
                          <Button 
                            disabled={!isConfigured}
                            onClick={() => window.location.href = `/api/social-worker/auth/${platform}/login`}
                            className={`w-full h-10 font-bold ${isConfigured ? 'bg-white text-black hover:bg-white/90' : 'bg-white/5 text-white/20'}`}
                          >
                            <Icon size={16} className="mr-2" /> 
                            Login with {config?.name}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input placeholder="API Key / Token Name" className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs outline-none text-white" />
                          <textarea placeholder="Access Token / Secret" className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs outline-none text-white min-h-[60px]" />
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              // Simulate save for Mode A
                              saveCredential({
                                id: `${platform}_key`,
                                platform: platform as any,
                                data: { key: 'dummy' },
                                type: 'key'
                              });
                            }}
                            className="w-full h-9 text-xs border-white/10 hover:border-[#00ffcc]/50 hover:bg-[#00ffcc]/5 text-white/60 hover:text-white"
                          >
                            Save Credentials
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-8">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button 
                onClick={() => setStep(4)}
                className="bg-white text-black hover:bg-white/90 px-10 h-12 rounded-xl font-bold"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        );

      case 4: // Dashboard
        return (
          <div className="h-full flex flex-col gap-6 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-white tracking-tighter">SOCIAL WORKER</h1>
                  {boundInstance && (
                    <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 flex gap-2 items-center">
                      <Bot size={12} />
                      Agent: {boundInstance.agent.displayName} @ {boundInstance.ruleset.displayName}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium">Autonomous Content Ecosystem v1.0</p>
              </div>
              <div className="flex items-center gap-2">
                <PlatformStatusGrid />
                <Button size="sm" variant="outline" onClick={() => setStep(1)} className="rounded-full border-white/10 text-white/60 hover:text-white">
                  Reset
                </Button>
              </div>
            </div>

            <Tabs defaultValue="composer" className="flex-1 flex flex-col gap-6">
              <TabsList className="bg-white/5 border border-white/10 p-1 h-12 rounded-2xl w-fit">
                <TabsTrigger value="composer" className="rounded-xl data-[state=active]:bg-[#00ffcc] data-[state=active]:text-black gap-2 px-6">
                  <Send size={16} /> Composer
                </TabsTrigger>
                <TabsTrigger value="queue" className="rounded-xl data-[state=active]:bg-[#00ffcc] data-[state=active]:text-black gap-2 px-6">
                  <LayoutDashboard size={16} /> Queue
                </TabsTrigger>
                <TabsTrigger value="schedule" className="rounded-xl data-[state=active]:bg-[#00ffcc] data-[state=active]:text-black gap-2 px-6">
                  <Calendar size={16} /> Schedule
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-[#00ffcc] data-[state=active]:text-black gap-2 px-6">
                  <BarChart3 size={16} /> Analytics
                </TabsTrigger>
                <TabsTrigger value="templates" className="rounded-xl data-[state=active]:bg-[#00ffcc] data-[state=active]:text-black gap-2 px-6">
                  <Library size={16} /> Templates
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-[#00ffcc] data-[state=active]:text-black gap-2 px-6">
                  <Settings size={16} /> Settings
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0">
                <TabsContent value="composer" className="m-0 h-full">
                  <PostComposer />
                </TabsContent>
                <TabsContent value="queue" className="m-0 h-full">
                  <QueueList />
                </TabsContent>
                <TabsContent value="schedule" className="m-0 h-full">
                  <ScheduleCalendar />
                </TabsContent>
                <TabsContent value="analytics" className="m-0 h-full">
                  <EngagementChart />
                </TabsContent>
                <TabsContent value="templates" className="m-0 h-full">
                  <ContentTemplateLibrary />
                </TabsContent>
                <TabsContent value="settings" className="m-0 h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/10"><CardHeader><CardTitle>App Settings</CardTitle></CardHeader></Card>
                    <Card className="bg-white/5 border-white/10"><CardHeader><CardTitle>Integration Settings</CardTitle></CardHeader></Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-10 h-full bg-[#050505] text-[var(--text-primary)] overflow-y-auto overflow-x-hidden selection:bg-[#00ffcc]/30">
      <div className="max-w-7xl mx-auto h-full">
        {renderStep()}
      </div>
    </div>
  );
};

export const SocialWorker = () => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-[#050505]"><Loader2 className="w-10 h-10 animate-spin text-[#00ffcc]" /></div>}>
      <SocialWorkerContent />
    </Suspense>
  </ErrorBoundary>
);

export default SocialWorker;
