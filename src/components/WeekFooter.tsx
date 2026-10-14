import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '../theme';

type Props = {
  week: number;
  range: string;
  isCurrentWeek: boolean;
  wide: boolean;
  /** Tastatur-Hinweis nur zeigen, wenn mit Maus/Tastatur gearbeitet wird. */
  showKeyHint: boolean;
  bottomInset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function WeekFooter({
  week,
  range,
  isCurrentWeek,
  wide,
  showKeyHint,
  bottomInset,
  onPrev,
  onNext,
  onToday,
}: Props) {
  const nav = (
    <View style={styles.nav}>
      <Pressable onPress={onPrev} style={styles.arrowButton} role="button" aria-label="Vorherige Woche">
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <View style={styles.labelBox}>
        <Text style={styles.label}>KW {week}</Text>
        <Text style={styles.range}>{range}</Text>
      </View>
      <Pressable onPress={onNext} style={styles.arrowButton} role="button" aria-label="Nächste Woche">
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );

  // Immer vorhanden, in der aktuellen Woche nur unsichtbar: so springen die Pfeile nicht,
  // wenn der Link erscheint, und ein zweiter Klick landet wieder auf demselben Pfeil.
  const todayLink = (
    <Pressable
      onPress={onToday}
      disabled={isCurrentWeek}
      aria-hidden={isCurrentWeek}
      role="button"
      style={[styles.todayButton, isCurrentWeek && styles.invisible]}
    >
      <Text style={styles.today}>Zurück zu heute</Text>
    </Pressable>
  );

  if (wide) {
    return (
      <View style={[styles.footer, styles.footerWide, { paddingBottom: 10 + bottomInset }]}>
        <View style={[styles.side, styles.sideLeft]}>{todayLink}</View>
        {nav}
        <View style={[styles.side, styles.sideRight]}>
          {showKeyHint && <Text style={styles.hint}>← → Woche wechseln · T heute</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.footer, { paddingBottom: space.rowY + bottomInset }]}>
      {nav}
      {todayLink}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.footer,
    paddingTop: space.rowY - 8,
    paddingHorizontal: space.gutter,
    alignItems: 'center',
  },
  footerWide: {
    flexDirection: 'row',
    paddingTop: 10,
    gap: 24,
  },
  // Gleich breite Seiten halten die Wochen-Navigation exakt in der Mitte.
  side: {
    flex: 1,
    flexBasis: 0,
    flexDirection: 'row',
  },
  sideLeft: {
    justifyContent: 'flex-end',
  },
  sideRight: {
    justifyContent: 'flex-start',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Großzügige Klickflächen (hitSlop wirkt im Browser nicht).
  arrowButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    cursor: 'pointer',
  },
  arrow: {
    fontFamily: fonts.medium,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -4,
    color: colors.control,
  },
  labelBox: {
    minWidth: 190,
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.ink,
  },
  range: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.inkMuted,
  },
  todayButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    cursor: 'pointer',
  },
  invisible: {
    opacity: 0,
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
    color: colors.inkMuted,
  },
});
