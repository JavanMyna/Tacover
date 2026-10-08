import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinkState } from '../hooks/useRobotStatus';
import { colors, glow } from '../theme';

const TONES: Record<LinkState, string> = {
  online: colors.ok,
  connecting: colors.warn,
  offline: colors.danger,
};

const LABELS: Record<LinkState, string> = {
  online: 'Linked',
  connecting: 'Syncing',
  offline: 'No link',
};

/** Link beacon: green while /status answers, red once the link is dead. No text. */
export const StatusDot = memo(function StatusDot({ link }: { link: LinkState }) {
  const color = TONES[link];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={LABELS[link]}
      pointerEvents="none"
      style={styles.wrap}
    >
      <View style={[styles.halo, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }, glow(color, 12, 0.8)]} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 18, height: 18, borderRadius: 9, opacity: 0.14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
