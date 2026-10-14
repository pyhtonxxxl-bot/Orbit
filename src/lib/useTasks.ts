import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

/** Aufgaben pro Tag, Schlüssel ist `dateKey()`. */
type TaskMap = Record<string, Task[]>;

const STORAGE_KEY = 'orbit.tasks.v1';

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

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

export function useTasks() {
  const [tasks, setTasks] = useState<TaskMap>({});
  // `loaded`: Lesen ist fertig (die UI darf erscheinen). `canSave`: Lesen hat geklappt, Speichern ist sicher.
  const [loaded, setLoaded] = useState(false);
  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (raw) {
          try {
            setTasks(parseTasks(raw));
          } catch {
            // Kaputte Daten sichern, bevor sie beim nächsten Speichern überschrieben werden.
            await AsyncStorage.setItem(`${STORAGE_KEY}.corrupt`, raw).catch(() => {});
          }
        }
        setCanSave(true);
      })
      // Lesen fehlgeschlagen: nicht speichern, damit nie `{}` über echte Daten geschrieben wird.
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!canSave) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
  }, [tasks, canSave]);

  // Im Browser: Änderungen aus einem anderen Tab übernehmen, statt sie später zu überschreiben.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      try {
        setTasks(e.newValue ? parseTasks(e.newValue) : {});
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((day: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task: Task = { id: newId(), title: trimmed, done: false, createdAt: Date.now() };
    setTasks((prev) => ({ ...prev, [day]: [...(prev[day] ?? []), task] }));
  }, []);

  const toggle = useCallback((day: string, id: string) => {
    setTasks((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }, []);

  const remove = useCallback((day: string, id: string) => {
    setTasks((prev) => ({ ...prev, [day]: (prev[day] ?? []).filter((t) => t.id !== id) }));
  }, []);

  return { tasks, loaded, add, toggle, remove };
}
