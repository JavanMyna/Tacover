import { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinkState } from '../hooks/useRobotStatus';
import { RobotStatus } from '../robot/types';
import { colors, eyebrow, fonts } from '../theme';
import { LivePanel } from './LivePanel';
import { Panel } from './Panel';
import { SettingsPanel } from './SettingsPanel';
import { TempChart } from './TempChart';

type Props = {
  open: boolean;
  onClose: () => void;
  cameraVisible: boolean;
  onCameraToggle: (visible: boolean) => void;
  status: RobotStatus | null;
  link: LinkState;
  history: number[];
  /** False → the rover has no camera and no temperature/humidity, so those panels are hidden. */
  mock: boolean;
};

/**
 * Left slide-in drawer holding everything that is not part of driving: the
 * camera switch, telemetry, the temperature chart and the settings form.
 * Slides with a transform (GPU) rather than a layout animation; the backdrop
 * and the Android back button both close it.
 */
export const Drawer = ({ open, onClose, cameraVisible, onCameraToggle, status, link, history, mock }: Props) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const drawerWidth = Math.min(width * 0.8, 360);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 260 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  // Android hardware back closes the drawer before it can leave the app.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth - 24, 0] });

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: drawerWidth,
            paddingTop: insets.top + 14,
            transform: [{ translateX }],
          },
        ]}
      >
        <Text style={[eyebrow, styles.heading]}>Menu</Text>
        <ScrollView
          style={styles.scroller}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          {mock ? (
            <Panel title="Camera" accent="purple">
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={eyebrow}>Show camera</Text>
                  <Text style={styles.hint}>Floating feed over the controls</Text>
                </View>
                <Switch
                  accessibilityLabel="Show camera"
                  value={cameraVisible}
                  onValueChange={onCameraToggle}
                  trackColor={{ false: colors.edge, true: colors.purpleSoft }}
                  thumbColor={cameraVisible ? colors.purple : colors.textDim}
                />
              </View>
            </Panel>
          ) : null}

          <LivePanel status={status} link={link} mock={mock} />
          {mock ? <TempChart values={history} /> : null}
          <SettingsPanel />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(2,3,10,0.66)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bg,
    borderRightWidth: 1,
    borderRightColor: colors.edge,
  },
  heading: { paddingHorizontal: 16, paddingBottom: 10 },
  scroller: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchCopy: { flex: 1, marginRight: 12 },
  hint: { fontFamily: fonts.mono, fontSize: 10, color: colors.textFaint, marginTop: 3 },
});
