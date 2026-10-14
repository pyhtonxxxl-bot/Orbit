import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Task } from '../lib/useTasks';
import { colors, fonts } from '../theme';
import { Checkbox } from './Checkbox';

type Props = {
  task: Task;
  /** Maus/Trackpad: × beim Drüberfahren. Touch: lange drücken zum Löschen. */
  canHover: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

type WebKeyEvent = { key: string; repeat: boolean; target: unknown; currentTarget: unknown; preventDefault(): void };

// Nach einem Löschen rückt die nächste Zeile unter den Mauszeiger. Ein Doppelklick auf × würde sie sonst gleich mitlöschen.
let lastDeleteAt = 0;
function removeOnce(onRemove: () => void) {
  const now = Date.now();
  if (now - lastDeleteAt < 400) return;
  lastDeleteAt = now;
  onRemove();
}

export function TaskItem({ task, canHover, onToggle, onRemove }: Props) {
  const [rowHovered, setRowHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [deleteFocused, setDeleteFocused] = useState(false);
  // Touch-Browser melden nach einem Tippen manchmal „Hover“: Hover-Effekte nur mit Maus.
  const hovered = canHover && (rowHovered || deleteHovered);
  const showDelete = hovered || deleteFocused;

  // Tastatur im Browser: Leertaste hakt ab (react-native-web macht das nur für role="button"),
  // Entf/Backspace löscht. So geht beides auch ohne Maus, z. B. am Tablet mit Tastatur.
  const webKeyProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: (e: WebKeyEvent) => {
            if (e.target !== e.currentTarget || e.repeat) return;
            if (e.key === ' ') {
              e.preventDefault();
              onToggle();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault();
              removeOnce(onRemove);
            }
          },
        }
      : {};

  return (
    <View style={[styles.row, hovered && styles.rowHovered]}>
      <Pressable
        {...webKeyProps}
        onPress={onToggle}
        // Am PC löscht nur das ×, sonst wäre ein langer Mausklick ein versehentliches Löschen.
        onLongPress={canHover ? undefined : onRemove}
        delayLongPress={450}
        onHoverIn={() => setRowHovered(true)}
        onHoverOut={() => setRowHovered(false)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.title}
        accessibilityHint={canHover ? 'Entf zum Löschen' : 'Lange drücken zum Löschen'}
      >
        <Checkbox checked={task.done} />
        <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
      </Pressable>

      {canHover && (
        <Pressable
          onPress={() => removeOnce(onRemove)}
          onHoverIn={() => setDeleteHovered(true)}
          onHoverOut={() => setDeleteHovered(false)}
          onFocus={() => setDeleteFocused(true)}
          onBlur={() => setDeleteFocused(false)}
          role="button"
          aria-label={`„${task.title}“ löschen`}
          style={[styles.delete, !showDelete && styles.hidden]}
        >
          <Text style={styles.deleteGlyph}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: -8,
    borderRadius: 8,
  },
  rowHovered: {
    backgroundColor: colors.hover,
  },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 14,
    cursor: 'pointer',
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  titleDone: {
    color: colors.done,
    textDecorationLine: 'line-through',
    textDecorationColor: colors.accent,
  },
  delete: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    cursor: 'pointer',
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
