import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.finova.finance',
  appName: 'Finova',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost'
  }
};

export default config;
