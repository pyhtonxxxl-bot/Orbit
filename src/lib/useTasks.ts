import { useCallback } from 'react';

import { addDays, dateKey, fromDateKey } from './date';
import { newId, useStoredState } from './storage';

/** Was an einem Tag zu einer Aufgabe festgehalten ist. */
export type DayLog = {
  /** Abgehakt (nur bei Aufgaben über mehrere Tage, sonst gilt `Task.done`). */
  done?: boolean;
  /** Gearbeitete Stunden an diesem Tag. */
  hours?: number;
};

export type Task = {
  id: string;
  /** Die Beschreibung, das Einzige, was in der Liste steht. */
  title: string;
  /** Erledigt, bei Aufgaben für einen einzigen Tag. */
  done: boolean;
  createdAt: number;
  /**
   * Bis wann (`dateKey`, einschließlich). Die Aufgabe steht dann an jedem Tag von ihrem Starttag
   * bis hierhin in der Liste, am letzten Tag orange markiert.
   */
  due?: string;
  link?: string;
  /** IDs aus `useTags`. */
  tags?: string[];
  /** Pro Tag (`dateKey`): abgehakt und Stunden. */
  log?: Record<string, DayLog>;
  /**
   * Mit „Bis“: an welchen Tagen vor dem Fälligkeitstag sie in der Liste steht (`dateKey`s).
   * Fehlt = jeden Tag. Der Fälligkeitstag selbst gehört immer dazu.
   */
  on?: string[];
};

/** Was sich an einer Aufgabe im Fenster bearbeiten lässt. */
export type TaskDetails = Pick<Task, 'title' | 'due' | 'link' | 'tags' | 'on'>;

/** Aufgaben nach ihrem Starttag, Schlüssel ist `dateKey()`. */
export type TaskMap = Record<string, Task[]>;

/** Eine Aufgabe, wie sie an einem bestimmten Tag in der Liste steht. */
export type Occurrence = {
  task: Task;
  /** Starttag (Schlüssel in der TaskMap). */
  start: string;
  /** Der Tag, an dem sie hier erscheint. */
  day: string;
  done: boolean;
  hours?: number;
  /** Läuft über mehrere Tage. */
  ranged: boolean;
  /** Letzter Tag mit „Bis“: hier ist sie fällig. */
  dueHere: boolean;
};

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

/** Letzter Tag, an dem die Aufgabe in der Liste steht. */
export function lastDay(task: Task, start: string): string {
  return task.due && task.due > start ? task.due : start;
}

function dayLog(task: Task, day: string): DayLog | undefined {
  const entry = task.log?.[day];
  return entry && typeof entry === 'object' ? entry : undefined;
}

/** Erledigt an diesem Tag? Über mehrere Tage wird jeder Tag einzeln abgehakt. */
export function isDoneOn(task: Task, start: string, day: string): boolean {
  return lastDay(task, start) !== start ? !!dayLog(task, day)?.done : task.done;
}

export function hoursOn(task: Task, day: string): number | undefined {
  const hours = dayLog(task, day)?.hours;
  return typeof hours === 'number' && hours > 0 ? hours : undefined;
}

export function totalHours(task: Task): number {
  return Object.keys(task.log ?? {}).reduce((sum, day) => sum + (hoursOn(task, day) ?? 0), 0);
}

/** Alle Tage von `start` bis vor `end`, als `dateKey`s (die wählbaren Tage vor dem Fälligkeitstag). */
export function daysBefore(start: string, end: string): string[] {
  const days: string[] = [];
  // Höchstens ein Jahr, damit ein kaputtes Datum nie zur Endlosschleife wird.
  for (let d = fromDateKey(start), i = 0; dateKey(d) < end && i < 366; d = addDays(d, 1), i += 1) {
    days.push(dateKey(d));
  }
  return days;
}

/** Gewählte Tage auf den Zeitraum zuschneiden; alle gewählt heißt „jeden Tag“ und wird nicht gespeichert. */
export function normalizeOn(on: string[] | undefined, start: string, end: string): string[] | undefined {
  if (!on || end <= start) return undefined;
  const range = daysBefore(start, end);
  const picked = range.filter((d) => on.includes(d));
  return picked.length === range.length ? undefined : picked;
}

/**
 * Alle Aufgaben, die an `day` in der Liste stehen: am Starttag und, mit „Bis“, an jedem Tag bis dahin
 * (oder nur an den gewählten Tagen, der Fälligkeitstag immer).
 */
export function tasksOn(tasks: TaskMap, day: string): Occurrence[] {
  const found: Occurrence[] = [];
  // Früher begonnene zuerst, sie laufen schon. Innerhalb eines Starttags die gespeicherte Reihenfolge.
  for (const start of Object.keys(tasks).sort()) {
    if (start > day) continue;
    for (const task of tasks[start]) {
      const end = lastDay(task, start);
      if (day > end) continue;
      if (Array.isArray(task.on) && day !== end && !task.on.includes(day)) continue;
      found.push({
        task,
        start,
        day,
        done: isDoneOn(task, start, day),
        hours: hoursOn(task, day),
        ranged: end !== start,
        dueHere: !!task.due && day === end,
      });
    }
  }
  return found;
}

