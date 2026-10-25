import { useCallback } from 'react';

import { addDays, dateKey } from './date';
import { newId, useStoredState } from './storage';

export type Habit = {
  id: string;
  title: string;
  createdAt: number;
  /** Tage, an denen das Habit erledigt war, als `dateKey()`. */
  done: string[];
  /** Wochentage, an denen es sich wiederholt: 0 = Montag … 6 = Sonntag. Fehlt = jeden Tag. */
  days?: number[];
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
    h.done.every((d) => typeof d === 'string') &&
    (h.days === undefined || (Array.isArray(h.days) && h.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)))
  );
}

/** Liest gespeicherte Habits. Wirft, wenn sie nicht lesbar sind, statt still mit `[]` weiterzumachen. */
function parseHabits(raw: string): Habit[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Unerwartetes Format');
  return parsed.filter(isHabit);
}

/** Montag = 0 … Sonntag = 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Steht das Habit an diesem Tag an? */
export function isScheduled(habit: Habit, date: Date): boolean {
  return !habit.days || habit.days.includes(weekdayIndex(date));
}

/** Wiederholt es sich jeden Tag? */
export function isDaily(habit: Habit): boolean {
  return !habit.days || habit.days.length === 7;
}

/**
 * Serie: wie oft in Folge das Habit an seinen Tagen erledigt war, bis heute. Tage, an denen es nicht
 * ansteht, zählen nicht und reißen nichts. Ist es heute noch offen, reißt die Serie erst morgen.
 */
export function streak(habit: Habit, today: Date): number {
  if (habit.days && habit.days.length === 0) return 0;
  const done = new Set(habit.done);
  let day = isScheduled(habit, today) && done.has(dateKey(today)) ? today : addDays(today, -1);
  let count = 0;
  // Höchstens zehn Jahre zurück, damit eine Lücke in den Daten nie zur Endlosschleife wird.
  for (let i = 0; i < 3660; i += 1) {
    if (isScheduled(habit, day)) {
      if (!done.has(dateKey(day))) break;
      count += 1;
    }
    day = addDays(day, -1);
  }
  return count;
}

/** `3 Tage in Folge` (täglich) bzw. `3× in Folge`, kurz `3 Tage` / `3×`. Ohne Serie leer. */
export function streakText(count: number, long = true, daily = true): string {
  if (count === 0) return '';
  const short = daily ? `${count} ${count === 1 ? 'Tag' : 'Tage'}` : `${count}×`;
  return long ? `${short} in Folge` : short;
}

/** Sortiert, ohne Doppelte; alle sieben Tage heißt „jeden Tag“ und wird gar nicht gespeichert. */
function normalizeDays(days: number[]): number[] | undefined {
  const clean = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  return clean.length === 7 ? undefined : clean;
}

/** Habits: was sich wiederholt, mit einem frischen Kästchen an jedem Tag, an dem es ansteht. */
export function useHabits() {
  const { value: habits, setValue: setHabits, loaded } = useStoredState(STORAGE_KEY, parseHabits, EMPTY);

  /** Neues Habit, standardmäßig jeden Tag. */
  const add = useCallback(
    (title: string, days?: number[]) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const habit: Habit = { id: newId(), title: trimmed, createdAt: Date.now(), done: [] };
      const normalized = days && normalizeDays(days);
      if (normalized) habit.days = normalized;
      setHabits((prev) => [...prev, habit]);
    },
    [setHabits],
  );

  const rename = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, title: trimmed } : h)));
    },
    [setHabits],
  );

  /** An welchen Wochentagen es sich wiederholt. Mindestens ein Tag bleibt immer übrig. */
  const setDays = useCallback(
    (id: string, days: number[]) => {
      if (days.length === 0) return;
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const next: Habit = { ...h, days: normalizeDays(days) };
          if (!next.days) delete next.days;
          return next;
        }),
      );
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

  return { habits, loaded, add, rename, setDays, toggle, remove };
}
