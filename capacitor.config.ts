import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAP_SERVER_URL || 'https://crm.thepiecraftmarketing.com';
const parsedServerUrl = new URL(serverUrl);
if (parsedServerUrl.protocol !== 'https:') {
  throw new Error('CAP_SERVER_URL must use HTTPS.');
}

const config: CapacitorConfig = {
  appId: 'com.iranikoyla.os',
  appName: 'Irani Koyla OS',
  webDir: 'capacitor-app',
  server: {
    url: parsedServerUrl.toString(),
    cleartext: false,
    allowNavigation: [parsedServerUrl.hostname],
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#080d1e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080d1e',
      overlaysWebView: false,
    },
    LocalNotifications: {
      iconColor: '#3a58e8',
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
