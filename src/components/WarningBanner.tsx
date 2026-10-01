import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, eyebrow, fonts, glow, radius } from '../theme';

/** Shown the moment the ultrasonic reading drops under the safe distance. */
export const WarningBanner = memo(function WarningBanner({ distance }: { distance: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 620, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const flash = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.32] });

  return (
    <View style={[styles.banner, glow(colors.danger, 16, 0.8)]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
      <View style={styles.glyph}>
        <Text style={styles.glyphText}>{'!'}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[eyebrow, styles.title]}>Obstacle · {Math.round(distance)} cm</Text>
        <Text style={styles.hint}>Stop or reverse now</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'rgba(255,59,92,0.08)',
    overflow: 'hidden',
  },
  flash: { backgroundColor: colors.danger },
  glyph: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: { fontFamily: fonts.mono, fontSize: 16, fontWeight: '700', color: colors.danger },
  copy: { flex: 1 },
  title: { color: colors.danger, fontSize: 11 },
  hint: { fontFamily: fonts.mono, fontSize: 11, color: colors.text, marginTop: 3 },
});
