import { memo } from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

/** Deterministic PRNG so the star map is identical on every launch and platform. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const next = mulberry32(0x5eed1a);

const STAR_TINTS = [colors.text, colors.text, colors.cyan, colors.purple, colors.textDim];

const STARS: { key: number; style: ViewStyle }[] = Array.from({ length: 120 }, (_, i) => {
  const size = next() < 0.82 ? 1 : 2;
  const tint = STAR_TINTS[Math.floor(next() * STAR_TINTS.length)];
  return {
    key: i,
    style: {
      position: 'absolute',
      top: `${Math.round(next() * 1000) / 10}%` as DimensionValue,
      left: `${Math.round(next() * 1000) / 10}%` as DimensionValue,
      width: size,
      height: size,
      borderRadius: size,
      backgroundColor: tint,
      opacity: 0.12 + next() * 0.55,
    },
  };
});

/** Ambient depth only: two off-screen nebulae and a field of fixed stars. */
export const StarField = memo(function StarField() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.nebula, styles.nebulaCyan]} />
      <View style={[styles.nebula, styles.nebulaPurple]} />
      {STARS.map((star) => (
        <View key={star.key} style={star.style} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  nebula: { position: 'absolute', width: 320, height: 320, borderRadius: 160 },
  nebulaCyan: { top: -140, left: -120, backgroundColor: colors.cyan, opacity: 0.05 },
  nebulaPurple: { bottom: -160, right: -130, backgroundColor: colors.purple, opacity: 0.06 },
});
