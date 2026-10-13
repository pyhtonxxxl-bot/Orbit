import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

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

export function useTasks() {
  const [tasks, setTasks] = useState<TaskMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setTasks(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
  }, [tasks, ready]);

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

  return { tasks, ready, add, toggle, remove };
}
