import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DriveDir } from '../robot/types';
import { colors, fonts, glow, radius } from '../theme';

const CHEVRONS: Record<DriveDir, string> = {
  F: 'M7 16 L15 8 L23 16',
  B: 'M7 14 L15 22 L23 14',
  L: 'M16 7 L8 15 L16 23',
  R: 'M14 7 L22 15 L14 23',
};

const LABELS: Record<DriveDir, string> = { F: 'Forward', B: 'Reverse', L: 'Left', R: 'Right' };

type Props = {
  active: DriveDir | null;
  enabled: boolean;
  onPressIn: (dir: DriveDir) => void;
  onPressOut: () => void;
};

/**
 * Hold a button to drive: the press fires immediately and repeats until
 * release. The hub echoes the direction the car was last told to take.
 */
export const DPad = memo(function DPad({ active, enabled, onPressIn, onPressOut }: Props) {
  const cell = (dir: DriveDir) => (
    <View style={styles.cell}>
      <DirButton dir={dir} active={active === dir} disabled={!enabled} onPressIn={onPressIn} onPressOut={onPressOut} />
    </View>
  );

  return (
    <View style={styles.pad}>
      <View style={styles.row}>
        <View style={styles.cell} />
        {cell('F')}
        <View style={styles.cell} />
      </View>
      <View style={styles.row}>
        {cell('L')}
        <View style={styles.cell}>
          <View style={[styles.hub, active !== null && styles.hubActive]}>
            <Text style={[styles.hubText, active !== null && styles.hubTextActive]}>{active ?? 'S'}</Text>
          </View>
        </View>
        {cell('R')}
      </View>
      <View style={styles.row}>
        <View style={styles.cell} />
        {cell('B')}
        <View style={styles.cell} />
      </View>
    </View>
  );
});

function DirButton({
  dir,
  active,
  disabled,
  onPressIn,
  onPressOut,
}: {
  dir: DriveDir;
  active: boolean;
  disabled: boolean;
  onPressIn: (dir: DriveDir) => void;
  onPressOut: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LABELS[dir]}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPressIn={() => onPressIn(dir)}
      onPressOut={onPressOut}
      style={[styles.btn, active && styles.btnActive, active && glow(colors.cyan, 18, 0.95), disabled && styles.btnDisabled]}
    >
      <Svg width={34} height={34} viewBox="0 0 30 30">
        <Path
          d={CHEVRONS[dir]}
          fill="none"
          stroke={active ? colors.cyan : colors.textDim}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { width: '100%', aspectRatio: 1 },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, padding: 4 },
  btn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edgeBright,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: { backgroundColor: 'rgba(69,224,255,0.16)', borderColor: colors.cyan },
  btnDisabled: { opacity: 0.3 },
  hub: {
    flex: 1,
    margin: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubActive: { borderColor: colors.purple, backgroundColor: 'rgba(165,107,255,0.12)' },
  hubText: { fontFamily: fonts.mono, fontSize: 20, fontWeight: '700', color: colors.textFaint },
  hubTextActive: { color: colors.purple },
});
