import { memo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Polyline, Stop, Text as SvgText } from 'react-native-svg';
import { HISTORY_SIZE } from '../config';
import { colors, fonts } from '../theme';
import { Panel } from './Panel';

const PAD = { top: 14, right: 34, bottom: 12, left: 8 };
const PLOT_HEIGHT = 92;

/** Last HISTORY_SIZE temperature readings, drawn by hand — no chart dependency. */
export const TempChart = memo(function TempChart({ values }: { values: number[] }) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const ready = values.length >= 2 && width > 60;

  return (
    <Panel title="Temperature trend" sub={`${Math.min(values.length, HISTORY_SIZE)} / ${HISTORY_SIZE}`} accent="purple">
      <View style={styles.plot} onLayout={onLayout}>
        {ready ? <Plot values={values} width={width} /> : <Text style={styles.empty}>Collecting readings…</Text>}
      </View>
    </Panel>
  );
});

function Plot({ values, width }: { values: number[]; width: number }) {
  const lo = Math.min(...values) - 0.6;
  const hi = Math.max(...values) + 0.6;
  const span = hi - lo || 1;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = PLOT_HEIGHT - PAD.top - PAD.bottom;
  const last = values.length - 1;

  const px = (i: number) => PAD.left + (i / last) * innerW;
  const py = (v: number) => PAD.top + (1 - (v - lo) / span) * innerH;
  const floor = PAD.top + innerH;

  const line = values.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const area = `M ${px(0).toFixed(1)} ${floor.toFixed(1)} L ${values
    .map((v, i) => `${px(i).toFixed(1)} ${py(v).toFixed(1)}`)
    .join(' L ')} L ${px(last).toFixed(1)} ${floor.toFixed(1)} Z`;

  return (
    <Svg width={width} height={PLOT_HEIGHT}>
      <Defs>
        <LinearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.cyan} stopOpacity={0.38} />
          <Stop offset="1" stopColor={colors.cyan} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {[0, 0.5, 1].map((t) => (
        <Line
          key={t}
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={PAD.top + t * innerH}
          y2={PAD.top + t * innerH}
          stroke={colors.edge}
          strokeWidth={1}
        />
      ))}

      <Path d={area} fill="url(#tempFill)" />
      <Polyline points={line} fill="none" stroke={colors.cyan} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={px(last)} cy={py(values[last])} r={3.2} fill={colors.cyan} />

      <SvgText x={width - PAD.right + 6} y={PAD.top + 4} fill={colors.textFaint} fontSize={9} fontFamily={fonts.mono}>
        {`${Math.max(...values).toFixed(1)}°`}
      </SvgText>
      <SvgText x={width - PAD.right + 6} y={floor + 3} fill={colors.textFaint} fontSize={9} fontFamily={fonts.mono}>
        {`${Math.min(...values).toFixed(1)}°`}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  plot: { height: PLOT_HEIGHT, justifyContent: 'center' },
  empty: { fontFamily: fonts.mono, fontSize: 11, color: colors.textFaint, textAlign: 'center' },
});
