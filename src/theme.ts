import { Platform, TextStyle, ViewStyle } from 'react-native';

/** Near-black navy, neon cyan, violet. One accent per meaning, never decorative. */
export const colors = {
  bg: '#05060E',
  bgDeep: '#02030A',
  panel: '#0A0F22',
  panelRaised: '#101733',
  edge: '#1D2750',
  edgeBright: '#2E3D78',

  cyan: '#45E0FF',
  cyanSoft: '#1B7E99',
  purple: '#A56BFF',
  purpleSoft: '#573390',

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

/** Neon halo: iOS uses a shadow, Android needs elevation for the same read. */
export const glow = (color: string, r = 14, opacity = 0.75): ViewStyle => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: r,
  shadowOffset: { width: 0, height: 0 },
  elevation: Math.max(2, Math.round(r / 3)),
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

