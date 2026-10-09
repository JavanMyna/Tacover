import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Drawer } from './src/components/Drawer';
import { DPad } from './src/components/DPad';
import { EdgeGlow } from './src/components/EdgeGlow';
import { FloatingCamera } from './src/components/FloatingCamera';
import { HamburgerButton } from './src/components/HamburgerButton';
import { SpeedSlider } from './src/components/SpeedSlider';
import { StarField } from './src/components/StarField';
import { StatusDot } from './src/components/StatusDot';
import { DEFAULT_SPEED } from './src/config';
import { useDrive } from './src/hooks/useDrive';
import { useRobotStatus } from './src/hooks/useRobotStatus';
import { isObstacleNear } from './src/robot/types';
import { SettingsProvider, useSettings } from './src/settings';
import { colors, fonts } from './src/theme';

/** Height of the top row (hamburger + status dot); safe-area padding is added on top. */
const HEADER_HEIGHT = 48;

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Cockpit />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function Cockpit() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [menuOpen, setMenuOpen] = useState(false);
  // Off on every launch — deliberately not persisted.
  const [cameraVisible, setCameraVisible] = useState(false);

  const { useMock } = useSettings();
  const { link, status, history } = useRobotStatus();
  const drive = useDrive(speed, link);
  const { stop } = drive;

  // Opening the drawer is a safety stop, like releasing the pad or losing the link.
  useEffect(() => {
    if (menuOpen) stop();
  }, [menuOpen, stop]);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const landscape = width > height;
  const headerHeight = insets.top + 8 + HEADER_HEIGHT;
  const bodyWidth = width - insets.left - insets.right - 32;
  const bodyHeight = height - headerHeight - insets.bottom - 12;
  const padSide = Math.round(
    landscape ? Math.min(bodyWidth * 0.5, bodyHeight) : Math.min(bodyWidth, bodyHeight * 0.55),
  );

  // The rover decides this: its blocked flag, or a range inside the warning band.
  const near = isObstacleNear(status);

  return (
    <View style={styles.root}>
      <StarField />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
        ]}
      >
        <HamburgerButton onPress={openMenu} />
        <StatusDot link={link} />
      </View>

      <View
        style={[
          styles.body,
          landscape ? styles.bodyLandscape : styles.bodyPortrait,
          { paddingBottom: insets.bottom + 12, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
        ]}
      >
        <View style={landscape ? styles.speedLandscape : styles.speedPortrait}>
          <SpeedSlider value={speed} onChange={setSpeed} disabled={!drive.enabled} />
        </View>

        <View style={styles.padWrap}>
          <View style={{ width: padSide }}>
            <DPad
              active={drive.active}
              enabled={drive.enabled}
              onPressIn={drive.press}
              onPressOut={drive.release}
            />
            {drive.enabled ? null : <Text style={styles.lockout}>Drive locked · no telemetry link</Text>}
          </View>
        </View>
      </View>

      {/* The rover has no camera yet, so the box exists in mock mode only. */}
      <FloatingCamera visible={useMock && cameraVisible} top={headerHeight + 4} right={insets.right + 12} />

      <Drawer
        open={menuOpen}
        onClose={closeMenu}
        cameraVisible={cameraVisible}
        onCameraToggle={setCameraVisible}
        status={status}
        link={link}
        history={history}
        mock={useMock}
      />

      {/* Above everything, but never in front of a touch. */}
      <EdgeGlow active={near} />

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { flex: 1 },
  bodyLandscape: { flexDirection: 'row', gap: 16 },
  bodyPortrait: { flexDirection: 'column', gap: 12 },
  speedLandscape: { flex: 1, maxWidth: 380, justifyContent: 'center' },
  speedPortrait: { width: '100%' },
  padWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lockout: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 4,
  },
});
