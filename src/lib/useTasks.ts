import { useCallback } from 'react';

import { newId, useStoredState } from './storage';

export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

/** Aufgaben pro Tag, Schlüssel ist `dateKey()`. */
type TaskMap = Record<string, Task[]>;

const STORAGE_KEY = 'orbit.tasks.v1';
const EMPTY: TaskMap = {};

function isTask(value: unknown): value is Task {
  const t = value as Partial<Task> | null;
  return !!t && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.done === 'boolean';
}

/** Liest gespeicherte Daten. Wirft, wenn sie nicht lesbar sind, statt still mit `{}` weiterzumachen. */
function parseTasks(raw: string): TaskMap {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Unerwartetes Format');
  const clean: TaskMap = {};
  for (const [day, list] of Object.entries(parsed)) {
    if (Array.isArray(list)) clean[day] = list.filter(isTask);
  }
  return clean;
}

/** Todos: Aufgaben, die an einem bestimmten Tag erledigt werden sollen. */
export function useTasks() {
  const { value: tasks, setValue: setTasks, loaded } = useStoredState(STORAGE_KEY, parseTasks, EMPTY);

  const add = useCallback(
    (day: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const task: Task = { id: newId(), title: trimmed, done: false, createdAt: Date.now() };
      setTasks((prev) => ({ ...prev, [day]: [...(prev[day] ?? []), task] }));
    },
    [setTasks],
  );

  const toggle = useCallback(
    (day: string, id: string) => {
      setTasks((prev) => ({
        ...prev,
        [day]: (prev[day] ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }));
    },
    [setTasks],
  );

  const remove = useCallback(
    (day: string, id: string) => {
      setTasks((prev) => ({ ...prev, [day]: (prev[day] ?? []).filter((t) => t.id !== id) }));
    },
    [setTasks],
  );

  return { tasks, loaded, add, toggle, remove };
}
