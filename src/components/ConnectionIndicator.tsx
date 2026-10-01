import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinkState } from '../hooks/useRobotStatus';
import { colors, eyebrow, fonts, glow, radius } from '../theme';

const TONES: Record<LinkState, { color: string; label: string }> = {
  online: { color: colors.ok, label: 'Linked' },
  connecting: { color: colors.warn, label: 'Syncing' },
  offline: { color: colors.danger, label: 'No link' },
};

type Props = { link: LinkState; error?: string | null };

/** Green once /status answered, red after two failed polls; pulses while healthy. */
export const ConnectionIndicator = memo(function ConnectionIndicator({ link, error }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (link !== 'online') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [link, pulse]);

  const tone = TONES[link];

  return (
    <View style={[styles.wrap, { borderColor: tone.color }]}>
      <View style={styles.beacon}>
        <View style={[styles.halo, { backgroundColor: tone.color }]} />
        <Animated.View style={[styles.dot, { backgroundColor: tone.color, opacity: pulse }, glow(tone.color, 10, 0.9)]} />
      </View>
      <View style={styles.textCol}>
        <Text style={[eyebrow, { color: tone.color }]}>{tone.label}</Text>
        {error ? (
          <Text style={styles.error} numberOfLines={1}>
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.bgDeep,
  },
  beacon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 14, height: 14, borderRadius: 7, opacity: 0.18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  textCol: { maxWidth: 150 },
  error: { fontFamily: fonts.mono, fontSize: 9, color: colors.textFaint, marginTop: 2 },
});
