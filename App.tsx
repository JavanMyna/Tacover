import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView } from './src/components/CameraView';
import { ConnectionIndicator } from './src/components/ConnectionIndicator';
import { DPad } from './src/components/DPad';
import { LivePanel } from './src/components/LivePanel';
import { SpeedSlider } from './src/components/SpeedSlider';
import { StarField } from './src/components/StarField';
import { TempChart } from './src/components/TempChart';
import { DEFAULT_SPEED, USE_MOCK } from './src/config';
import { useDrive } from './src/hooks/useDrive';
import { useRobotStatus } from './src/hooks/useRobotStatus';
import { colors, eyebrow, fonts, radius } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <Cockpit />
    </SafeAreaProvider>
  );
}

function Cockpit() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  const { link, status, history, lastError } = useRobotStatus();
  const drive = useDrive(speed, link);

  const landscape = width > height;

  const telemetry = (
    <>
      <LivePanel status={status} link={link} />
      <TempChart values={history} />
    </>
  );

  const speedControl = <SpeedSlider value={speed} onChange={setSpeed} disabled={!drive.enabled} />;

  const pad = (
    <>
      <DPad active={drive.active} enabled={drive.enabled} onPressIn={drive.press} onPressOut={drive.release} />
      {drive.enabled ? null : <Text style={styles.lockout}>Drive locked · no telemetry link</Text>}
    </>
  );

  return (
    <View style={styles.root}>
      <StarField />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
        ]}
      >
        <View>
          <Text style={styles.brand}>TACOVER</Text>
          <Text style={eyebrow}>Robot cockpit</Text>
        </View>
        <View style={styles.headerRight}>
          {USE_MOCK ? <Text style={styles.mockBadge}>MOCK</Text> : null}
          <ConnectionIndicator link={link} error={lastError} />
        </View>
      </View>

      {landscape ? (
        <View
          style={[
            styles.bodyRow,
            { paddingBottom: insets.bottom + 12, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
          ]}
        >
          <View style={styles.colCamera}>
            <CameraView style={styles.cameraFlex} />
            {speedControl}
          </View>
          <ScrollView
            style={styles.colGrow}
            contentContainerStyle={styles.colContent}
            showsVerticalScrollIndicator={false}
          >
            {telemetry}
          </ScrollView>
          <View style={styles.colCenter}>
            <View style={styles.padSquare}>{pad}</View>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.bodyColumn,
            { paddingBottom: insets.bottom + 24, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CameraView style={styles.cameraPortrait} />
          {telemetry}
          {speedControl}
          <View style={styles.padSquare}>{pad}</View>
        </ScrollView>
      )}

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  brand: {
    fontFamily: fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.text,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mockBadge: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.purple,
    borderWidth: 1,
    borderColor: colors.purple,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  bodyRow: { flex: 1, flexDirection: 'row', gap: 12 },
  bodyColumn: { gap: 12, paddingTop: 4 },

  colCamera: { flex: 1.25, gap: 12 },
  colGrow: { flex: 1 },
  colContent: { gap: 12 },
  colCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  cameraFlex: { flex: 1 },
  cameraPortrait: { height: 230 },
  padSquare: { width: '100%' },

  lockout: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 4,
  },
});
