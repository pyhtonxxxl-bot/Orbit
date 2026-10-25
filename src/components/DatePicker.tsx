import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { addDays, dateKey, formatLongDate, formatMonth, fromDateKey } from '../lib/date';
import { useColors } from '../lib/theme';
import { fonts, themed } from '../theme';

const LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
const CELL = 40;

type DayState = {
  /** Gewählt: gefüllter Kreis. */
  selected?: boolean;
  /** Orange statt dunkel gefüllt (Bis-Datum). */
  accent?: boolean;
  /** Außerhalb des wählbaren Bereichs: blass, nicht antippbar. */
  disabled?: boolean;
  /** Fest gewählt, nicht abwählbar (z. B. der Fälligkeitstag), sieht aber normal aus. */
  locked?: boolean;
};

type CalendarProps = {
  /** Welcher Monat zuerst zu sehen ist (`dateKey` eines Tages darin). */
  initial: string;
  todayKey: string;
  /** Mehrfachauswahl: Tage sind Kästchen (an/aus) statt Knöpfe. */
  multi?: boolean;
  dayState: (day: string) => DayState;
  onPress: (day: string) => void;
};

/** Kleiner Monatskalender: Kreise wie bei den Habits, Montag zuerst. */
function MiniCalendar({ initial, todayKey, multi = false, dayState, onPress }: CalendarProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const first = fromDateKey(initial);
  const [month, setMonth] = useState(() => new Date(first.getFullYear(), first.getMonth(), 1));

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
          const { selected = false, accent = false, disabled = false, locked = false } = dayState(key);
          const inactive = disabled || locked;
          const today = key === todayKey;
          return (
            <View key={key} style={styles.cell}>
              <Pressable
                onPress={() => onPress(key)}
                disabled={inactive}
                role={multi ? 'checkbox' : 'button'}
                aria-label={formatLongDate(date)}
                {...(multi ? { 'aria-checked': selected } : { 'aria-selected': selected })}
                aria-disabled={inactive}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.day,
                  today && styles.dayToday,
                  hovered && !selected && !inactive && styles.dayHovered,
                  selected && (accent ? styles.dayAccent : styles.daySelected),
                  disabled && styles.dayDisabled,
                  locked && styles.dayLocked,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[styles.dayText, selected && (accent ? styles.dayTextAccent : styles.dayTextSelected)]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

type DatePickerProps = {
  /** Gewählter Tag als `dateKey`, oder nichts. */
  value?: string;
  todayKey: string;
  onChange: (day: string) => void;
};

/** Einen Tag wählen, der gewählte ist orange (z. B. „Bis“). */
export function DatePicker({ value, todayKey, onChange }: DatePickerProps) {
  return (
    <MiniCalendar
      initial={value ?? todayKey}
      todayKey={todayKey}
      dayState={(day) => ({ selected: day === value, accent: true })}
      onPress={onChange}
    />
  );
}

type DaysPickerProps = {
  /** Erster und letzter Tag (fällig) des Zeitraums. */
  start: string;
  end: string;
  /** Gewählte Tage; nichts = alle. Der letzte Tag gehört immer dazu. */
  days?: string[];
  todayKey: string;
  onToggle: (day: string) => void;
};

/** Mehrere Tage im Zeitraum an- und abwählen. Der Fälligkeitstag ist orange und bleibt immer an. */
export function DaysPicker({ start, end, days, todayKey, onToggle }: DaysPickerProps) {
  return (
    <MiniCalendar
      initial={start}
      todayKey={todayKey}
      multi
      dayState={(day) => {
        if (day < start || day > end) return { disabled: true };
        if (day === end) return { selected: true, accent: true, locked: true };
        return { selected: !days || days.includes(day) };
      }}
      onPress={onToggle}
    />
  );
}

function NavButton({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  const colors = useColors();
  const styles = getStyles(colors);
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

const getStyles = themed((colors) => ({
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
  // Mehrfachauswahl: dunkel gefüllt wie die Wochentage in den Einstellungen.
  daySelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  dayAccent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayDisabled: {
    opacity: 0.25,
    cursor: 'auto',
  },
  dayLocked: {
    cursor: 'auto',
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
    color: colors.inverse,
  },
  dayTextAccent: {
    color: colors.white,
  },
}));
