export const WEEKDAYS = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
];

const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Montag 00:00 der Woche, in der `date` liegt. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Stabiler Schlüssel für die Speicherung, in lokaler Zeit: `2026-10-13`. */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** `13. Oktober 2026` */
export function formatDate(date: Date): string {
  return `${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** `12.–18. Oktober 2026`, über Monats-/Jahresgrenzen `28. Dez. – 3. Jan. 2027`. */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()}.–${end.getDate()}. ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  const short = (d: Date) => {
    const name = MONTHS[d.getMonth()];
    return name.length > 4 ? `${name.slice(0, 3)}.` : name;
  };
  const startYear = weekStart.getFullYear() !== end.getFullYear() ? ` ${weekStart.getFullYear()}` : '';
  return `${weekStart.getDate()}. ${short(weekStart)}${startYear} – ${end.getDate()}. ${short(end)} ${end.getFullYear()}`;
}

/** `09:54` */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** ISO-8601 Kalenderwoche. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Umkehrung von `dateKey()`: `2026-10-13` → 13. Oktober 2026, 00:00 Ortszeit. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `Freitag, 16. Oktober 2026` */
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[(date.getDay() + 6) % 7]}, ${formatDate(date)}`;
}

/** `Oktober 2026` */
export function formatMonth(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