/** `1,5 Std.` */
export function formatHours(hours: number): string {
  return `${String(Math.round(hours * 100) / 100).replace('.', ',')} Std.`;
}

/** `1,5` oder `1.5` → 1,5. Unsinn oder 0 → nichts. Höchstens 24, auf Viertelstunden gerundet. */
export function parseHours(text: string): number | undefined {
  const value = Number.parseFloat(text.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(24, Math.round(value * 4) / 4);
}

/** Ändert den Eintrag für einen Tag; leere Einträge fallen weg. */
function withLog(task: Task, day: string, patch: DayLog): Task {
  const entry: DayLog = { ...dayLog(task, day), ...patch };
  if (!entry.done) delete entry.done;
  if (!entry.hours) delete entry.hours;
  const log = { ...task.log };
  if (Object.keys(entry).length) log[day] = entry;
  else delete log[day];
  const next: Task = { ...task, log };
  if (!Object.keys(log).length) delete next.log;
  return next;
}

/** Todos: Aufgaben an einem Tag oder, mit „Bis“, über mehrere Tage. */
export function useTasks() {
  const { value: tasks, setValue: setTasks, loaded } = useStoredState(STORAGE_KEY, parseTasks, EMPTY);

  /** Ändert eine Aufgabe in ihrer Liste (Starttag `start`). */
  const change = useCallback(
    (start: string, id: string, fn: (task: Task) => Task) => {
      setTasks((prev) => {
        const list = prev[start] ?? [];
        if (!list.some((t) => t.id === id)) return prev;
        return { ...prev, [start]: list.map((t) => (t.id === id ? fn(t) : t)) };
      });
    },
    [setTasks],
  );

  /** Neue Aufgabe ab `day`. Liegt „Bis“ davor, beginnt sie eben dort. */
  const add = useCallback(
    (day: string, details: TaskDetails) => {
      const title = details.title.trim();
      if (!title) return;
      const start = details.due && details.due < day ? details.due : day;
      const task: Task = { id: newId(), title, done: false, createdAt: Date.now() };
      if (details.due) task.due = details.due;
      if (details.link) task.link = details.link;
      if (details.tags?.length) task.tags = details.tags;
      const on = normalizeOn(details.on, start, lastDay(task, start));
      if (on) task.on = on;
      setTasks((prev) => ({ ...prev, [start]: [...(prev[start] ?? []), task] }));
    },
    [setTasks],
  );

  /**
   * Ändert Beschreibung, „Bis“, Tage, Link oder Tags. Ein „Bis“ vor dem Starttag verlegt die Aufgabe dorthin
   * (dann ist es ein einzelner Tag). Gibt den Starttag zurück, an dem sie danach liegt.
   */
  const update = useCallback(
    (start: string, id: string, patch: Partial<TaskDetails>): string => {
      const target = patch.due && patch.due < start ? patch.due : start;
      setTasks((prev) => {
        const list = prev[start] ?? [];
        const task = list.find((t) => t.id === id);
        if (!task) return prev;
        let next: Task = { ...task, ...patch };
        // Leere Felder ganz weglassen, damit die gespeicherten Daten schlank bleiben.
        if (!next.due) delete next.due;
        if (!next.link) delete next.link;
        if (!next.tags?.length) delete next.tags;
        // Gewählte Tage passen sich an einen neuen Zeitraum an.
        const on = normalizeOn(next.on, target, lastDay(next, target));
        if (on) next.on = on;
        else delete next.on;
        // Wechsel zwischen einem Tag und mehreren: der Haken des Starttags wandert mit.
        const wasRanged = lastDay(task, start) !== start;
        const isRanged = lastDay(next, target) !== target;
        if (!wasRanged && isRanged && task.done) next = withLog({ ...next, done: false }, target, { done: true });
        if (wasRanged && !isRanged) next = { ...withLog(next, target, { done: false }), done: !!dayLog(task, target)?.done };
        if (target === start) return { ...prev, [start]: list.map((t) => (t.id === id ? next : t)) };
        return { ...prev, [start]: list.filter((t) => t.id !== id), [target]: [...(prev[target] ?? []), next] };
      });
      return target;
    },
    [setTasks],
  );

  /** Hakt die Aufgabe an `day` ab oder nimmt den Haken weg. */
  const toggle = useCallback(
    (start: string, id: string, day: string) => {
      change(start, id, (t) =>
        lastDay(t, start) !== start ? withLog(t, day, { done: !dayLog(t, day)?.done }) : { ...t, done: !t.done },
      );
    },
    [change],
  );

  /** Gearbeitete Stunden an `day`; ohne Zahl wird der Eintrag gelöscht. */
  const setHours = useCallback(
    (start: string, id: string, day: string, hours: number | undefined) => {
      change(start, id, (t) => withLog(t, day, { hours }));
    },
    [change],
  );

  const remove = useCallback(
    (start: string, id: string) => {
      setTasks((prev) => ({ ...prev, [start]: (prev[start] ?? []).filter((t) => t.id !== id) }));
    },
    [setTasks],
  );

  return { tasks, loaded, add, update, toggle, setHours, remove };
}
