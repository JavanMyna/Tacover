import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_SETTINGS, isIpv4, useSettings } from '../settings';
import { colors, eyebrow, fonts, radius } from '../theme';
import { Panel } from './Panel';

/** Robot address, mock mode, the reset to config defaults, and (mock only) the camera address. */
export function SettingsPanel() {
  const { robotIp, cameraIp, useMock, update, reset } = useSettings();
  // Local drafts so a half-typed address is visible without being saved.
  const [robotDraft, setRobotDraft] = useState(robotIp);
  const [cameraDraft, setCameraDraft] = useState(cameraIp);

  useEffect(() => setRobotDraft(robotIp), [robotIp]);
  useEffect(() => setCameraDraft(cameraIp), [cameraIp]);

  const onRobot = (value: string) => {
    setRobotDraft(value);
    if (isIpv4(value)) update({ robotIp: value.trim() });
  };

  const onCamera = (value: string) => {
    setCameraDraft(value);
    if (isIpv4(value)) update({ cameraIp: value.trim() });
  };

  return (
    <Panel title="Settings" accent="cyan">
      <IpField label="Robot IP" value={robotDraft} onChangeText={onRobot} valid={isIpv4(robotDraft)} />
      {useMock ? (
        <IpField label="Camera IP" value={cameraDraft} onChangeText={onCamera} valid={isIpv4(cameraDraft)} />
      ) : null}

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={eyebrow}>Mock mode</Text>
          <Text style={styles.hint}>{useMock ? 'Fake car, no network' : 'Real rover over Wi-Fi'}</Text>
        </View>
        <Switch
          accessibilityLabel="Mock mode"
          value={useMock}
          onValueChange={(value) => update({ useMock: value })}
          trackColor={{ false: colors.edge, true: colors.cyanSoft }}
          thumbColor={useMock ? colors.cyan : colors.textDim}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={reset}
        style={({ pressed }) => [styles.reset, pressed && styles.resetPressed]}
      >
        <Text style={styles.resetText}>Reset to defaults</Text>
      </Pressable>
      <Text style={styles.hint}>
        {`Defaults · ${DEFAULT_SETTINGS.robotIp} · ${DEFAULT_SETTINGS.cameraIp} · mock ${
          DEFAULT_SETTINGS.useMock ? 'on' : 'off'
        }`}
      </Text>
    </Panel>
  );
}

function IpField({
  label,
  value,
  onChangeText,
  valid,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  valid: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={eyebrow}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        inputMode="decimal"
        placeholder="0.0.0.0"
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        style={[styles.input, valid ? null : styles.inputInvalid]}
      />
      {valid ? null : <Text style={styles.error}>Enter an IPv4 address, e.g. 192.168.4.1</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  input: {
    marginTop: 6,
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bgDeep,
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  inputInvalid: { borderColor: colors.danger },
  error: { fontFamily: fonts.mono, fontSize: 10, color: colors.danger, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  switchCopy: { flex: 1, marginRight: 12 },
  hint: { fontFamily: fonts.mono, fontSize: 10, color: colors.textFaint, marginTop: 3 },
  reset: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.edgeBright,
    backgroundColor: colors.panelRaised,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  resetPressed: { borderColor: colors.cyan, backgroundColor: 'rgba(79,200,224,0.12)' },
  resetText: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: colors.text },
});
