import { useCallback } from 'react';

import {
  DEFAULT_PROFILE,
  INTENSITIES,
  MEAL_COUNT,
  MAX_PLAN_WINDOW,
  MEAL_INTERVAL,
  MUSCLE_GROUPS,
  mod,
  suggestMeals,
  suggestTraining,
  type MealLog,
  type MealPlan,
  type Profile,
  type Session,
  type TrainingPlan,
} from './health';
import { newId, useStoredState } from './storage';

/**
 * Health Zyklus: Profil, Plan für Essen und Training, abgehakte Mahlzeiten und eingetragene Trainings.
 * Alles bleibt auf dem Gerät. Ernährung und Training (kommen bald) lesen und schreiben später hier mit.
 */
export type Health = {
  /** Die Studien-Übersicht wurde mit „Verstanden“ bestätigt. */
  introSeen: boolean;
  /** Fehlt, solange der Zyklus noch nicht eingerichtet ist. */
  profile: Profile | null;
  meals: MealPlan;
  training: TrainingPlan;
  /** Ab diesem Tag (`dateKey`) zählt der Rhythmus. */
  since: string | null;
  eaten: MealLog;
  sessions: Session[];
};

const STORAGE_KEY = 'orbit.health.v1';

const EMPTY: Health = {
  introSeen: false,
  profile: null,
  meals: suggestMeals(DEFAULT_PROFILE, 0),
  training: suggestTraining(DEFAULT_PROFILE, suggestMeals(DEFAULT_PROFILE, 0), 0),
  since: null,
  eaten: {},
  sessions: [],
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Übernimmt nur bekannte Felder mit passendem Typ, alles andere fällt auf den Standard zurück. */
function parseProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const p: Profile = { ...DEFAULT_PROFILE };
  for (const key of Object.keys(DEFAULT_PROFILE) as (keyof Profile)[]) {
    const value = r[key];
    if (typeof value === typeof DEFAULT_PROFILE[key] && (typeof value !== 'number' || Number.isFinite(value))) {
      (p as Record<string, unknown>)[key] = value;
    }
  }
  if (p.sex !== 'female' && p.sex !== 'male') p.sex = DEFAULT_PROFILE.sex;
  if (!['halten', 'abnehmen', 'aufbauen'].includes(p.goal)) p.goal = 'halten';
  if (!['frueh', 'normal', 'spaet'].includes(p.chronotype)) p.chronotype = 'normal';
  if (!['neu', 'mittel', 'erfahren'].includes(p.experience)) p.experience = 'mittel';
  p.wake = mod(p.wake);
  p.sleep = mod(p.sleep);
  return p;
}

function parseMeals(raw: unknown): MealPlan {
  const r = (raw ?? {}) as Partial<MealPlan>;
  if (!isNum(r.first) || !isNum(r.count) || !isNum(r.interval)) return EMPTY.meals;
  const count = clamp(Math.round(r.count), MEAL_COUNT.min, MEAL_COUNT.max);
  const interval = clamp(r.interval, MEAL_INTERVAL.min, Math.min(MEAL_INTERVAL.max, MAX_PLAN_WINDOW / (count - 1)));
  return { first: mod(r.first), count, interval };
}

function parseTraining(raw: unknown): TrainingPlan {
  const r = (raw ?? {}) as Partial<TrainingPlan>;
  if (!isNum(r.start) || !isNum(r.duration) || !Array.isArray(r.days)) return EMPTY.training;
  const days = [...new Set(r.days.filter((d): d is number => isNum(d) && d >= 0 && d <= 6))].sort();
  return { days, start: mod(r.start), duration: clamp(r.duration, 15, 240) };
}

function parseEaten(raw: unknown): MealLog {
  if (!raw || typeof raw !== 'object') return {};
  const out: MealLog = {};
  for (const [day, entries] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !entries || typeof entries !== 'object') continue;
    for (const [index, entry] of Object.entries(entries as Record<string, unknown>)) {
      const e = entry as { planned?: unknown; at?: unknown } | null;
      if (!e || !isNum(e.planned) || !isNum(e.at)) continue;
      (out[day] ??= {})[index] = { planned: mod(e.planned), at: mod(e.at) };
    }
  }
  return out;
}

