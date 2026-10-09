import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinkState } from '../hooks/useRobotStatus';
import { isObstacleNear, RobotStatus } from '../robot/types';
import { colors, eyebrow, fonts } from '../theme';
import { Panel } from './Panel';

type Props = {
  status: RobotStatus | null;
  link: LinkState;
  /** Mock mode is the only car reporting temperature and humidity. */
  mock: boolean;
};

export const LivePanel = memo(function LivePanel({ status, link, mock }: Props) {
  const near = isObstacleNear(status);
  const temperature = status?.temperature ?? null;
  const humidity = status?.humidity ?? null;

  return (
    <View style={styles.wrap}>
      <Panel
        title="Telemetry"
        sub={link === 'online' ? 'live · 0.5 s' : 'no data'}
        accent={near ? 'danger' : 'cyan'}
      >
        {mock ? (
          <>
            <Readout
              label="Temperature"
              value={temperature === null ? '--' : temperature.toFixed(1)}
              unit="°C"
              tone={colors.cyan}
            />
            <View style={styles.sep} />
            <Readout
              label="Humidity"
              value={humidity === null ? '--' : String(Math.round(humidity))}
              unit="%"
              tone={colors.purple}
            />
            <View style={styles.sep} />
          </>
        ) : null}

        <Readout
          label="Obstacle"
          value={status === null || status.distance < 0 ? '--' : String(Math.round(status.distance))}
          unit="cm"
          tone={near ? colors.danger : colors.text}
        />
        <View style={styles.sep} />
        <Readout
          label="Blocked"
          value={status === null ? '--' : status.blocked ? 'YES' : 'NO'}
          tone={status === null ? colors.text : status.blocked ? colors.danger : colors.ok}
        />
        <View style={styles.sep} />
        <Readout label="Left" value={status === null ? '--' : String(Math.round(status.left))} tone={colors.textDim} />
        <View style={styles.sep} />
        <Readout label="Right" value={status === null ? '--' : String(Math.round(status.right))} tone={colors.textDim} />
      </Panel>
    </View>
  );
});

function Readout({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone: string }) {
  return (
    <View style={styles.row}>
      <Text style={eyebrow}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, { color: tone }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
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
