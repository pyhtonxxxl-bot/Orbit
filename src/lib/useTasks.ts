import { useCallback } from 'react';

import { newId, useStoredState } from './storage';

export type Task = {
  id: string;
  /** Die Beschreibung, das Einzige, was in der Liste steht. */
  title: string;
  done: boolean;
  createdAt: number;
  /** Fällig am (`dateKey`). Die Aufgabe liegt dann genau an diesem Tag und ist orange markiert. */
  due?: string;
  link?: string;
  /** IDs aus `useTags`. */
  tags?: string[];
};

/** Was sich an einer Aufgabe bearbeiten lässt. */
export type TaskDetails = Pick<Task, 'title' | 'due' | 'link' | 'tags'>;

/** Aufgaben pro Tag, Schlüssel ist `dateKey()`. */
export type TaskMap = Record<string, Task[]>;

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

  /** Neue Aufgabe an `day`, mit Fälligkeit direkt an diesem Tag. */
  const add = useCallback(
    (day: string, details: TaskDetails) => {
      const title = details.title.trim();
      if (!title) return;
      const target = details.due ?? day;
      const task: Task = { id: newId(), title, done: false, createdAt: Date.now() };
      if (details.due) task.due = details.due;
      if (details.link) task.link = details.link;
      if (details.tags?.length) task.tags = details.tags;
      setTasks((prev) => ({ ...prev, [target]: [...(prev[target] ?? []), task] }));
    },
    [setTasks],
  );

  /**
   * Ändert eine Aufgabe. Ein neues Fälligkeitsdatum verschiebt sie an diesen Tag, `due: undefined`
   * nimmt die Fälligkeit weg (sie bleibt, wo sie ist). Gibt den Tag zurück, an dem sie danach liegt.
   */
  const update = useCallback(
    (day: string, id: string, patch: Partial<TaskDetails>): string => {
      const target = patch.due ?? day;
      setTasks((prev) => {
        const list = prev[day] ?? [];
        const task = list.find((t) => t.id === id);
        if (!task) return prev;
        const next: Task = { ...task, ...patch };
        // Leere Felder ganz weglassen, damit die gespeicherten Daten schlank bleiben.
        if (!next.due) delete next.due;
        if (!next.link) delete next.link;
        if (!next.tags?.length) delete next.tags;
        if (target === day) return { ...prev, [day]: list.map((t) => (t.id === id ? next : t)) };
        return { ...prev, [day]: list.filter((t) => t.id !== id), [target]: [...(prev[target] ?? []), next] };
      });
      return target;
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

  return { tasks, loaded, add, update, toggle, remove };
}
