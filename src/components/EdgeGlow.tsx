import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '../theme';

/**
 * Obstacle proximity warning: a soft red band hugging the screen edges. It is
 * a calm fade rather than a flash, never intercepts touches, and stays on
 * screen whether the drawer is open or closed.
 *
 * Drawn as three stacked rims instead of an inner shadow — React Native has no
 * inset shadow, and layering border widths gives the same soft band on both
 * platforms without a gradient dependency.
 */
export const EdgeGlow = memo(function EdgeGlow({ active }: { active: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: active ? 1 : 0,
      duration: active ? 450 : 650,
      useNativeDriver: true,
    }).start();
  }, [active, fade]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outer]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.mid]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inner]} />
    </Animated.View>
  );
});

const RIM = colors.danger;

const styles = StyleSheet.create({
  outer: { borderWidth: 20, borderColor: RIM, borderRadius: 30, opacity: 0.09 },
  mid: { borderWidth: 10, borderColor: RIM, borderRadius: 24, opacity: 0.15 },
  inner: { borderWidth: 3, borderColor: RIM, borderRadius: 20, opacity: 0.36 },
});
