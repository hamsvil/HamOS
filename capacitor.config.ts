import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hamaistudio.app',
  appName: 'Ham AiStudio',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowMixedContent: true,
    // url: 'https://ham-aistudio.replit.app', // Uncomment after deploy for hybrid mode
    // cleartext: false
  }
};

export default config;
