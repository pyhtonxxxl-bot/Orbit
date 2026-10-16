import { useCallback } from 'react';

import { addDays, dateKey } from './date';
import { newId, useStoredState } from './storage';

export type Habit = {
  id: string;
  title: string;
  createdAt: number;
  /** Tage, an denen das Habit erledigt war, als `dateKey()`. */
  done: string[];
};

const STORAGE_KEY = 'orbit.habits.v1';
const EMPTY: Habit[] = [];

function isHabit(value: unknown): value is Habit {
  const h = value as Partial<Habit> | null;
  return (
    !!h &&
    typeof h.id === 'string' &&
    typeof h.title === 'string' &&
    Array.isArray(h.done) &&
    h.done.every((d) => typeof d === 'string')
  );
}

/** Liest gespeicherte Habits. Wirft, wenn sie nicht lesbar sind, statt still mit `[]` weiterzumachen. */
function parseHabits(raw: string): Habit[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Unerwartetes Format');
  return parsed.filter(isHabit);
}

/**
 * Serie: wie viele Tage in Folge das Habit erledigt war, bis heute. Ist heute noch offen,
 * zählt die Serie bis gestern, sie reißt erst, wenn ein ganzer Tag fehlt.
 */
export function streak(habit: Habit, today: Date): number {
  const done = new Set(habit.done);
  let day = done.has(dateKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (done.has(dateKey(day))) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

/** `3 Tage in Folge`, `1 Tag`, ohne Serie leer. */
export function streakText(days: number, long = true): string {
  if (days === 0) return '';
  const unit = days === 1 ? 'Tag' : 'Tage';
  return long ? `${days} ${unit} in Folge` : `${days} ${unit}`;
}

/** Habits: was du jeden Tag tun willst, mit einem Haken pro Tag. */
export function useHabits() {
  const { value: habits, setValue: setHabits, loaded } = useStoredState(STORAGE_KEY, parseHabits, EMPTY);

  const add = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const habit: Habit = { id: newId(), title: trimmed, createdAt: Date.now(), done: [] };
      setHabits((prev) => [...prev, habit]);
    },
    [setHabits],
  );

  /** Hakt `day` ab oder nimmt den Haken wieder weg. */
  const toggle = useCallback(
    (id: string, day: string) => {
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const done = h.done.includes(day) ? h.done.filter((d) => d !== day) : [...h.done, day].sort();
          return { ...h, done };
        }),
      );
    },
    [setHabits],
  );

  const remove = useCallback(
    (id: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== id));
    },
    [setHabits],
  );

  return { habits, loaded, add, toggle, remove };
}
