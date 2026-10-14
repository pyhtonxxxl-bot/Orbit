import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '../theme';

type Props = {
  week: number;
  year: number;
  isCurrentWeek: boolean;
  wide: boolean;
  bottomInset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function WeekFooter({
  week,
  year,
  isCurrentWeek,
  wide,
  bottomInset,
  onPrev,
  onNext,
  onToday,
}: Props) {
  return (
    <View style={[styles.footer, wide && styles.footerWide, { paddingBottom: (wide ? 18 : space.rowY) + bottomInset }]}>
      <View style={styles.nav}>
        <Pressable onPress={onPrev} hitSlop={16} style={styles.button} accessibilityRole="button" accessibilityLabel="Vorherige Woche">
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.label}>
          KW {week} · {year}
        </Text>
        <Pressable onPress={onNext} hitSlop={16} style={styles.button} accessibilityRole="button" accessibilityLabel="Nächste Woche">
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      {!isCurrentWeek && (
        <Pressable onPress={onToday} hitSlop={12} style={styles.button} accessibilityRole="button">
          <Text style={styles.today}>Zurück zu heute</Text>
        </Pressable>
      )}
      {wide && <Text style={styles.hint}>← → Woche wechseln · T heute</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.footer,
    paddingTop: space.rowY,
    paddingHorizontal: space.gutter,
    alignItems: 'center',
    gap: 12,
  },
  // Am PC alles in einer Zeile, damit die Woche auch auf kleinen Laptops ganz sichtbar bleibt.
  footerWide: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 18,
    gap: 32,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  button: {
    cursor: 'pointer',
  },
  arrow: {
    fontFamily: fonts.medium,
    fontSize: 28,
    lineHeight: 30,
    color: colors.inkMuted,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.inkMuted,
  },
  today: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.inkFaint,
  },
});
