import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Ganpro',
  slug: 'ganpro',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A1628',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.ganpro.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#0A1628',
    },
    package: 'com.ganpro.app',
  },
  extra: {
    eas: {
      projectId: 'c2e8d3b8-222e-4018-b1e3-5082fe43bd1b',
    },
  },
  plugins: [
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '15.1' },
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          minSdkVersion: 26,
        },
      },
    ],
    '@morrowdigital/watermelondb-expo-plugin',
    ['expo-av', { microphonePermission: false }],
  ],
});
