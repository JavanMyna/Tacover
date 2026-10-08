import { memo, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  CAMERA_BOX_ASPECT,
  CAMERA_BOX_MAX_HEIGHT_RATIO,
  CAMERA_BOX_MAX_WIDTH_RATIO,
  CAMERA_BOX_MIN_WIDTH,
} from '../config';
import { sizeFromWidth, useSettings } from '../settings';
import { colors, glow, radius } from '../theme';
import { CameraView } from './CameraView';

type Props = {
  visible: boolean;
  /** Distance from the top of the screen, already clear of the header. */
  top: number;
  right: number;
};

/**
 * The camera feed as a small floating window pinned to the top-right. Drag the
 * bottom-left corner to resize (aspect locked); the padlock freezes the size.
 * Sized within caps so it can never reach the D-pad or the speed slider, and
 * wrapped in a `box-none` container so everything around it stays tappable.
 */
export const FloatingCamera = memo(function FloatingCamera({ visible, top, right }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { cameraBoxSize, cameraSizeLocked, update } = useSettings();

  const maxWidth = Math.min(
    screenWidth * CAMERA_BOX_MAX_WIDTH_RATIO,
    screenHeight * CAMERA_BOX_MAX_HEIGHT_RATIO * CAMERA_BOX_ASPECT,
  );
  const minWidth = Math.min(CAMERA_BOX_MIN_WIDTH, maxWidth);
  const clamp = (value: number) => Math.max(minWidth, Math.min(maxWidth, value));

  const width = clamp(cameraBoxSize.width);
  // During a drag the size lives here, so the persisted value only changes once.
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const shownWidth = clamp(liveWidth ?? width);

  const widthRef = useRef(width);
  const liveRef = useRef<number | null>(null);
  const startRef = useRef(0);
  widthRef.current = width;

  const responder = useMemo(
    () => {
      // Used by both release and terminate: the size the user dragged to is
      // kept even if the gesture is interrupted (React Native Web ends a
      // mousedown drag whose release lands outside the moving handle with
      // onPanResponderTerminate rather than onPanResponderRelease).
      const commit = () => {
        const next = liveRef.current;
        liveRef.current = null;
        setLiveWidth(null);
        if (next !== null) update({ cameraBoxSize: sizeFromWidth(next) });
      };

      return PanResponder.create({
        onStartShouldSetPanResponder: () => !cameraSizeLocked,
        onMoveShouldSetPanResponder: () => !cameraSizeLocked,
        // Never hand the responder away mid-resize.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRef.current = widthRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          // Bottom-left corner: dragging left grows the box, right shrinks it.
          const next = Math.max(minWidth, Math.min(maxWidth, startRef.current - gesture.dx));
          liveRef.current = next;
          setLiveWidth(next);
        },
        onPanResponderRelease: commit,
        onPanResponderTerminate: commit,
      });
    },
    [cameraSizeLocked, minWidth, maxWidth, update],
  );

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { top, right }]}>
      <View
        style={[
          styles.box,
          { width: shownWidth, height: shownWidth / CAMERA_BOX_ASPECT },
          glow(colors.purple, 16, 0.7),
        ]}
      >
        <CameraView style={styles.feed} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cameraSizeLocked ? 'Unlock camera size' : 'Lock camera size'}
          accessibilityState={{ selected: cameraSizeLocked }}
          onPress={() => update({ cameraSizeLocked: !cameraSizeLocked })}
          hitSlop={6}
          style={({ pressed }) => [styles.lock, pressed && styles.lockPressed]}
        >
          <LockIcon locked={cameraSizeLocked} />
        </Pressable>

        {cameraSizeLocked ? null : (
          <View
            accessibilityRole="adjustable"
            accessibilityLabel="Resize camera"
            {...responder.panHandlers}
            style={styles.handle}
          >
            {/* pointerEvents none: the icon must never be the drag target. */}
            <Svg pointerEvents="none" width={14} height={14} viewBox="0 0 14 14">
              <Path
                d="M2 12 L12 2 M2 7 L7 2"
                fill="none"
                stroke={colors.textDim}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </Svg>
          </View>
        )}
      </View>
    </View>
  );
});

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20">
      <Rect
        x={4}
        y={9}
        width={12}
        height={8}
        rx={1.6}
        fill="none"
        stroke={locked ? colors.purple : colors.textDim}
        strokeWidth={1.6}
      />
      <Path
        d={locked ? 'M6.8 9 V6.6 a3.2 3.2 0 0 1 6.4 0 V9' : 'M6.8 9 V6.6 a3.2 3.2 0 0 1 6.4 0'}
        fill="none"
        stroke={locked ? colors.purple : colors.textDim}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute' },
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edgeBright,
    backgroundColor: colors.bgDeep,
    overflow: 'hidden',
  },
  feed: { flex: 1 },
  lock: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: 'rgba(2,3,10,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockPressed: { borderColor: colors.purple },
  handle: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    // Generous hit area: an aspect-locked box pulls this corner upwards as it
    // shrinks, so the gesture must survive the pointer drifting off the icon.
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 4,
    paddingBottom: 4,
  },
});
