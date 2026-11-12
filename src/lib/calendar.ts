// Kalender: Termine (z. B. aus Google) und Vorschläge, die daraus für Todos und Habits werden.
// Reine Funktionen ohne React. Die Regeln hier laufen immer auf dem Gerät; mit KI (siehe ai.ts) kommen
// die Vorschläge stattdessen von Claude, haben aber dieselbe Form.

import { addDays, dateKey, fromDateKey } from './date';

/** Ein Termin, so wie Orbit ihn kennt. Zeiten in Ortszeit. */
export type CalendarEvent = {
  id: string;
  title: string;
  /** `dateKey` des Tages. */
  day: string;
  /** Minuten seit Mitternacht, fehlt bei ganztägigen Terminen. */
  start?: number;
  end?: number;
  allDay: boolean;
  /** Gleiche Serie = gleiche ID (wiederkehrende Termine). */
  seriesId: string;
  recurring: boolean;
  /** Name des Kalenders, z. B. „Schule“. */
  calendar?: string;
};

export type SuggestionKind = 'todo' | 'habit';

export type Suggestion = {
  /** Stabil über mehrere Abrufe, damit Ignoriertes nicht wiederkommt. */
  key: string;
  kind: SuggestionKind;
  title: string;
  /** Todo: Starttag (`dateKey`). */
  day?: string;
  /** Todo: Bis (`dateKey`), wenn es über mehrere Tage geht. */
  due?: string;
  /** Habit: Wochentage, 0 = Montag. */
  days?: number[];
  /** Warum, kurz. */
  reason: string;
  source: 'regel' | 'ki';
  /** Termine, aus denen der Vorschlag kommt. */
  eventIds: string[];
};

/** So weit schaut Orbit in den Kalender. */
export const WINDOW_DAYS = 14;

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

/** Wochentag eines `dateKey`, 0 = Montag. */
export function weekdayOf(day: string): number {
  return (fromDateKey(day).getDay() + 6) % 7;
}

