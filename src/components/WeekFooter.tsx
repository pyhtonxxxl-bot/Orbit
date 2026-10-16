import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, space } from '../theme';
import { Icon } from './Icon';

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
  /** PC: Plus rechts für eine neue Aufgabe (am Handy übernimmt das der schwebende Knopf). */
  onAdd?: () => void;
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
  onAdd,
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
        <View style={[styles.side, styles.sideRight, onAdd && styles.sideRightAdd]}>
          {canHover && (
            <Text style={styles.hint}>{onAdd ? '← → Woche · T heute · N neu' : '← → Woche wechseln · T heute'}</Text>
          )}
          {onAdd && <AddButton onPress={onAdd} canHover={canHover} />}
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

/** Runder dunkler Plus-Knopf, wie der Knopf der Wisch-Leiste. Auch als schwebender Knopf am Handy. */
export function AddButton({ onPress, canHover, size = 40 }: { onPress: () => void; canHover: boolean; size?: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="button"
      aria-label="Neue Aufgabe"
      style={({ pressed }) => [
        styles.add,
        { width: size, height: size, borderRadius: size / 2 },
        canHover && hovered && styles.addHovered,
        pressed && styles.pressed,
      ]}
    >
      <Icon name="plus" size={size * 0.5} color={colors.white} strokeWidth={2} />
    </Pressable>
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
    alignItems: 'center',
  },
  // Mit Plus: Tastatur-Hinweis rechtsbündig, ganz außen das Plus.
  sideRightAdd: {
    justifyContent: 'flex-end',
    gap: 16,
  },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    cursor: 'pointer',
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  addHovered: {
    opacity: 0.85,
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
