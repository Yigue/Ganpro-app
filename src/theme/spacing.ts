/** 8px base grid. Touch targets: minimum 56px (7 units). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  touchTarget: 56,    // Minimum tappable height per WCAG
  touchTargetLg: 72,  // Large action buttons (field use with gloves)
} as const;
