import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { WEEKDAYS, addDays, dateKey, formatDate } from '../lib/date';
import { streakText, type Habit } from '../lib/useHabits';
import { heading, spaceToggles } from '../lib/web';
import { COMPACT_MAX_WIDTH, CONTENT_MAX_WIDTH, colors, fonts, space } from '../theme';
import { Tick } from './Checkbox';

const LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];

type Props = {
  habit: Habit;
  /** Serie bis heute, siehe `streak()`. */
  streak: number;
  weekStart: Date;
  todayKey: string;
  color: string;
  wide: boolean;
  gutter: number;
  /** Maus/Trackpad: × beim Drüberfahren. Touch: lange drücken zum Löschen. */
  canHover: boolean;
  onToggle: (day: string) => void;
  onRemove: () => void;
};

type WebKeyEvent = { key: string; target: unknown; currentTarget: unknown; preventDefault(): void };

/** Ein Habit als Band: Name und Serie, daneben die sieben Tage der Woche zum Abhaken. */
export function HabitRow({ habit, streak, weekStart, todayKey, color, wide, gutter, canHover, onToggle, onRemove }: Props) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [deleteFocused, setDeleteFocused] = useState(false);
  const showDelete = (canHover && hovered) || deleteFocused;
  const rowY = wide ? space.rowYWide : space.rowY;
  const done = new Set(habit.done);

  const days = (
    <View style={[styles.days, wide ? styles.daysWide : styles.daysCompact]}>
      {LETTERS.map((letter, i) => {
        const date = addDays(weekStart, i);
        const key = dateKey(date);
        // Nach Wochentag statt Datum: beim Wochenwechsel bleiben dieselben Kreise stehen, der Tastaturfokus auch.
        return (
          <Day
            key={i}
            letter={letter}
            label={`${habit.title}, ${WEEKDAYS[i]}, ${formatDate(date)}`}
            checked={done.has(key)}
            isToday={key === todayKey}
            future={key > todayKey}
            wide={wide}
            canHover={canHover}
            onPress={() => onToggle(key)}
          />
        );
      })}
    </View>
  );

  const streakLabel = streakText(streak) || 'Noch keine Serie';
  const isNative = Platform.OS !== 'web';

  // Name lange drücken (Handy) oder Entf auf einem Tag (Tastatur) löscht, nach Rückfrage.
  // VoiceOver/TalkBack bekommen dafür eine eigene Aktion („Habit löschen“).
  const name = (
    <Pressable
      onLongPress={canHover ? undefined : onRemove}
      delayLongPress={450}
      accessible={isNative}
      tabIndex={-1}
      aria-label={isNative ? `${habit.title}, ${streakLabel}` : undefined}
      accessibilityHint={isNative ? 'Lange drücken zum Löschen' : undefined}
      accessibilityActions={isNative ? [{ name: 'longpress', label: 'Habit löschen' }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && onRemove()}
      style={[styles.name, wide && styles.nameWide]}
    >
      <Text {...heading(2)} style={[styles.title, wide && styles.titleWide]} maxFontSizeMultiplier={1.3}>
        {habit.title.toUpperCase()}
      </Text>
      <Text style={[styles.streak, wide && styles.streakWide]}>{streakLabel}</Text>
    </Pressable>
  );

  const deleteButton = canHover && (
    <Pressable
      onPress={onRemove}
      onHoverIn={() => setDeleteHovered(true)}
      onHoverOut={() => setDeleteHovered(false)}
      onFocus={() => setDeleteFocused(true)}
      onBlur={() => setDeleteFocused(false)}
      role="button"
      aria-label={`Habit „${habit.title}“ löschen`}
      style={[styles.delete, deleteHovered && styles.deleteHovered, !showDelete && styles.hidden]}
    >
      <Text style={styles.deleteGlyph}>×</Text>
    </Pressable>
  );

  // Entf/Backspace auf einem fokussierten Tag löscht das ganze Habit (nach Rückfrage), wie bei Aufgaben.
  const webKeyProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: (e: WebKeyEvent) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            e.preventDefault();
            onRemove();
          },
        }
      : {};

  return (
    <View
      {...webKeyProps}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.band, { backgroundColor: color, paddingVertical: rowY, paddingHorizontal: gutter }]}
    >
      {wide ? (
        <View style={styles.innerWide}>
          <View style={styles.side}>{name}</View>
          <View style={styles.bodyWide}>
            {days}
            {deleteButton}
          </View>
        </View>
      ) : (
        <View style={styles.innerCompact}>
          {/* Schmales Fenster mit Maus: das × steht rechts neben dem Namen. */}
          <View style={styles.headCompact}>
            {name}
            {deleteButton}
          </View>
          {days}
        </View>
      )}
    </View>
  );
}

