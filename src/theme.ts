import { Platform, TextStyle, ViewStyle } from 'react-native';

/** Near-black navy, neon cyan, violet. One accent per meaning, never decorative. */
export const colors = {
  bg: '#05060E',
  bgDeep: '#02030A',
  panel: '#0A0F22',
  panelRaised: '#101733',
  edge: '#1D2750',
  edgeBright: '#2E3D78',

  cyan: '#4FC8E0',
  cyanSoft: '#2A6F82',
  purple: '#9A7BD1',
  purpleSoft: '#4C3A73',

  ok: '#3DFFA2',
  warn: '#FFC24B',
  danger: '#FF3B5C',

  text: '#DCE6FF',
  textDim: '#8496C4',
  textFaint: '#56628C',
} as const;

/** Telemetry is set in a monospace face so digits don't jitter while polling. */
export const fonts = {
  mono: (Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string),
  sans: (Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string),
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/**
 * Global dial on the neon halo — lower it to calm the whole HUD down at once,
 * since every call site passes its own radius and opacity through here. iOS
 * uses a shadow, Android needs elevation for the same read.
 */
const GLOW_SCALE = 0.6;

export const glow = (color: string, r = 12, opacity = 0.7): ViewStyle => ({
  shadowColor: color,
  shadowOpacity: opacity * GLOW_SCALE,
  shadowRadius: r * GLOW_SCALE,
  shadowOffset: { width: 0, height: 0 },
  elevation: Math.max(1, Math.round((r * GLOW_SCALE) / 3)),
});

/** Small uppercase eyebrow used for every panel title and data label. */
export const eyebrow: TextStyle = {
  fontFamily: fonts.sans,
  fontSize: 10,
  letterSpacing: 2.2,
  fontWeight: '700',
  textTransform: 'uppercase',
  color: colors.textFaint,
};

