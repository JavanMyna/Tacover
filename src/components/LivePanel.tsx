import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OBSTACLE_WARNING_CM } from '../config';
import { LinkState } from '../hooks/useRobotStatus';
import { RobotStatus } from '../robot/types';
import { colors, eyebrow, fonts } from '../theme';
import { Panel } from './Panel';

type Props = { status: RobotStatus | null; link: LinkState };

export const LivePanel = memo(function LivePanel({ status, link }: Props) {
  const near = status !== null && status.distance <= OBSTACLE_WARNING_CM;
  const stale = status === null;

  return (
    <View style={styles.wrap}>
      <Panel
        title="Telemetry"
        sub={link === 'online' ? 'live · 1 s' : 'no data'}
        accent={near ? 'danger' : 'cyan'}
      >
        <Readout
          label="Temperature"
          value={stale ? '--' : status.temperature.toFixed(1)}
          unit="°C"
          tone={colors.cyan}
        />
        <View style={styles.sep} />
        <Readout
          label="Humidity"
          value={stale ? '--' : String(Math.round(status.humidity))}
          unit="%"
          tone={colors.purple}
        />
        <View style={styles.sep} />
        <Readout
          label="Obstacle"
          value={stale ? '--' : String(Math.round(status.distance))}
          unit="cm"
          tone={near ? colors.danger : colors.text}
        />
      </Panel>
    </View>
  );
});

function Readout({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: string }) {
  return (
    <View style={styles.row}>
      <Text style={eyebrow}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, { color: tone }]}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  valueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontFamily: fonts.mono, fontSize: 22, fontWeight: '600' },
  unit: { fontFamily: fonts.mono, fontSize: 11, color: colors.textFaint },
  sep: { height: 1, backgroundColor: colors.edge, marginVertical: 8, opacity: 0.7 },
});
