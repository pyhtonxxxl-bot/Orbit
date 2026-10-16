import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, dateKey, formatLongDate, formatMonth, fromDateKey } from '../lib/date';
import { colors, fonts } from '../theme';

const LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
const CELL = 40;

type Props = {
  /** Gewählter Tag als `dateKey`, oder nichts. */
  value?: string;
  todayKey: string;
  onChange: (day: string) => void;
};

/** Kleiner Monatskalender: Kreise wie bei den Habits, der gewählte Tag orange. */
export function DatePicker({ value, todayKey, onChange }: Props) {
  const start = fromDateKey(value ?? todayKey);
  const [month, setMonth] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1));

  const offset = (month.getDay() + 6) % 7; // Montag zuerst
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(month, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (months: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + months, 1));

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <NavButton label="Vorheriger Monat" glyph="‹" onPress={() => shift(-1)} />
        <Text style={styles.month}>{formatMonth(month)}</Text>
        <NavButton label="Nächster Monat" glyph="›" onPress={() => shift(1)} />
      </View>
      <View style={styles.grid}>
        {LETTERS.map((letter, i) => (
          <View key={`l${i}`} style={styles.cell}>
            <Text style={styles.letter}>{letter}</Text>
          </View>
        ))}
        {cells.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={styles.cell} />;
          const key = dateKey(date);
          const selected = key === value;
          const today = key === todayKey;
          return (
            <View key={key} style={styles.cell}>
              <Pressable
                onPress={() => onChange(key)}
                role="button"
                aria-label={formatLongDate(date)}
                aria-selected={selected}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.day,
                  today && styles.dayToday,
                  hovered && !selected && styles.dayHovered,
                  selected && styles.daySelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NavButton({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      aria-label={label}
      style={({ pressed }) => [styles.nav, pressed && styles.pressed]}
    >
      <Text style={styles.navGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: CELL * 7,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  month: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  nav: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    cursor: 'pointer',
  },
  navGlyph: {
    fontFamily: fonts.medium,
    fontSize: 24,
    lineHeight: 26,
    marginTop: -3,
    color: colors.control,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL,
    height: CELL - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkFaint,
  },
  day: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  dayHovered: {
    backgroundColor: colors.hover,
  },
  daySelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
  },
  dayTextSelected: {
    color: colors.white,
  },
});
