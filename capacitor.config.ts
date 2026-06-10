import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thepiecraft.crm',
  appName: 'ThePieCraft CRM',
  webDir: 'capacitor-app',
  server: {
    url: process.env.CAP_SERVER_URL || 'https://thepiecraft-crm.vercel.app',
    cleartext: true,
    allowNavigation: ['*'],
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#080d1e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#3a58e8',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080d1e',
      overlaysWebView: false,
    },
  },
};

export default config;
