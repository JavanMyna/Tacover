import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { MAX_SPEED, MIN_SPEED } from '../config';
import { colors, eyebrow, fonts, glow, radius } from '../theme';
import { Panel } from './Panel';

const TRACK_HEIGHT = 44;
const RAIL_HEIGHT = 8;
const KNOB = 24;
const KEYBOARD_STEP = 5;

type Props = { value: number; onChange: (value: number) => void; disabled?: boolean };

/** Plain PanResponder on purpose: a slider dependency is not worth the weight. */
export const SpeedSlider = memo(function SpeedSlider({ value, onChange, disabled = false }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const applyPosition = useCallback((x: number) => {
    const width = widthRef.current;
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / width));
    onChangeRef.current(Math.round(MIN_SPEED + ratio * (MAX_SPEED - MIN_SPEED)));
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (event) => applyPosition(event.nativeEvent.locationX),
        onPanResponderMove: (event) => applyPosition(event.nativeEvent.locationX),
      }),
    [applyPosition, disabled],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const ratio = (value - MIN_SPEED) / (MAX_SPEED - MIN_SPEED);

  return (
    <Panel title="Speed" sub={`${MIN_SPEED} – ${MAX_SPEED}`} accent="purple">
      <View style={styles.readout}>
        <Text style={[styles.value, { color: disabled ? colors.textDim : colors.cyan }]}>{value}</Text>
        <Text style={styles.unit}>of {MAX_SPEED}</Text>
      </View>

      <View
        style={styles.track}
        onLayout={onLayout}
        accessibilityRole="adjustable"
        accessibilityLabel="Drive speed"
        accessibilityValue={{ min: MIN_SPEED, max: MAX_SPEED, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const delta = event.nativeEvent.actionName === 'increment' ? KEYBOARD_STEP : -KEYBOARD_STEP;
          onChangeRef.current(Math.max(MIN_SPEED, Math.min(MAX_SPEED, value + delta)));
        }}
        {...responder.panHandlers}
      >
        <View pointerEvents="none" style={styles.rail} />
        <View pointerEvents="none" style={[styles.fill, { width: `${ratio * 100}%` }]} />
        <View
          pointerEvents="none"
          style={[styles.knob, { left: ratio * Math.max(0, trackWidth - KNOB) }, glow(colors.cyan, 12, 0.9)]}
        />
      </View>

      <View style={styles.scale}>
        <Text style={eyebrow}>{MIN_SPEED}</Text>
        <Text style={eyebrow}>{MAX_SPEED}</Text>
      </View>
    </Panel>
  );
});

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { fontFamily: fonts.mono, fontSize: 30, fontWeight: '700' },
  unit: { fontFamily: fonts.mono, fontSize: 11, color: colors.textFaint },
  track: { height: TRACK_HEIGHT, marginTop: 6, justifyContent: 'center' },
  rail: {
    height: RAIL_HEIGHT,
    borderRadius: RAIL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.panelRaised,
  },
  fill: {
    position: 'absolute',
    left: 1,
    top: (TRACK_HEIGHT - RAIL_HEIGHT) / 2,
    height: RAIL_HEIGHT,
    borderRadius: RAIL_HEIGHT / 2,
    backgroundColor: colors.cyan,
  },
  knob: {
    position: 'absolute',
    top: (TRACK_HEIGHT - KNOB) / 2,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 2,
    borderColor: colors.cyan,
    backgroundColor: colors.bg,
  },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});
