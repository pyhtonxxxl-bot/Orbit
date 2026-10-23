import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { streakText } from '../lib/useHabits';
import { spaceToggles } from '../lib/web';
import { colors, fonts } from '../theme';
import { Checkbox } from './Checkbox';

type Props = {
  title: string;
  checked: boolean;
  /** Serie bis heute, siehe `streak()`. 0 = nichts anzeigen. */
  streak: number;
  /** Täglich („3 Tage“) oder an bestimmten Wochentagen („3×“). */
  daily?: boolean;
  /** Kommende Tage: noch nicht abhakbar. */
  disabled?: boolean;
  canHover: boolean;
  onToggle: () => void;
};

/** Ein Habit als abhakbare Zeile, mit der Serie rechts. Sieht aus wie eine Aufgabe. */
export function HabitItem({ title, checked, streak, daily = true, disabled = false, canHover, onToggle }: Props) {
  const [hovered, setHovered] = useState(false);
  const days = streakText(streak, false, daily);
  return (
    <Pressable
      {...spaceToggles(disabled ? undefined : onToggle)}
      onPress={onToggle}
      disabled={disabled}
      aria-disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="checkbox"
      aria-checked={checked}
      aria-label={days ? `${title}, Serie ${days}` : title}
      style={({ pressed }) => [
        styles.row,
        canHover && hovered && !disabled && styles.rowHovered,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Checkbox checked={checked} />
      <Text style={[styles.title, checked && styles.titleDone]}>{title}</Text>
      {!!days && <Text style={styles.streak}>{days}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginHorizontal: -8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  rowHovered: {
    backgroundColor: colors.hover,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
    cursor: 'auto',
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  // Ein Habit ist nicht „weg“, wenn es erledigt ist: nur leiser, ohne Durchstreichen.
  titleDone: {
    color: colors.done,
  },
  streak: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
  },
});