const GROUP_IDS = new Set<string>(MUSCLE_GROUPS.map((g) => g.id));
const INTENSITY_VALUES = new Set<number>(INTENSITIES.map((i) => i.value));

function parseSessions(raw: unknown): Session[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s): Session[] => {
    const r = s as Partial<Session> | null;
    if (!r || typeof r.id !== 'string' || !isNum(r.at) || !Array.isArray(r.groups) || !isNum(r.intensity)) return [];
    const groups = r.groups.filter((g) => GROUP_IDS.has(g));
    if (!groups.length || !INTENSITY_VALUES.has(r.intensity)) return [];
    return [{ id: r.id, at: r.at, groups, intensity: r.intensity }];
  });
}

/** Liest gespeicherte Daten. Wirft nur bei kaputtem JSON, einzelne unbrauchbare Felder fallen auf den Standard. */
function parseHealth(raw: string): Health {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Unerwartetes Format');
  const r = parsed as Record<string, unknown>;
  return {
    introSeen: r.introSeen === true,
    profile: parseProfile(r.profile),
    meals: parseMeals(r.meals),
    training: parseTraining(r.training),
    since: typeof r.since === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.since) ? r.since : null,
    eaten: parseEaten(r.eaten),
    sessions: parseSessions(r.sessions),
  };
}

/** Trainings, die älter sind, spielen für die Erholung keine Rolle mehr und fallen beim Speichern weg. */
const KEEP_SESSIONS_MS = 60 * 24 * 3_600_000;

export function useHealth() {
  const { value: health, setValue, loaded } = useStoredState(STORAGE_KEY, parseHealth, EMPTY);

  const confirmIntro = useCallback(() => setValue((h) => ({ ...h, introSeen: true })), [setValue]);

  /** Profil und Plan speichern. Ab heute zählt der Rhythmus, wenn er nicht schon läuft. */
  const save = useCallback(
    (profile: Profile, meals: MealPlan, training: TrainingPlan, today: string) =>
      setValue((h) => ({ ...h, profile, meals, training, since: h.since ?? today })),
    [setValue],
  );

  /** Mahlzeit abhaken (mit der Uhrzeit, zu der gegessen wurde) oder den Haken wegnehmen. */
  const toggleMeal = useCallback(
    (day: string, index: number, planned: number, at: number) =>
      setValue((h) => {
        const entries = { ...h.eaten[day] };
        if (entries[index]) delete entries[index];
        else entries[index] = { planned, at };
        const eaten = { ...h.eaten, [day]: entries };
        if (!Object.keys(entries).length) delete eaten[day];
        return { ...h, eaten };
      }),
    [setValue],
  );

  /** Uhrzeit einer abgehakten Mahlzeit ändern (z. B. „war pünktlich“). */
  const setMealTime = useCallback(
    (day: string, index: number, at: number) =>
      setValue((h) => {
        const entry = h.eaten[day]?.[index];
        if (!entry) return h;
        return { ...h, eaten: { ...h.eaten, [day]: { ...h.eaten[day], [index]: { ...entry, at: mod(at) } } } };
      }),
    [setValue],
  );

  const addSession = useCallback(
    (session: Omit<Session, 'id'>) =>
      setValue((h) => {
        const cutoff = Date.now() - KEEP_SESSIONS_MS;
        const sessions = [...h.sessions.filter((s) => s.at >= cutoff), { ...session, id: newId() }];
        return { ...h, sessions: sessions.sort((a, b) => a.at - b.at) };
      }),
    [setValue],
  );

  const removeSession = useCallback(
    (id: string) => setValue((h) => ({ ...h, sessions: h.sessions.filter((s) => s.id !== id) })),
    [setValue],
  );

  return { health, loaded, confirmIntro, save, toggleMeal, setMealTime, addSession, removeSession };
}
