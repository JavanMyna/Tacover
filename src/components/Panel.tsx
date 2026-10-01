import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, eyebrow, radius } from '../theme';

type Accent = 'cyan' | 'purple' | 'danger';

type Props = {
  title: string;
  sub?: string;
  accent?: Accent;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

const ACCENTS: Record<Accent, string> = {
  cyan: colors.cyan,
  purple: colors.purple,
  danger: colors.danger,
};

/** One titled slab of the HUD. The accent rule under the eyebrow is the only decoration. */
export function Panel({ title, sub, accent = 'cyan', style, children }: Props) {
  return (
    <View style={[styles.panel, style]}>
      <View style={styles.head}>
        <Text style={eyebrow}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <View style={[styles.rule, { backgroundColor: ACCENTS[accent] }]} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.edge,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub: { fontSize: 10, letterSpacing: 0.6, color: colors.textFaint },
  rule: { height: 1, marginTop: 8, opacity: 0.5, borderRadius: 1 },
  body: { marginTop: 10 },
});
