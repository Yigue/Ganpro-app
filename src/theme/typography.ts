import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  sizes: {
    xs: 11,
    sm: 13,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 48, // Large RFID display number
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;
