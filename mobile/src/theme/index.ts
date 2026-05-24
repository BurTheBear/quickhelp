export const colors = {
  // Brand — warm brown palette
  primary: '#A0673A',
  primaryLight: '#C49070',
  primaryDark: '#7A4D2A',
  secondary: '#D4A96A',
  secondaryLight: '#E8C99A',
  accent: '#C4936A',
  accentLight: '#E0B890',

  // Urgency levels
  urgencyLow: '#4ECDC4',
  urgencyMedium: '#F6AD55',
  urgencyHigh: '#FC8181',
  urgencyEmergency: '#EF233C',

  // Dark background system
  background: '#0D0B0A',
  surface: '#1A1513',
  card: '#231E1B',
  border: '#2E2521',

  // Text
  text: '#F0EBE5',
  textSecondary: '#C0B5AC',
  textMuted: '#9A8878',

  // Literal white/black (for icons, button text, etc.)
  white: '#FFFFFF',
  black: '#000000',

  // Gray scale — remapped for dark theme
  gray50: '#1A1513',
  gray100: '#231E1B',
  gray200: '#2E2521',
  gray300: '#4A3E37',
  gray400: '#7A6B61',
  gray500: '#9A8878',
  gray600: '#BFB3A8',
  gray700: '#D4CCC6',
  gray800: '#EAE4DF',
  gray900: '#F0EBE5',

  // Semantic
  success: '#48BB78',
  warning: '#F6AD55',
  error: '#FC8181',
  info: '#63B3ED',

  // Category colors
  categories: {
    ELDERLY_ASSISTANCE: '#D4844A',
    TUTORING: '#A0673A',
    FOOD_DELIVERY: '#4ECDC4',
    COMMUNITY_CLEANUP: '#48BB78',
    PET_HELP: '#F6AD55',
    TECH_SUPPORT: '#63B3ED',
    TRANSPORTATION: '#FC8181',
    EMERGENCY: '#EF233C',
    OTHER: '#9A8878',
  } as Record<string, string>,

  // Gamification
  xpGold: '#D4A96A',
  xpBronze: '#A0673A',
  levelBadge: '#A0673A',

  // Legacy (kept for backward compat with screens not yet migrated)
  darkBg: '#0D0B0A',
  darkCard: '#1A1513',
  darkBorder: '#2E2521',
  darkText: '#F0EBE5',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
  screen: 48,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  heading1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  heading4: { fontSize: 18, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySm: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.3 },
  label: { fontSize: 13, fontWeight: '600' as const },
  button: { fontSize: 15, fontWeight: '600' as const, letterSpacing: 0.2 },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  }),
};

export const categoryEmoji: Record<string, string> = {
  ELDERLY_ASSISTANCE: '👴',
  TUTORING: '📚',
  FOOD_DELIVERY: '🍕',
  COMMUNITY_CLEANUP: '🌿',
  PET_HELP: '🐾',
  TECH_SUPPORT: '💻',
  TRANSPORTATION: '🚗',
  EMERGENCY: '🚨',
  OTHER: '🤝',
};

export const categoryLabel: Record<string, string> = {
  ELDERLY_ASSISTANCE: 'Elderly Care',
  TUTORING: 'Tutoring',
  FOOD_DELIVERY: 'Food Delivery',
  COMMUNITY_CLEANUP: 'Cleanup',
  PET_HELP: 'Pet Help',
  TECH_SUPPORT: 'Tech Support',
  TRANSPORTATION: 'Transport',
  EMERGENCY: 'Emergency',
  OTHER: 'Other',
};

export const urgencyConfig = {
  LOW: { label: 'Low Priority', color: colors.urgencyLow, bg: '#0D2B28' },
  MEDIUM: { label: 'Medium Priority', color: colors.urgencyMedium, bg: '#2B1F0A' },
  HIGH: { label: 'High Priority', color: colors.urgencyHigh, bg: '#2B0F0F' },
  EMERGENCY: { label: 'EMERGENCY', color: colors.urgencyEmergency, bg: '#2B0A10' },
};

export const theme = { colors, spacing, radius, typography, shadows };
export default theme;
