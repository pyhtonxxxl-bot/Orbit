import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Task } from '../lib/useTasks';
import { spaceToggles } from '../lib/web';
import { colors, fonts } from '../theme';
import { Checkbox } from './Checkbox';

type Props = {
  task: Task;
  /** An welchem Tag die Aufgabe liegt und welcher heute ist: für „Fällig“ und „Überfällig“. */
  dayKey: string;
  todayKey: string;
  /** Maus/Trackpad: Hover-Fläche zeigen. */
  canHover: boolean;
  /** Ist gerade rechts im Fenster offen. */
  selected?: boolean;
  onToggle: () => void;
  onOpen: () => void;
};

/** Eine Aufgabe in der Liste: nur das Kästchen und die Beschreibung. Alles andere steht im Fenster. */
export function TaskItem({ task, dayKey, todayKey, canHover, selected = false, onToggle, onOpen }: Props) {
  const [hovered, setHovered] = useState(false);
  const due = !!task.due && !task.done;
  const overdue = due && dayKey < todayKey;
  const badge = overdue ? 'Überfällig' : due ? 'Fällig' : null;

  return (
    <View style={[styles.row, canHover && hovered && styles.rowHovered, selected && styles.rowSelected]}>
      {/* Kästchen: abhaken. Eigene, große Tippfläche, damit man nicht aus Versehen das Fenster öffnet. */}
      <Pressable
        {...spaceToggles(onToggle)}
        onPress={onToggle}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        role="checkbox"
        aria-checked={task.done}
        aria-label={badge ? `${task.title}, ${badge.toLowerCase()}` : task.title}
        style={({ pressed }) => [styles.check, pressed && styles.pressed]}
      >
        <Checkbox checked={task.done} due={due} />
      </Pressable>

      {/* Beschreibung: öffnet das Fenster mit Link, Fälligkeit und Tags. */}
      <Pressable
        onPress={onOpen}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        role="button"
        aria-label={`${task.title}, Details`}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>
              {badge}
            </Text>
          </View>
        )}
      </Pressable>
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
  rowSelected: {
    backgroundColor: colors.active,
  },
  check: {
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    cursor: 'pointer',
  },
  open: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 8,
    paddingVertical: 8,
    paddingRight: 8,
    cursor: 'pointer',
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flexShrink: 1,
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
  // Fällig: kleines oranges Schild hinter der Beschreibung.
  badge: {
    marginTop: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.white,
  },
});
