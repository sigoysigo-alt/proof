export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E4E7EC',
  textPrimary: '#111318',
  textSecondary: '#5B6472',
  textMuted: '#8A93A2',
  brand: '#1E5EFF',
  brandPressed: '#173FBF',
  onBrand: '#FFFFFF',
  demo: '#7A4DFF',
  demoBackground: '#F1ECFF',
  riskLegitimate: '#1C8A4B',
  riskLegitimateBg: '#E7F6ED',
  riskCaution: '#B7791F',
  riskCautionBg: '#FDF3DC',
  riskHigh: '#C4302B',
  riskHighBg: '#FBE7E6',
  riskUnverifiable: '#5B6472',
  riskUnverifiableBg: '#EEF0F3',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  title: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
};
