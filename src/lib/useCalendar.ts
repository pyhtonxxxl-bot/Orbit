import { useCallback } from 'react';

import type { CalendarEvent, Suggestion } from './calendar';
import { useStoredState } from './storage';

/**
 * Kalender: zuletzt geholte Termine, offene Vorschläge und was schon entschieden ist.
 * Der Google-Zugang selbst wird nie gespeichert (nur im Speicher, siehe google.ts).
 */
export type CalendarState = {
  /** Eigene OAuth-Client-ID, falls keine im Build steckt. */
  clientId: string;
  /** KI-Vorschläge mit Claude statt nur nach Regeln. */
  useAi: boolean;
  /** Eigener Anthropic-API-Schlüssel. Bleibt auf diesem Gerät. */
  aiKey: string;
  events: CalendarEvent[];
  /** Wann zuletzt geholt (ms). */
  fetchedAt: number | null;
  suggestions: Suggestion[];
  /** Vorschläge, die übernommen oder ignoriert wurden (nach `key`), damit sie nicht wiederkommen. */
  decided: Record<string, 'accepted' | 'dismissed'>;
};

const STORAGE_KEY = 'orbit.calendar.v1';

const EMPTY: CalendarState = {
  clientId: '',
  useAi: false,
  aiKey: '',
  events: [],
  fetchedAt: null,
  suggestions: [],
  decided: {},
};

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDay = (v: unknown): v is string => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);

function parseEvent(raw: unknown): CalendarEvent | null {
  const e = raw as Partial<CalendarEvent> | null;
  if (!e || !isStr(e.id) || !isStr(e.title) || !isDay(e.day) || typeof e.allDay !== 'boolean' || !isStr(e.seriesId)) return null;
  // Feste Reihenfolge der Felder wie beim Speichern, sonst legt useStoredState bei jedem Laden eine Sicherung an.
  const out: CalendarEvent = { id: e.id, title: e.title, day: e.day, allDay: e.allDay, seriesId: e.seriesId, recurring: e.recurring === true };
  if (isNum(e.start)) out.start = e.start;
  if (isNum(e.end)) out.end = e.end;
  if (isStr(e.calendar)) out.calendar = e.calendar;
  return out;
}

function parseSuggestion(raw: unknown): Suggestion | null {
  const s = raw as Partial<Suggestion> | null;
  if (!s || !isStr(s.key) || (s.kind !== 'todo' && s.kind !== 'habit') || !isStr(s.title) || !isStr(s.reason)) return null;
  const out: Suggestion = {
    key: s.key,
    kind: s.kind,
    title: s.title,
    reason: s.reason,
    source: s.source === 'ki' ? 'ki' : 'regel',
    eventIds: Array.isArray(s.eventIds) ? s.eventIds.filter(isStr) : [],
  };
  if (isDay(s.day)) out.day = s.day;
  if (isDay(s.due)) out.due = s.due;
  if (Array.isArray(s.days)) out.days = s.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return out;
}

/** Liest gespeicherte Daten. Wirft nur bei kaputtem JSON. */
function parseCalendar(raw: string): CalendarState {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Unerwartetes Format');
  const r = parsed as Record<string, unknown>;
  const decided: CalendarState['decided'] = {};
  if (r.decided && typeof r.decided === 'object') {
    for (const [key, value] of Object.entries(r.decided as Record<string, unknown>)) {
      if (value === 'accepted' || value === 'dismissed') decided[key] = value;
    }
  }
  return {
    clientId: isStr(r.clientId) ? r.clientId : '',
    useAi: r.useAi === true,
    aiKey: isStr(r.aiKey) ? r.aiKey : '',
    events: Array.isArray(r.events) ? r.events.map(parseEvent).filter((e): e is CalendarEvent => !!e) : [],
    fetchedAt: isNum(r.fetchedAt) ? r.fetchedAt : null,
    suggestions: Array.isArray(r.suggestions) ? r.suggestions.map(parseSuggestion).filter((s): s is Suggestion => !!s) : [],
    decided,
  };
}

// Gespeichert wird immer in der Form, die auch beim Einlesen herauskommt (gleiche Felder, gleiche Reihenfolge).
const canonicalEvents = (events: CalendarEvent[]) => events.map(parseEvent).filter((e): e is CalendarEvent => !!e);
const canonicalSuggestions = (list: Suggestion[]) => list.map(parseSuggestion).filter((s): s is Suggestion => !!s);

/** Wie viele Entscheidungen Orbit sich merkt: genug für Monate, ohne dass der Speicher wächst. */
const KEEP_DECIDED = 500;

export function useCalendar() {
  const { value: calendar, setValue, loaded } = useStoredState(STORAGE_KEY, parseCalendar, EMPTY);

  const setSettings = useCallback(
    (patch: Partial<Pick<CalendarState, 'clientId' | 'useAi' | 'aiKey'>>) => setValue((c) => ({ ...c, ...patch })),
    [setValue],
  );

  /** Neue Termine und Vorschläge. Schon Entschiedenes fällt dabei weg. */
  const setFetched = useCallback(
    (events: CalendarEvent[], suggestions: Suggestion[]) =>
      setValue((c) => ({
        ...c,
        events: canonicalEvents(events),
        fetchedAt: Date.now(),
        suggestions: canonicalSuggestions(suggestions).filter((s) => !c.decided[s.key]),
      })),
    [setValue],
  );

  /** Vorschläge ersetzen (z. B. nachdem die KI geantwortet hat), ohne die Termine neu zu holen. */
  const setSuggestions = useCallback(
    (suggestions: Suggestion[]) =>
      setValue((c) => ({ ...c, suggestions: canonicalSuggestions(suggestions).filter((s) => !c.decided[s.key]) })),
    [setValue],
  );

  /** Übernommen oder ignoriert: aus der Liste und gemerkt. */
  const decide = useCallback(
    (key: string, decision: 'accepted' | 'dismissed') =>
      setValue((c) => {
        const entries = Object.entries({ ...c.decided, [key]: decision });
        return {
          ...c,
          suggestions: c.suggestions.filter((s) => s.key !== key),
          decided: Object.fromEntries(entries.slice(-KEEP_DECIDED)),
        };
      }),
    [setValue],
  );

  /** Verbindung lösen: Termine und offene Vorschläge vergessen, Einstellungen bleiben. */
  const clear = useCallback(() => setValue((c) => ({ ...c, events: [], fetchedAt: null, suggestions: [] })), [setValue]);

  return { calendar, loaded, setSettings, setFetched, setSuggestions, decide, clear };
}
