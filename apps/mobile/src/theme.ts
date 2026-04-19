export const colors = {
  // Primary: Amber-800 terracota
  primary: '#92400E',
  primaryLight: '#FEF3C7',
  primaryDark: '#78350F',
  primaryMuted: '#FDE68A',

  // Secondary: Emerald-900 forest green
  secondary: '#064E3B',
  secondaryLight: '#D1FAE5',
  secondaryDark: '#022C22',
  secondaryMuted: '#A7F3D0',

  // Accent: warm amber for highlights
  accent: '#B45309',
  accentLight: '#FEF9C3',

  // Alerts
  danger: '#B91C1C',
  dangerLight: '#FEE2E2',
  dangerDark: '#991B1B',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  warningDark: '#92400E',

  // Stone neutrals (warm grays)
  background: '#FAFAF9',
  card: '#FFFFFF',
  text: '#1C1917',
  textSecondary: '#78716C',
  border: '#E7E5E4',

  stone50: '#FAFAF9',
  stone100: '#F5F5F4',
  stone200: '#E7E5E4',
  stone300: '#D6D3D1',
  stone400: '#A8A29E',
  stone500: '#78716C',
  stone600: '#57534E',
  stone700: '#44403C',
  stone800: '#292524',
  stone900: '#1C1917',

  // Legacy aliases (kept for compatibility)
  gray50: '#FAFAF9',
  gray100: '#F5F5F4',
  gray200: '#E7E5E4',
  gray300: '#D6D3D1',
  gray400: '#A8A29E',
  gray500: '#78716C',
  gray600: '#57534E',
  gray700: '#44403C',
  gray800: '#292524',
  gray900: '#1C1917',

  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  orange: '#C2410C',
  orangeLight: '#FFEDD5',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
