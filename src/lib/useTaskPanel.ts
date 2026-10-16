import { useCallback, useState } from 'react';

import type { TaskMap } from './useTasks';

/** Was das Aufgaben-Fenster zeigt: eine neue Aufgabe für `day` oder eine bestehende. */
export type PanelState = { mode: 'new'; day: string } | { mode: 'edit'; day: string; id: string };

/** Zustand des Aufgaben-Fensters einer Seite (Todos, Startseite). */
export function useTaskPanel(tasks: TaskMap) {
  const [panel, setPanel] = useState<PanelState | null>(null);
  const task = panel?.mode === 'edit' ? (tasks[panel.day] ?? []).find((t) => t.id === panel.id) : undefined;

  // Die offene Aufgabe gibt es nicht mehr (gelöscht, in einem anderen Tab geändert): Fenster zu.
  if (panel?.mode === 'edit' && !task) setPanel(null);

  const openNew = useCallback((day: string) => setPanel({ mode: 'new', day }), []);
  const openTask = useCallback((day: string, id: string) => setPanel({ mode: 'edit', day, id }), []);
  const close = useCallback(() => setPanel(null), []);
  /** Nach einer neuen Fälligkeit liegt die Aufgabe an einem anderen Tag. */
  const moveTo = useCallback((day: string) => setPanel((p) => (p ? { ...p, day } : p)), []);

  return { panel, task, openNew, openTask, close, moveTo };
}
