import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '../theme';

type Props = {
  week: number;
  year: number;
  isCurrentWeek: boolean;
  bottomInset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function WeekFooter({ week, year, isCurrentWeek, bottomInset, onPrev, onNext, onToday }: Props) {
  return (
    <View style={[styles.footer, { paddingBottom: space.rowY + bottomInset }]}>
      <View style={styles.nav}>
        <Pressable onPress={onPrev} hitSlop={16} accessibilityLabel="Vorherige Woche">
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.label}>
          KW {week} · {year}
        </Text>
        <Pressable onPress={onNext} hitSlop={16} accessibilityLabel="Nächste Woche">
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      {!isCurrentWeek && (
        <Pressable onPress={onToday} hitSlop={12}>
          <Text style={styles.today}>Zurück zu heute</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexGrow: 1,
    backgroundColor: colors.footer,
    paddingTop: space.rowY,
    paddingHorizontal: space.gutter,
    alignItems: 'center',
    gap: 12,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
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
});
