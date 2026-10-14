import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDate, formatTime } from '../lib/date';
import type { Task } from '../lib/useTasks';
import { CONTENT_MAX_WIDTH, colors, fonts, space } from '../theme';
import { TaskItem } from './TaskItem';

type Props = {
  label: string;
  date: Date;
  now: Date;
  color: string;
  isToday: boolean;
  expanded: boolean;
  /** Desktop-Layout: Tag links, Aufgaben rechts, immer offen. */
  wide: boolean;
  gutter: number;
  topInset?: number;
  tasks: Task[];
  onPressHeader: () => void;
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function DayRow({
  label,
  date,
  now,
  color,
  isToday,
  expanded,
  wide,
  gutter,
  topInset = 0,
  tasks,
  onPressHeader,
  onAdd,
  onToggle,
  onRemove,
}: Props) {
  const [draft, setDraft] = useState('');
  const done = tasks.filter((t) => t.done).length;
  const showDate = expanded || isToday;
  const rowY = wide ? space.rowYWide : space.rowY;

  const submit = () => {
    onAdd(draft);
    setDraft('');
  };

  const dateText = (
    <Text style={[styles.date, wide && styles.dateWide]}>
      {formatDate(date)}
      {isToday ? ` – ${formatTime(now)}` : ''}
    </Text>
  );

  // Am PC steht das Datum neben dem Tag, damit die ganze Woche auf einen Bildschirm passt.
  const header = wide ? (
    <View style={styles.headerLineWide}>
      <Text style={[styles.day, styles.dayWide]}>{label.toUpperCase()}</Text>
      {dateText}
    </View>
  ) : (
    <>
      <View style={styles.headerLine}>
        <Text style={styles.day}>{label.toUpperCase()}</Text>
        {!expanded && tasks.length > 0 && (
          <Text style={styles.count}>
            {done}/{tasks.length}
          </Text>
        )}
      </View>
      {showDate && dateText}
    </>
  );

  return (
    <View
      style={[
        styles.row,
        !expanded && styles.rowCollapsed,
        { backgroundColor: color, paddingTop: rowY + topInset, paddingBottom: rowY },
      ]}
    >
      <View style={[{ paddingHorizontal: gutter }, wide && styles.innerWide]}>
        {wide ? (
          <View style={styles.side}>{header}</View>
        ) : (
          <Pressable
            onPress={onPressHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            style={styles.headerPressable}
          >
            {header}
          </Pressable>
        )}

        {expanded && (
          <View style={[styles.body, wide && styles.bodyWide]}>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => onToggle(task.id)}
                onRemove={() => onRemove(task.id)}
              />
            ))}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              // Nach Enter im Feld bleiben, um gleich die nächste Aufgabe zu tippen.
              // `submitBehavior` gilt auf iOS/Android, `blurOnSubmit` braucht react-native-web.
              submitBehavior="submit"
              blurOnSubmit={false}
              placeholder="Aufgabe hinzufügen…"
              placeholderTextColor={colors.inkFaint}
              returnKeyType="done"
              accessibilityLabel={`Aufgabe für ${label} hinzufügen`}
              style={[styles.input, wide && tasks.length === 0 && styles.inputAlone]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Die Bänder teilen sich übrige Höhe, damit der Stapel immer den ganzen Bildschirm füllt.
  row: {
    flexGrow: 1,
  },
  // Zugeklappte Tage sitzen mittig in ihrem Band, z. B. auf hohen Tablet-Bildschirmen.
  rowCollapsed: {
    justifyContent: 'center',
  },
  innerWide: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: 48,
  },
  headerPressable: {
    cursor: 'pointer',
  },
  side: {
    width: 460,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerLineWide: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 16,
  },
  day: {
    fontFamily: fonts.heavy,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  dayWide: {
    fontSize: 38,
    lineHeight: 44,
  },
  count: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.inkFaint,
  },
  date: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.inkMuted,
  },
  dateWide: {
    marginTop: 0,
  },
  body: {
    marginTop: 18,
  },
  bodyWide: {
    flex: 1,
    marginTop: 3,
    maxWidth: 620,
  },
  input: {
    marginTop: 6,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    outlineWidth: 0,
  },
  // Ohne Aufgaben sitzt das Eingabefeld auf Höhe des Tagesnamens.
  inputAlone: {
    marginTop: 0,
  },
});
