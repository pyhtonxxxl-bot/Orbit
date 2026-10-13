import { Pressable, StyleSheet, Text } from 'react-native';

import type { Task } from '../lib/useTasks';
import { colors, fonts } from '../theme';
import { Checkbox } from './Checkbox';

type Props = {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
};

export function TaskItem({ task, onToggle, onRemove }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onRemove}
      delayLongPress={450}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      accessibilityHint="Lange drücken zum Löschen"
    >
      <Checkbox checked={task.done} />
      <Text style={[styles.title, task.done && styles.titleDone]} numberOfLines={2}>
        {task.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 14,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.ink,
  },
  titleDone: {
    color: colors.accentMuted,
    textDecorationLine: 'line-through',
    textDecorationColor: colors.accentMuted,
  },
});
