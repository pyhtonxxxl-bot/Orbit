import { useCallback, useState } from 'react';

import { lastDay, type TaskMap } from './useTasks';

/**
 * Was das Aufgaben-Fenster zeigt: eine neue Aufgabe ab `day`, oder eine bestehende mit Starttag `day`,
 * geöffnet an `date` (bei Aufgaben über mehrere Tage gelten Haken und Stunden für diesen Tag).
 */
export type PanelState = { mode: 'new'; day: string } | { mode: 'edit'; day: string; id: string; date: string };

/** Zustand des Aufgaben-Fensters einer Seite (Todos, Startseite). */
export function useTaskPanel(tasks: TaskMap) {
  const [panel, setPanel] = useState<PanelState | null>(null);
  const task = panel?.mode === 'edit' ? (tasks[panel.day] ?? []).find((t) => t.id === panel.id) : undefined;

  // Die offene Aufgabe gibt es nicht mehr (gelöscht, in einem anderen Tab geändert): Fenster zu.
  if (panel?.mode === 'edit' && !task) setPanel(null);
  // Der Tag liegt nach einer Änderung von „Bis“ nicht mehr in ihrem Zeitraum: auf den nächsten passenden.
  if (panel?.mode === 'edit' && task) {
    const end = lastDay(task, panel.day);
    const date = panel.date < panel.day ? panel.day : panel.date > end ? end : panel.date;
    if (date !== panel.date) setPanel({ ...panel, date });
  }

  const openNew = useCallback((day: string) => setPanel({ mode: 'new', day }), []);
  const openTask = useCallback(
    (day: string, id: string, date: string) => setPanel({ mode: 'edit', day, id, date }),
    [],
  );
  const close = useCallback(() => setPanel(null), []);
  /** Nach einem „Bis“ vor dem Starttag beginnt die Aufgabe an einem anderen Tag. */
  const moveTo = useCallback((day: string) => setPanel((p) => (p && p.day !== day ? { ...p, day } : p)), []);

  return { panel, task, openNew, openTask, close, moveTo };
}
