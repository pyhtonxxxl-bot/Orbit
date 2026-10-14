import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, space } from '../theme';

type Props = {
  week: number;
  range: string;
  isCurrentWeek: boolean;
  wide: boolean;
  /** Maus/Tastatur: Hover-Flächen und Tastatur-Hinweis zeigen. */
  canHover: boolean;
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
  canHover,
  bottomInset,
  onPrev,
  onNext,
  onToday,
}: Props) {
  const nav = (
    <View style={styles.nav}>
      <FooterButton onPress={onPrev} label="Vorherige Woche" canHover={canHover} style={styles.arrowButton}>
        <Text style={styles.arrow}>‹</Text>
      </FooterButton>
      <View style={styles.labelBox}>
        <Text style={styles.label}>KW {week}</Text>
        <Text style={styles.range}>{range}</Text>
      </View>
      <FooterButton onPress={onNext} label="Nächste Woche" canHover={canHover} style={styles.arrowButton}>
        <Text style={styles.arrow}>›</Text>
      </FooterButton>
    </View>
  );

  // Immer vorhanden, in der aktuellen Woche nur unsichtbar: so springen die Pfeile nicht,
  // wenn der Link erscheint, und ein zweiter Klick landet wieder auf demselben Pfeil.
  const todayLink = (
    <FooterButton
      onPress={onToday}
      hidden={isCurrentWeek}
      canHover={canHover}
      style={[styles.todayButton, !wide && styles.todayButtonCompact]}
    >
      <Text style={styles.today}>Zurück zu heute</Text>
    </FooterButton>
  );

  if (wide) {
    return (
      <View style={[styles.footer, styles.footerWide, { paddingBottom: 10 + bottomInset }]}>
        <View style={[styles.side, styles.sideLeft]}>{todayLink}</View>
        {nav}
        <View style={[styles.side, styles.sideRight]}>
          {canHover && <Text style={styles.hint}>← → Woche wechseln · T heute</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.footer, styles.footerCompact, { paddingBottom: 8 + bottomInset }]}>
      {nav}
      {todayLink}
    </View>
  );
}

type FooterButtonProps = {
  onPress: () => void;
  canHover: boolean;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
  label?: string;
  hidden?: boolean;
};

function FooterButton({ onPress, canHover, style, children, label, hidden = false }: FooterButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={hidden}
      aria-hidden={hidden}
      role="button"
      aria-label={label}
      style={({ pressed }) => [
        style,
        canHover && hovered && !hidden && styles.hovered,
        pressed && styles.pressed,
        hidden && styles.invisible,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.footer,
    paddingHorizontal: space.gutter,
    alignItems: 'center',
  },
  footerCompact: {
    paddingTop: space.rowY - 8,
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
  hovered: {
    backgroundColor: colors.hover,
  },
  pressed: {
    opacity: 0.6,
  },
  invisible: {
    opacity: 0,
    pointerEvents: 'none',
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
    borderRadius: 8,
    cursor: 'pointer',
  },
  todayButtonCompact: {
    paddingVertical: 8,
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