/** `Do 14. Nov.` */
export function formatDay(day: string): string {
  const d = fromDateKey(day);
  return `${WEEKDAYS_SHORT[weekdayOf(day)]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/** `09:30` */
export function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** `Mo, Do` */
export function formatWeekdays(days: number[]): string {
  if (days.length === 7) return 'jeden Tag';
  return [...days].sort((a, b) => a - b).map((d) => WEEKDAYS_SHORT[d]).join(', ');
}

// ---------------------------------------------------------------------------------------------
// Google Kalender → CalendarEvent

/** Der Teil eines Google-Termins, den Orbit braucht (Calendar API v3, `events.list` mit `singleEvents`). */
export type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  recurringEventId?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

/** `2026-11-14T09:30:00+01:00` → Tag und Minuten in Ortszeit. */
function localParts(iso: string): { day: string; minutes: number } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { day: dateKey(d), minutes: d.getHours() * 60 + d.getMinutes() };
}

/** Wandelt Google-Termine um. Abgesagte und kaputte fallen weg. */
export function fromGoogle(items: GoogleEvent[], calendar?: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const item of items) {
    if (!item.id || item.status === 'cancelled' || !item.start) continue;
    const title = (item.summary ?? '').trim() || 'Termin ohne Titel';
    const seriesId = item.recurringEventId ?? item.id;
    const recurring = !!item.recurringEventId;
    if (item.start.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.start.date)) continue;
      out.push({ id: item.id, title, day: item.start.date, allDay: true, seriesId, recurring, calendar });
      continue;
    }
    const start = item.start.dateTime ? localParts(item.start.dateTime) : null;
    if (!start) continue;
    const end = item.end?.dateTime ? localParts(item.end.dateTime) : null;
    out.push({
      id: item.id,
      title,
      day: start.day,
      start: start.minutes,
      end: end && end.day === start.day ? end.minutes : undefined,
      allDay: false,
      seriesId,
      recurring,
      calendar,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Regeln: aus Terminen Vorschläge machen (ohne KI)

/** Klingt nach etwas, das man vorbereiten muss, und wie viele Tage vorher es losgeht. */
// Lange Wörter auch mitten im Wort („Matheklausur“), kurze nur als ganzes Wort („Test“, nicht „Testament“).
const PREPARE: [RegExp, number, string][] = [
  [/(klausur|prüfung|pruefung|klassenarbeit|\bexam|\btest\b|\babi(tur)?\b)/i, 5, 'Lernen'],
  [/(referat|präsentation|praesentation|vortrag|presentation|\bpitch\b)/i, 3, 'Vorbereiten'],
  [/(abgabe|deadline|\bfrist|fällig|faellig|einreichen|bewerbung)/i, 3, 'Fertig machen'],
];

/** Klingt nach etwas, das man regelmäßig selbst tut: dann eher ein Habit als ein Termin. */
const HABIT =
  /(training|trainieren|\bsport\b|\bgym\b|fitness|\blaufen|joggen|yoga|schwimmen|fußball|fussball|\blernen|\büben|\bueben|\blesen\b|meditation|meditieren|klavier|gitarre|vokabeln|hausaufgaben|workout|radfahren)/i;

const BIRTHDAY = /(geburtstag|birthday|\bbday\b)/i;

/** Normalisierter Titel zum Vergleichen: klein, ohne Satzzeichen. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, ' ')
    .trim();
}

/** Steht das schon als Todo oder Habit da? `existing` sind normalisierte Titel. */
export function alreadyThere(title: string, existing: Set<string>): boolean {
  const t = normalizeTitle(title);
  if (!t) return true;
  for (const e of existing) if (e === t || (e.length > 3 && (e.includes(t) || t.includes(e)))) return true;
  return false;
}

export type Existing = {
  /** Titel vorhandener Todos und Habits. */
  titles: string[];
};

/**
 * Vorschläge nach festen Regeln, ganz ohne KI:
 * - Prüfungen, Referate, Abgaben: ein Todo „Lernen: …“ ab ein paar Tagen vorher, Bis = der Termin.
 * - Geburtstage: ein Todo „Geschenk: …“ ab vier Tagen vorher.
 * - Wiederkehrendes, das nach eigenem Tun klingt (Training, Lernen, Lesen …): ein Habit an diesen Wochentagen.
 * - Andere einzelne Termine: ein Todo an dem Tag, mit Uhrzeit im Titel.
 * Wiederkehrende Termine wie Unterricht oder Meetings werden übersprungen, das kann die KI besser einschätzen.
 */
export function suggestByRules(events: CalendarEvent[], today: string, existing: Existing): Suggestion[] {
  const last = dateKey(addDays(fromDateKey(today), WINDOW_DAYS));
  const upcoming = events.filter((e) => e.day >= today && e.day <= last).sort((a, b) => (a.day + pad(a.start)).localeCompare(b.day + pad(b.start)));
  const existingTitles = new Set(existing.titles.map(normalizeTitle).filter(Boolean));
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion) => {
    if (seen.has(s.key) || alreadyThere(s.title, existingTitles)) return;
    seen.add(s.key);
    out.push(s);
  };

  // Serien zusammenfassen: welche Wochentage, welche Termine.
  const series = new Map<string, CalendarEvent[]>();
  for (const e of upcoming) {
    const list = series.get(e.seriesId) ?? [];
    list.push(e);
    series.set(e.seriesId, list);
  }

  for (const [seriesId, list] of series) {
    const first = list[0];
    const repeating = first.recurring || list.length > 1;
    if (repeating) {
      if (!HABIT.test(first.title)) continue;
      const days = [...new Set(list.map((e) => weekdayOf(e.day)))].sort((a, b) => a - b);
      push({
        key: `habit:${seriesId}`,
        kind: 'habit',
        title: first.title,
        days,
        reason: `Steht regelmäßig im Kalender (${formatWeekdays(days)}).`,
        source: 'regel',
        eventIds: list.map((e) => e.id),
      });
      continue;
    }

    const prepare = PREPARE.find(([re]) => re.test(first.title));
    if (prepare) {
      const [, before, verb] = prepare;
      const start = maxDay(today, dateKey(addDays(fromDateKey(first.day), -before)));
      push({
        key: `todo:${first.id}`,
        kind: 'todo',
        title: `${verb}: ${first.title}`,
        day: start,
        due: first.day > start ? first.day : undefined,
        reason: `${sentence(`${first.title} am ${formatDay(first.day)}`)} Orbit plant die Vorbereitung ab ${formatDay(start)} ein.`,
        source: 'regel',
        eventIds: [first.id],
      });
      continue;
    }

    if (BIRTHDAY.test(first.title)) {
      const start = maxDay(today, dateKey(addDays(fromDateKey(first.day), -4)));
      push({
        key: `todo:${first.id}`,
        kind: 'todo',
        title: `Geschenk: ${first.title}`,
        day: start,
        due: first.day > start ? first.day : undefined,
        reason: sentence(`${first.title} am ${formatDay(first.day)}`),
        source: 'regel',
        eventIds: [first.id],
      });
      continue;
    }

    // Ganztägige Einzeltermine (Urlaub, Feiertage) sind meist keine Aufgabe.
    if (first.allDay) continue;
    push({
      key: `todo:${first.id}`,
      kind: 'todo',
      title: first.start !== undefined ? `${first.title} (${formatMinutes(first.start)})` : first.title,
      day: first.day,
      reason: sentence(`Termin am ${formatDay(first.day)}${first.start !== undefined ? ` um ${formatMinutes(first.start)}` : ''}`),
      source: 'regel',
      eventIds: [first.id],
    });
  }
  return out.slice(0, 40);
}

/** Punkt ans Ende, außer der Text endet schon mit einem (z. B. „Nov.“). */
function sentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`;
}

function pad(minutes?: number): string {
  return String(minutes ?? -1).padStart(5, '0');
}

function maxDay(a: string, b: string): string {
  return a > b ? a : b;
}
