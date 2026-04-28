export interface Settings {
    layoutMode: string;
    theme: string;
    searchEngine: string;
    defaultBrowser: boolean;
    encryption: boolean;
    antiTracking: boolean;
    gpuAcceleration: boolean;
    doNotTrack: boolean;
    cameraAccess: boolean;
    microphoneAccess: boolean;
    locationAccess: boolean;
    notifications: boolean;
    javascript: boolean;
    popups: boolean;
    developerMode: boolean;
    language: string;
    fontSize: string | number;
    autofillPasswords: boolean;
    autofillAddresses: boolean;
    downloadPath: string;
    askWhereToSave: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    checkUpdates: boolean;
    aiRamLimit: number;
}

export interface ApiKeys {
    gemini: string;
    github: string;
    supabaseUrl: string;
    supabaseKey: string;
}

export interface InstalledBrain {
    name: string;
    size: number;
}

export interface SettingsSectionProps {
    settings: Settings;
    handleSave: (newSettings: Settings) => void;
    toggleSetting: (key: keyof Settings) => void;
    t: (key: string) => string;
}

export interface ApiSectionProps {
    apiKeys: ApiKeys;
    handleApiKeyChange: (key: keyof ApiKeys, value: string) => void;
    saveApiKeys: () => void;
}

export interface BrainSectionProps {
    installedBrain: InstalledBrain | null;
    handleDeleteBrain: () => void;
    handleBrainUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    brainUrl: string;
    setBrainUrl: (url: string) => void;
    isDownloading: boolean;
    isPaused: boolean;
    handlePause: () => void;
    handleResume: () => void;
    handleDownload: () => void;
    downloadProgress: number;
    downloadedBytes: number;
    totalBytes: number;
    downloadSpeed: number;
    error: string | null;
    formatBytes: (bytes: number, decimals?: number) => string;
}

export interface AppearanceSectionProps extends SettingsSectionProps {
    theme: string;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export interface GeneralSectionProps extends SettingsSectionProps {
    language: string;
    setLanguage: (lang: any) => void;
}
