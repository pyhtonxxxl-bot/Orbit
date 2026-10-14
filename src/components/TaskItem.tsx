import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import type { Task } from '../lib/useTasks';
import { colors, fonts } from '../theme';
import { Checkbox } from './Checkbox';

type Props = {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
};

const isWeb = Platform.OS === 'web';

export function TaskItem({ task, onToggle, onRemove }: Props) {
  // Am PC gibt es kein langes Drücken mit dem Finger: dort erscheint beim Drüberfahren ein ×.
  const [hovered, setHovered] = useState(false);
  const [deleteFocused, setDeleteFocused] = useState(false);
  const showDelete = hovered || deleteFocused;

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onRemove}
      delayLongPress={450}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [styles.row, hovered && styles.rowHovered, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      accessibilityLabel={task.title}
      accessibilityHint={isWeb ? undefined : 'Lange drücken zum Löschen'}
    >
      <Checkbox checked={task.done} />
      <Text style={[styles.title, task.done && styles.titleDone]} numberOfLines={2}>
        {task.title}
      </Text>
      {isWeb && (
        <Pressable
          onPress={onRemove}
          onFocus={() => setDeleteFocused(true)}
          onBlur={() => setDeleteFocused(false)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`„${task.title}“ löschen`}
          style={[styles.delete, !showDelete && styles.hidden]}
        >
          <Text style={styles.deleteGlyph}>×</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 14,
    cursor: 'pointer',
  },
  rowHovered: {
    backgroundColor: colors.hover,
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
  delete: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    cursor: 'pointer',
  },
  hidden: {
    opacity: 0,
  },
  deleteGlyph: {
    fontFamily: fonts.regular,
    fontSize: 22,
    lineHeight: 24,
    color: colors.inkMuted,
  },
});