type DayProps = {
  letter: string;
  label: string;
  checked: boolean;
  isToday: boolean;
  future: boolean;
  wide: boolean;
  canHover: boolean;
  onPress: () => void;
};

/** Ein Tag als Kreis: leer mit Anfangsbuchstabe, erledigt orange mit Haken. Kommende Tage sind gesperrt. */
function Day({ letter, label, checked, isToday, future, wide, canHover, onPress }: DayProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...spaceToggles(future ? undefined : onPress)}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={future}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={future}
      aria-label={isToday ? `${label}, heute` : label}
      style={({ pressed }) => [
        styles.day,
        wide ? styles.dayWide : styles.dayCompact,
        isToday && styles.dayToday,
        checked && styles.dayChecked,
        future && styles.dayFuture,
        canHover && hovered && !checked && !future && styles.dayHovered,
        pressed && styles.pressed,
      ]}
    >
      {checked ? (
        <Tick scale={wide ? 1.2 : 1.1} />
      ) : (
        <Text style={[styles.letter, isToday && styles.letterToday]} selectable={false} maxFontSizeMultiplier={1.2}>
          {letter}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: {
    justifyContent: 'center',
  },
  innerWide: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: 48,
  },
  innerCompact: {
    width: '100%',
    maxWidth: COMPACT_MAX_WIDTH,
    gap: 16,
  },
  // Gleiche Spalten wie im Wochenplaner: links der Name, rechts die Tage.
  side: {
    flexBasis: '43%',
    maxWidth: 460,
  },
  bodyWide: {
    flex: 1,
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  name: {
    flexShrink: 1,
    cursor: 'auto',
    alignSelf: 'flex-start',
  },
  // PC: Serie auf der Grundlinie neben dem Namen, wie das Datum neben dem Wochentag.
  nameWide: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 16,
  },
  headCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  titleWide: {
    fontSize: 34,
    lineHeight: 40,
  },
  streak: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkMuted,
  },
  streakWide: {
    marginTop: 0,
    fontSize: 17,
  },
  days: {
    flexDirection: 'row',
  },
  daysWide: {
    gap: 10,
  },
  // Handy: die sieben Kreise teilen sich die Breite, werden aber nie riesig.
  daysCompact: {
    gap: 8,
    maxWidth: 7 * 46 + 6 * 8,
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.control,
    cursor: 'pointer',
  },
  dayWide: {
    width: 42,
    height: 42,
  },
  dayCompact: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 46,
  },
  dayToday: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  dayChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayFuture: {
    opacity: 0.35,
    cursor: 'auto',
  },
  dayHovered: {
    backgroundColor: colors.hover,
  },
  pressed: {
    opacity: 0.6,
  },
  letter: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.inkMuted,
    userSelect: 'none',
  },
  letterToday: {
    color: colors.ink,
  },
  delete: {
    width: 38,
    height: 38,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    cursor: 'pointer',
  },
  deleteHovered: {
    backgroundColor: colors.hover,
  },
  // Unsichtbar heißt auch nicht antippbar (Touch-Laptops melden sich als Maus-Geräte).
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  deleteGlyph: {
    fontFamily: fonts.regular,
    fontSize: 22,
    lineHeight: 24,
    color: colors.control,
  },
});
