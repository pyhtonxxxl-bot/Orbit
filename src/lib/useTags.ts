import { useCallback } from 'react';

import { newId, useStoredState } from './storage';

export type Tag = { id: string; name: string };

const STORAGE_KEY = 'orbit.tags.v1';
// Für den Anfang, in den Einstellungen änderbar.
const DEFAULT_TAGS: Tag[] = [
  { id: 'schule', name: 'Schule' },
  { id: 'arbeit', name: 'Arbeit' },
  { id: 'privat', name: 'Privat' },
];

function isTag(value: unknown): value is Tag {
  const t = value as Partial<Tag> | null;
  return !!t && typeof t.id === 'string' && typeof t.name === 'string';
}

/** Liest gespeicherte Tags. Wirft, wenn sie nicht lesbar sind. */
function parseTags(raw: string): Tag[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Unerwartetes Format');
  return parsed.filter(isTag);
}

/** Tags für Aufgaben (z. B. „Schule“), bearbeitbar in den Einstellungen. */
export function useTags() {
  const { value: tags, setValue: setTags, loaded } = useStoredState(STORAGE_KEY, parseTags, DEFAULT_TAGS);

  const add = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setTags((prev) =>
        prev.some((t) => t.name.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, { id: newId(), name: trimmed }],
      );
    },
    [setTags],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t)));
    },
    [setTags],
  );

  /** Löscht den Tag. Aufgaben behalten die ID, sie wird einfach nicht mehr angezeigt. */
  const remove = useCallback(
    (id: string) => {
      setTags((prev) => prev.filter((t) => t.id !== id));
    },
    [setTags],
  );

  return { tags, loaded, add, rename, remove };
}
