// src/theme/index.js — SurveySnap Pro Design System
// Aesthetic: Precision Instrument — Leica / Carl Zeiss optics meets field tech

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg:            '#06080F',   // deep space navy
  surface:       '#0C1220',   // slightly lifted
  card:          '#111827',   // card base
  cardHover:     '#1A2538',   // card elevated
  border:        'rgba(56, 139, 255, 0.15)',
  borderSubtle:  'rgba(255,255,255,0.06)',
  borderStrong:  'rgba(56, 139, 255, 0.35)',

  // ── Electric Blue Palette ─────────────────────────────────────────────────
  blue:          '#2563EB',   // primary action
  blueLight:     '#3B82F6',   // hover / lighter
  blueDim:       '#1D4ED8',   // pressed
  blueGlow:      'rgba(37, 99, 235, 0.25)',
  blueShimmer:   'rgba(37, 99, 235, 0.10)',
  blueTrace:     'rgba(37, 99, 235, 0.06)',

  // ── Accent ────────────────────────────────────────────────────────────────
  cyan:          '#22D3EE',   // location ping / GPS
  cyanDim:       'rgba(34, 211, 238, 0.15)',
  amber:         '#F59E0B',   // warnings / watermark
  amberDim:      'rgba(245, 158, 11, 0.15)',
  green:         '#10B981',   // success / saved
  greenDim:      'rgba(16, 185, 129, 0.12)',
  red:           '#EF4444',   // delete

  // ── Typography ────────────────────────────────────────────────────────────
  textPrimary:   '#F0F4FF',
  textSecondary: '#8FA3BF',
  textMuted:     '#455368',
  textInverse:   '#06080F',

  // ── Gradients ─────────────────────────────────────────────────────────────
  gradBlue:      ['#2563EB', '#1D4ED8'],
  gradDark:      ['#0C1220', '#06080F'],
  gradCard:      ['#1A2538', '#111827'],
  gradOverlay:   ['transparent', 'rgba(6,8,15,0.97)'],
  gradCamera:    ['rgba(6,8,15,0.85)', 'transparent'],
  gradCameraBot: ['transparent', 'rgba(6,8,15,0.92)'],
};

export const Typography = {
  // Cormorant Garant — optical/scientific feel (used by luxury optics brands)
  display: {
    fontFamily: 'CormorantGarant_700Bold',
    letterSpacing: 1,
  },
  displayItalic: {
    fontFamily: 'CormorantGarant_700Bold_Italic',
  },
  heading: {
    fontFamily: 'CormorantGarant_600SemiBold',
    letterSpacing: 0.5,
  },

  // Nunito — clean, slightly rounded, highly readable on mobile
  uiBold: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.3,
  },
  ui: {
    fontFamily: 'Nunito_600SemiBold',
    letterSpacing: 0.2,
  },
  uiLight: {
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 0.1,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 0.4,
  },
  mono: {
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 1.2,
  },
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
};

export const Radii = {
  sm:     4,
  md:     8,
  lg:     14,
  xl:     20,
  pill:   100,
  circle: 9999,
};

export const Shadow = {
  blue: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};
