import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.finance',
  appName: 'Lumina',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
