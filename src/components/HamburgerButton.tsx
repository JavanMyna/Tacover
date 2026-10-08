import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '../theme';

/** Opens the settings drawer. Three stacked rules, sized for a comfortable tap. */
export const HamburgerButton = memo(function HamburgerButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Path
          d="M4 7 H22 M4 13 H22 M4 19 H22"
          fill="none"
          stroke={colors.text}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.panelRaised, borderColor: colors.edgeBright },
});
