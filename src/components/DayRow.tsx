import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDate, formatTime } from '../lib/date';
import type { Task } from '../lib/useTasks';
import { colors, fonts, space } from '../theme';
import { TaskItem } from './TaskItem';

type Props = {
  label: string;
  date: Date;
  now: Date;
  color: string;
  isToday: boolean;
  expanded: boolean;
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

  const submit = () => {
    onAdd(draft);
    setDraft('');
  };

  return (
    <View style={[styles.row, { backgroundColor: color, paddingTop: space.rowY + topInset }]}>
      <Pressable onPress={onPressHeader} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View style={styles.headerLine}>
          <Text style={styles.day}>{label.toUpperCase()}</Text>
          {!expanded && tasks.length > 0 && (
            <Text style={styles.count}>
              {done}/{tasks.length}
            </Text>
          )}
        </View>
        {showDate && (
          <Text style={styles.date}>
            {formatDate(date)}
            {isToday ? ` – ${formatTime(now)}` : ''}
          </Text>
        )}
      </Pressable>

      {expanded && (
        <View style={styles.body}>
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
            submitBehavior="submit"
            placeholder="Aufgabe hinzufügen…"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="done"
            style={styles.input}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.rowY,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  day: {
    fontFamily: fonts.heavy,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.3,
    color: colors.ink,
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
  body: {
    marginTop: 18,
  },
  input: {
    marginTop: 6,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
});
