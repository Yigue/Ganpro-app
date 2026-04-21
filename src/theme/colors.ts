/**
 * High-contrast dark palette for outdoor field use.
 * Minimum contrast ratio: 7:1 (WCAG AAA) for primary text.
 * All interactive touch targets: minimum 56px height.
 */
export const colors = {
  // Backgrounds
  background: '#0A1628',       // Deep navy — reduces glare in sun
  surface: '#142236',          // Card/sheet background
  surfaceElevated: '#1E3248',  // Modal, bottom sheet

  // Brand
  primary: '#00D68F',          // Bright teal — high contrast on dark
  primaryDark: '#00A36B',
  primaryLight: '#4DFFC0',

  // Feedback
  success: '#00D68F',
  error: '#FF3D71',
  warning: '#FFAA00',
  info: '#0095FF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textDisabled: '#4A5568',
  textOnPrimary: '#001F0F',    // Dark text on bright teal buttons

  // Borders
  border: '#2D4A6A',
  borderFocus: '#00D68F',

  // Scan feedback overlay
  scanSuccess: 'rgba(0, 214, 143, 0.15)',
  scanError: 'rgba(255, 61, 113, 0.15)',

  // Semantic alpha variants (use instead of inline rgba)
  primaryAlpha: 'rgba(0, 214, 143, 0.12)',
  errorAlpha:   'rgba(255, 61, 113, 0.12)',
  warningAlpha: 'rgba(255, 170, 0, 0.12)',
  infoAlpha:    'rgba(0, 149, 255, 0.12)',
  purple:       '#C35BD0',
  purpleAlpha:  'rgba(195, 91, 208, 0.12)',

  // Category badge colors
  category: {
    Ternero: '#FFAA00',
    Ternera: '#FF6B9D',
    Vaca: '#C35BD0',
    Toro: '#0095FF',
    Vaquillona: '#FF78A4',
    Novillo: '#00B4D8',
  },
} as const;
