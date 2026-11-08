// Health Zyklus: alles, was gerechnet wird. Reine Funktionen ohne React, damit sie leicht zu prüfen sind.
// Die Zahlen stammen aus den Studien in `studies.ts` (Nummern in eckigen Klammern verweisen dorthin).
// Uhrzeiten sind Minuten seit Mitternacht (0 bis 1439), Zeitpunkte von Trainings Millisekunden (Date.now()).

export const DAY = 1440;
const HOUR = 60;

/** Auf den Tag zurückrechnen: −30 → 23:30, 1500 → 01:00. */
export function mod(minutes: number): number {
  return ((Math.round(minutes) % DAY) + DAY) % DAY;
}

/** Auf Viertelstunden runden, wie beim Drehen am Rad. */
export function snap(minutes: number, step = 15): number {
  return mod(Math.round(minutes / step) * step);
}

/** `07:30` */
export function formatClock(minutes: number): string {
  const m = mod(minutes);
  return `${String(Math.floor(m / HOUR)).padStart(2, '0')}:${String(m % HOUR).padStart(2, '0')}`;
}

/** `2 Std. 10 Min.`, `45 Min.`, `3 Std.` */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / HOUR);
  const rest = m % HOUR;
  if (h === 0) return `${rest} Min.`;
  return rest === 0 ? `${h} Std.` : `${h} Std. ${rest} Min.`;
}

/** Abstand von `from` bis `to` im Uhrzeigersinn, über Mitternacht hinweg (0 bis 1439). */
export function span(from: number, to: number): number {
  return mod(to - from);
}

/** Liegt `t` im Bogen von `start` bis `end` (im Uhrzeigersinn, über Mitternacht hinweg)? */
export function within(t: number, start: number, end: number): boolean {
  return span(start, t) < span(start, end);
}

/** Minuten seit Mitternacht für einen Zeitpunkt. */
export function minutesOf(date: Date): number {
  return date.getHours() * HOUR + date.getMinutes();
}

// ---------------------------------------------------------------------------------------------
// Profil

export type Sex = 'female' | 'male';
export type Goal = 'halten' | 'abnehmen' | 'aufbauen';
export type Chronotype = 'frueh' | 'normal' | 'spaet';
export type Experience = 'neu' | 'mittel' | 'erfahren';

export type Profile = {
  sex: Sex;
  age: number;
  /** cm */
  height: number;
  /** kg */
  weight: number;
  /** Index in `ACTIVITY_LEVELS`. */
  activity: number;
  goal: Goal;
  /** Aufstehen und Schlafengehen (Minuten seit Mitternacht). */
  wake: number;
  sleep: number;
  chronotype: Chronotype;
  experience: Experience;
  /** Gewohnheiten */
  breakfast: boolean;
  shiftWork: boolean;
  lateCaffeine: boolean;
  /** Gesundheit: nur für Hinweise, nichts davon verlässt das Gerät. */
  medication: boolean;
  medicationWithFood: boolean;
  medicationNote: string;
  diabetes: boolean;
  pregnant: boolean;
  /** Essstörung (auch früher) oder einfach keine Kalorien sehen wollen: dann keine Zahlen und kein Defizit. */
  hideNumbers: boolean;
  notes: string;
};

export const DEFAULT_PROFILE: Profile = {
  sex: 'female',
  age: 25,
  height: 170,
  weight: 65,
  activity: 1,
  goal: 'halten',
  wake: 7 * HOUR,
  sleep: 23 * HOUR,
  chronotype: 'normal',
  experience: 'mittel',
  breakfast: true,
  shiftWork: false,
  lateCaffeine: false,
  medication: false,
  medicationWithFood: false,
  medicationNote: '',
  diabetes: false,
  pregnant: false,
  hideNumbers: false,
  notes: '',
};

/** Alltag als PAL-Wert (Vielfaches des Grundumsatzes), Stufen wie bei EFSA und DGE [efsa2013energy, dge_pal]. */
export const ACTIVITY_LEVELS = [
  { pal: 1.4, label: 'Viel sitzen', hint: 'Schule, Büro, in der Freizeit wenig Bewegung' },
  { pal: 1.6, label: 'Sitzen und gehen', hint: 'Meist sitzend, zwischendurch gehen und stehen' },
  { pal: 1.8, label: 'Viel auf den Beinen', hint: 'Überwiegend gehen und stehen, z. B. Verkauf, Pflege' },
  { pal: 2.0, label: 'Körperlich schwer', hint: 'Bau, Landwirtschaft, schwer heben' },
] as const;

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'halten', label: 'Gewicht halten' },
  { value: 'abnehmen', label: 'Abnehmen' },
  { value: 'aufbauen', label: 'Muskeln aufbauen' },
];

export const CHRONOTYPES: { value: Chronotype; label: string; hint: string }[] = [
  { value: 'frueh', label: 'Früh wach', hint: 'Morgens fit, abends früh müde' },
  { value: 'normal', label: 'Dazwischen', hint: 'Weder Lerche noch Eule' },
  { value: 'spaet', label: 'Nachteule', hint: 'Morgens zäh, abends fit' },
];

export const EXPERIENCE: { value: Experience; label: string; hint: string }[] = [
  { value: 'neu', label: 'Neu dabei', hint: 'Weniger als ein halbes Jahr' },
  { value: 'mittel', label: 'Regelmäßig', hint: 'Ein halbes bis zwei Jahre' },
  { value: 'erfahren', label: 'Erfahren', hint: 'Mehr als zwei Jahre' },
];

/** Stunden zwischen Schlafengehen und Aufstehen. */
export function sleepHours(p: Pick<Profile, 'sleep' | 'wake'>): number {
  return span(p.sleep, p.wake) / HOUR;
}

/** Wach von `wake` bis `sleep`, in Minuten. */
export function awakeMinutes(p: Pick<Profile, 'sleep' | 'wake'>): number {
  return span(p.wake, p.sleep);
}

// ---------------------------------------------------------------------------------------------
// Wie viel: Energie und Eiweiß

/** Grundumsatz nach Mifflin-St Jeor in kcal pro Tag, bei den meisten auf ±10 % genau [mifflin1990, frankenfield2005]. */
export function restingEnergy(p: Pick<Profile, 'sex' | 'age' | 'height' | 'weight'>): number {
  return 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

/** PAL aus Alltag plus Sport: 4 bis 5 Mal pro Woche 30 bis 60 Minuten zählt etwa +0,3, 2 bis 3 Mal die Hälfte [dge_pal]. */
export function palOf(p: Pick<Profile, 'activity'>, trainingDays: number): number {
  const base = ACTIVITY_LEVELS[Math.min(ACTIVITY_LEVELS.length - 1, Math.max(0, p.activity))].pal;
  const sport = trainingDays >= 4 ? 0.3 : trainingDays >= 2 ? 0.15 : 0;
  return Math.min(2.4, base + sport);
}

/** Warum ein Ziel nicht gerechnet wird (Jugendliche, Schwangerschaft, Essstörung): dann wird „halten“ daraus. */
export function goalBlocked(p: Profile): string | null {
  if (p.goal === 'halten') return null;
  if (p.age < 18) return 'Unter 18 rechnet Orbit kein Abnehmen oder Zunehmen: dein Körper wächst noch. Sprich das mit deiner Ärztin oder deinem Arzt ab.';
  if (p.pregnant) return 'In Schwangerschaft und Stillzeit rechnet Orbit kein Defizit oder Plus. Der Bedarf ist anders, das klärt deine Hebamme oder Ärztin.';
  if (p.hideNumbers && p.goal === 'abnehmen') return 'Ohne Kalorien-Zahlen rechnet Orbit auch kein Defizit.';
  return null;
}

export type Targets = {
  /** Grundumsatz */
  resting: number;
  pal: number;
  /** Gesamtbedarf ohne Ziel */
  maintenance: number;
  /** Mit Ziel (Defizit oder Plus) */
  energy: number;
  /** g pro kg Körpergewicht und Tag */
  proteinPerKg: number;
  /** g pro Tag */
  protein: number;
  goal: Goal;
};

function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Eigene Sicherheitsgrenze beim Abnehmen: das untere Ende der Zielwerte in der US-Leitlinie [jensen2014]. */
const MIN_ENERGY: Record<Sex, number> = { female: 1200, male: 1500 };

/**
 * Tagesziel: Grundumsatz × PAL, dazu das Ziel. Abnehmen: etwa 500 kcal weniger [jensen2014], höchstens 20 %, nie unter
 * den Grundumsatz und nie unter 1.200 (Frauen) bzw. 1.500 kcal (Männer). Aufbauen: ein vorsichtiges Plus von etwa
 * 300 kcal [slater2019]. Eiweiß: 0,8 g/kg, ab 65 1,0 g/kg [richter2019]; wer zweimal oder öfter pro Woche trainiert,
 * um 1,6 g/kg [morton2018], im Defizit 2,0 g/kg, damit die Muskeln bleiben [jager2017, helms2014].
 */
export function targets(p: Profile, trainingDays: number): Targets {
  const resting = restingEnergy(p);
  const pal = palOf(p, trainingDays);
  const maintenance = resting * pal;
  const goal: Goal = goalBlocked(p) ? 'halten' : p.goal;
  let energy = maintenance;
  if (goal === 'abnehmen') {
    const floor = Math.max(resting, MIN_ENERGY[p.sex]);
    energy = Math.max(Math.min(floor, maintenance), maintenance - Math.min(500, maintenance * 0.2));
  }
  if (goal === 'aufbauen') energy = maintenance + 300;
  const trains = trainingDays >= 2;
  const proteinPerKg = trains ? (goal === 'abnehmen' ? 2.0 : 1.6) : p.age >= 65 ? 1.0 : 0.8;
  return {
    resting: round(resting, 10),
    pal,
    maintenance: round(maintenance, 50),
    energy: round(energy, 50),
    proteinPerKg,
    protein: round(proteinPerKg * p.weight, 5),
    goal,
  };
}

/** `2.350` */
export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ---------------------------------------------------------------------------------------------
// Wann: Mahlzeiten

export type MealPlan = {
  /** Erste Mahlzeit (Minuten seit Mitternacht). */
  first: number;
  /** Anzahl Mahlzeiten pro Tag. */
  count: number;
  /** Abstand zwischen zwei Mahlzeiten in Minuten. */
  interval: number;
};

export const MEAL_COUNT = { min: 2, max: 6 };
export const MEAL_INTERVAL = { min: 2 * HOUR, max: 6 * HOUR, step: 30 };
/** Mehr als 18 Stunden von der ersten bis zur letzten Mahlzeit lässt das Rad nicht zu, sonst bliebe keine Nacht. */
export const MAX_PLAN_WINDOW = 18 * HOUR;

/** Alle Uhrzeiten des Plans. */
export function mealTimes(plan: MealPlan): number[] {
  return Array.from({ length: plan.count }, (_, i) => mod(plan.first + i * plan.interval));
}

/** Vom ersten bis zum letzten Bissen, in Minuten. */
export function eatingWindow(plan: MealPlan): number {
  return (plan.count - 1) * plan.interval;
}

const MEAL_NAMES: [number, string][] = [
  [4 * HOUR, 'Frühstück'],
  [10 * HOUR + 30, 'Vormittags'],
  [12 * HOUR, 'Mittagessen'],
  [14 * HOUR + 30, 'Nachmittags'],
  [17 * HOUR + 30, 'Abendessen'],
  [22 * HOUR, 'Spät'],
];

function nameAt(minutes: number): string {
  let name = 'Spät';
  for (const [from, label] of MEAL_NAMES) if (minutes >= from) name = label;
  return minutes < 4 * HOUR ? 'Spät' : name;
}

/** Namen nach Uhrzeit, doppelte bekommen eine Nummer: „Nachmittags“, „Nachmittags 2“. */
export function mealNames(times: number[]): string[] {
  const seen = new Map<string, number>();
  return times.map((t) => {
    const base = nameAt(t);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} ${n}`;
  });
}

/**
 * Anteile der Mahlzeiten am Tag: früh etwas mehr, abends weniger. Bei 3 Mahlzeiten etwa 40/33/27 %. Das macht nicht
 * schneller schlank, aber satter über den Tag [ruddickcollins2022, jakubowicz2013]. Bewusst nur leicht schräg.
 */
export function mealShares(count: number): number[] {
  if (count <= 1) return [1];
  const weights = Array.from({ length: count }, (_, i) => 1.2 - (0.4 * i) / (count - 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

/** So viel Abstand zum Schlafen hält die letzte Mahlzeit ein (Minuten) [garaulet2022, katz2022]. */
export const LAST_MEAL_BEFORE_SLEEP = 3 * HOUR;
/** Längstes Essfenster, das Orbit vorschlägt (Minuten) [gillpanda2015]. */
export const MAX_EATING_WINDOW = 12 * HOUR;

/**
 * Vorschlag: erste Mahlzeit eine Stunde nach dem Aufstehen (wer nicht frühstückt: nach zwei), letzte spätestens
 * drei Stunden vor dem Schlafen, dazwischen gleiche Abstände von 3 bis 5 Stunden (Faustregel, eine Leitlinie mit einer
 * Zahl gibt es nicht), alles in höchstens 12 Stunden. Wer trainiert, bekommt 4 Mahlzeiten, damit sich das Eiweiß gut
 * verteilt [areta2013, schoenfeld2018].
 */
export function suggestMeals(p: Profile, trainingDays: number): MealPlan {
  const first = snap(p.wake + (p.breakfast ? HOUR : 2 * HOUR), 30);
  const latest = p.sleep - LAST_MEAL_BEFORE_SLEEP;
  const room = Math.min(MAX_EATING_WINDOW, span(first, latest));
  const count = trainingDays >= 2 && room >= 9 * HOUR ? 4 : room >= 6 * HOUR ? 3 : 2;
  const raw = room / Math.max(1, count - 1);
  const interval = Math.min(5 * HOUR, Math.max(3 * HOUR, Math.floor(raw / 30) * 30));
  return { first, count, interval: Math.min(interval, MEAL_INTERVAL.max) };
}

export type Advice = {
  /** `warn`: passt nicht zu den Empfehlungen, `info`: nur ein Hinweis. */
  level: 'warn' | 'info';
  text: string;
  /** IDs aus `SOURCES` in `studies.ts`. */
  sources: string[];
};

/** Was am gewählten Plan nicht zu den Studien passt. */
export function checkMeals(p: Profile, plan: MealPlan): Advice[] {
  const out: Advice[] = [];
  const times = mealTimes(plan);
  const last = times[times.length - 1];
  const asleep = times.filter((t) => within(t, p.sleep, p.wake));
  if (asleep.length) {
    out.push({ level: 'warn', text: `${asleep.length === 1 ? 'Eine Mahlzeit fällt' : `${asleep.length} Mahlzeiten fallen`} in deine Schlafzeit.`, sources: [] });
  } else {
    const gap = span(last, p.sleep);
    if (gap < 2 * HOUR) {
      out.push({ level: 'warn', text: `Die letzte Mahlzeit liegt nur ${formatDuration(gap)} vor dem Schlafen. Drei Stunden Abstand sind besser.`, sources: ['garaulet2022', 'katz2022'] });
    }
    const afterWake = span(p.wake, times[0]);
    if (afterWake > 3 * HOUR) {
      out.push({ level: 'info', text: `Die erste Mahlzeit kommt ${formatDuration(afterWake)} nach dem Aufstehen. Das ist okay, wenn es jeden Tag gleich ist.`, sources: ['farshchi2005'] });
    }
  }
  if (eatingWindow(plan) > MAX_EATING_WINDOW) {
    out.push({ level: 'warn', text: `Dein Essfenster ist ${formatDuration(eatingWindow(plan))} lang. Unter 12 Stunden passt besser zum Tagesrhythmus.`, sources: ['gillpanda2015'] });
  }
  if (plan.interval > 5 * HOUR) {
    out.push({ level: 'info', text: `${formatDuration(plan.interval)} zwischen den Mahlzeiten ist eine lange Pause. Wenn du dann sehr hungrig bist, rück sie näher zusammen.`, sources: [] });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Wann: Training

export type TrainingPlan = {
  /** Wochentage 0 = Montag … 6 = Sonntag. */
  days: number[];
  /** Beginn (Minuten seit Mitternacht). */
  start: number;
  /** Dauer in Minuten. */
  duration: number;
};

/** Tage gleichmäßig über die Woche verteilt, damit jede Muskelgruppe dazwischen Pause hat [schoenfeld2016]. */
export function spreadDays(count: number): number[] {
  const presets: Record<number, number[]> = {
    0: [],
    1: [2],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return presets[Math.max(0, Math.min(7, Math.round(count)))];
}

/**
 * Wann der Körper am meisten Kraft hat: im Mittel am späten Nachmittag bis frühen Abend [knaier2022, mirizio2020].
 * Besser als die Uhrzeit sagt die Zeit seit dem Aufwachen das Hoch voraus: Frühtypen etwa 6, Mitteltypen etwa 9,
 * Nachteulen etwa 11 Stunden danach [facerchilds2015]. Angabe als Mitte des Trainings.
 */
export function performancePeak(p: Pick<Profile, 'chronotype' | 'wake'>): number {
  const after = p.chronotype === 'frueh' ? 6 : p.chronotype === 'spaet' ? 11 : 9;
  return mod(p.wake + after * HOUR);
}

/** Hartes Training mindestens so lange vor dem Schlafen beenden (Minuten) [stutz2019]. */
export const TRAINING_BEFORE_SLEEP = 60;
/** Nach einer Mahlzeit so lange warten, bevor es hart wird (Minuten) [thomas2016]. */
export const TRAINING_AFTER_MEAL = 90;

/**
 * Bestes Trainingsfenster für den Tag: so nah wie möglich am Leistungshoch, nicht direkt nach dem Essen und mit
 * genug Abstand zum Schlafen.
 */
export function suggestTrainingStart(p: Profile, meals: MealPlan, duration: number): number {
  const peak = performancePeak(p);
  const times = mealTimes(meals);
  let best = snap(peak - duration / 2, 30);
  let bestScore = Infinity;
  for (let offset = -6 * HOUR; offset <= 6 * HOUR; offset += 30) {
    const start = snap(peak - duration / 2 + offset, 30);
    const end = mod(start + duration);
    // Nur in der Wachzeit, mit Abstand zum Schlafen und ohne vollen Magen.
    if (!within(start, p.wake + HOUR, p.sleep) || !within(end, p.wake + HOUR, p.sleep - 2 * TRAINING_BEFORE_SLEEP + 1)) continue;
    const fullStomach = times.some((t) => span(t, start) < TRAINING_AFTER_MEAL || within(t, start, end));
    const score = Math.abs(offset) + (fullStomach ? 3 * HOUR : 0);
    if (score < bestScore) {
      bestScore = score;
      best = start;
    }
  }
  return best;
}

export function suggestTraining(p: Profile, meals: MealPlan, count: number): TrainingPlan {
  const duration = 60;
  return { days: spreadDays(count), start: suggestTrainingStart(p, meals, duration), duration };
}

/** Was am Trainingsplan nicht zu den Studien passt. */
export function checkTraining(p: Profile, meals: MealPlan, plan: TrainingPlan): Advice[] {
  const out: Advice[] = [];
  if (!plan.days.length) return out;
  const end = mod(plan.start + plan.duration);
  if (within(plan.start, p.sleep, p.wake) || within(end, p.sleep, p.wake)) {
    out.push({ level: 'warn', text: 'Das Training fällt in deine Schlafzeit.', sources: [] });
  } else if (span(end, p.sleep) < TRAINING_BEFORE_SLEEP) {
    out.push({ level: 'warn', text: `Nach dem Training bleiben nur ${formatDuration(span(end, p.sleep))} bis zum Schlafen. Training am Abend ist okay, nur sehr hartes in der letzten Stunde vor dem Einschlafen kann den Schlaf stören.`, sources: ['stutz2019'] });
  }
  const fullStomach = mealTimes(meals).find((t) => span(t, plan.start) < 60 && !within(t, plan.start, end));
  if (fullStomach !== undefined) {
    out.push({ level: 'info', text: `Das Training beginnt kurz nach der Mahlzeit um ${formatClock(fullStomach)}. Mit 1 bis 2 Stunden Abstand trainiert es sich leichter.`, sources: ['thomas2016'] });
  }
  const peak = performancePeak(p);
  const middle = mod(plan.start + plan.duration / 2);
  if (Math.min(span(middle, peak), span(peak, middle)) > 4 * HOUR) {
    out.push({ level: 'info', text: `Dein Leistungshoch liegt eher um ${formatClock(peak)}. Wichtiger ist aber, immer zur gleichen Zeit zu trainieren: der Körper gewöhnt sich daran.`, sources: ['chtourou2012', 'bruggisser2023'] });
  }
  if (plan.days.length >= 2) {
    const sorted = [...plan.days].sort((a, b) => a - b);
    const backToBack = sorted.some((d, i) => i > 0 && d - sorted[i - 1] === 1);
    if (backToBack && plan.days.length <= 4) {
      out.push({ level: 'info', text: 'An Tagen direkt hintereinander am besten verschiedene Muskelgruppen trainieren.', sources: ['schoenfeld2016'] });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Erholung und Superkompensation

export type MuscleGroup = 'brust' | 'ruecken' | 'schultern' | 'arme' | 'rumpf' | 'beine' | 'ausdauer';

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'brust', label: 'Brust' },
  { id: 'ruecken', label: 'Rücken' },
  { id: 'schultern', label: 'Schultern' },
  { id: 'arme', label: 'Arme' },
  { id: 'rumpf', label: 'Bauch und Rumpf' },
  { id: 'beine', label: 'Beine und Po' },
  { id: 'ausdauer', label: 'Ausdauer' },
];

export type Intensity = 1 | 2 | 3;
export const INTENSITIES: { value: Intensity; label: string; hint: string }[] = [
  { value: 1, label: 'Leicht', hint: 'Locker, noch viel Luft' },
  { value: 2, label: 'Mittel', hint: 'Fordernd, aber nicht am Limit' },
  { value: 3, label: 'Hart', hint: 'Bis kurz vors Muskelversagen, Muskelkater' },
];

export type Session = {
  id: string;
  /** Zeitpunkt (ms). */
  at: number;
  groups: MuscleGroup[];
  intensity: Intensity;
};

/**
 * Stunden bis zur Erholung nach Intensität. Kraft: 24/48/72, bis zum Muskelversagen dauert es länger
 * [morannavarro2017, phillips1997]. Ausdauer: 24/36/48 [stanley2013].
 */
const RECOVERY_HOURS: Record<'kraft' | 'ausdauer', Record<Intensity, number>> = {
  kraft: { 1: 24, 2: 48, 3: 72 },
  ausdauer: { 1: 24, 2: 36, 3: 48 },
};

/**
 * Danach das Fenster über dem alten Niveau (Superkompensation): eine Faustregel von 24 bis 48 Stunden. Eine Studie,
 * die genau dieses Fenster misst, gibt es nicht; der Nutzen einer Einheit verfällt über Wochen [kiely2018, bosquet2013].
 */
const WINDOW_HOURS: Record<Intensity, number> = { 1: 24, 2: 36, 3: 48 };

/**
 * Persönlicher Faktor, vorsichtig geschätzt: ab 50 und ab 65 etwas länger [borges2016], nach Nächten mit 6 Stunden
 * oder weniger deutlich länger [craven2022], am Anfang länger, mit Erfahrung etwas kürzer [phillips1997, acsm2009].
 */
export function recoveryFactor(p: Pick<Profile, 'age' | 'sleep' | 'wake' | 'experience'>): number {
  const age = p.age >= 65 ? 1.3 : p.age >= 50 ? 1.15 : 1;
  const hours = sleepHours(p);
  const sleep = hours <= 6 ? 1.25 : hours < 7 ? 1.1 : 1;
  const experience = p.experience === 'neu' ? 1.15 : p.experience === 'erfahren' ? 0.9 : 1;
  return age * sleep * experience;
}

export type Phase = 'frei' | 'erholung' | 'fenster' | 'bereit';

export type Recovery = {
  phase: Phase;
  /** Letztes Training dieser Gruppe, das zählt. */
  session?: Session;
  /** Ab hier erholt (ms). */
  recoveredAt?: number;
  /** Bis hier liegt das Fenster über dem alten Niveau (ms). */
  windowEnd?: number;
};

const H = 3_600_000;

/** Wie lange Erholung und Fenster für eine Gruppe nach einem Training dauern (Stunden). */
export function recoveryTimes(group: MuscleGroup, intensity: Intensity, factor: number) {
  const base = RECOVERY_HOURS[group === 'ausdauer' ? 'ausdauer' : 'kraft'][intensity];
  return { recover: base * factor, window: WINDOW_HOURS[intensity] };
}

/** Stand einer Muskelgruppe jetzt: frei (nie trainiert), noch in Erholung, im besten Fenster oder bereit. */
export function recoveryOf(group: MuscleGroup, sessions: Session[], factor: number, now: number): Recovery {
  let latest: Recovery | null = null;
  for (const s of sessions) {
    if (!s.groups.includes(group) || s.at > now) continue;
    const { recover, window } = recoveryTimes(group, s.intensity, factor);
    const recoveredAt = s.at + recover * H;
    // Es zählt das Training, das am längsten nachwirkt.
    if (!latest || recoveredAt > (latest.recoveredAt ?? 0)) {
      latest = { phase: 'bereit', session: s, recoveredAt, windowEnd: recoveredAt + window * H };
    }
  }
  if (!latest) return { phase: 'frei' };
  const phase: Phase = now < latest.recoveredAt! ? 'erholung' : now <= latest.windowEnd! ? 'fenster' : 'bereit';
  return { ...latest, phase };
}

/**
 * Die klassische Kurve zum Zeichnen: erst unter dem alten Niveau (Ermüdung), dann darüber (Superkompensation),
 * danach zurück auf null. `t` und die Phasen in Stunden, Ergebnis zwischen −1 und etwa 0,6.
 */
export function curveAt(t: number, recover: number, window: number): number {
  if (t <= 0) return 0;
  if (t <= recover) return -Math.sin((Math.PI * t) / recover);
  if (t <= recover + window) return 0.6 * Math.sin((Math.PI * (t - recover)) / window);
  return 0;
}

/** `noch 20 Std.`, `noch 2 Tage` */
export function formatRemaining(ms: number): string {
  const hours = Math.max(0, ms / H);
  if (hours < 1) return 'unter 1 Std.';
  if (hours < 36) return `${Math.round(hours)} Std.`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'Tag' : 'Tage'}`;
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** `heute 18:00`, `morgen 09:00`, `Do 18:00` */
export function formatWhen(ms: number, now: number): string {
  const date = new Date(ms);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.floor((ms - startOfToday) / (24 * H));
  const clock = formatClock(minutesOf(date));
  if (days === 0) return `heute ${clock}`;
  if (days === 1) return `morgen ${clock}`;
  if (days === -1) return `gestern ${clock}`;
  return `${WEEKDAY_SHORT[date.getDay()]} ${clock}`;
}

// ---------------------------------------------------------------------------------------------
// Rhythmus: wie pünktlich gegessen wurde

/** Eine abgehakte Mahlzeit: wann sie geplant war und wann gegessen wurde (Minuten seit Mitternacht). */
export type MealEntry = { planned: number; at: number };
/** Pro Tag (`dateKey`) und Mahlzeit (Index im Plan). */
export type MealLog = Record<string, Record<string, MealEntry>>;

/** So viel Abweichung gilt noch als pünktlich (Minuten) [farshchi2005, gillpanda2015]. */
export const ON_TIME = 60;

export function onTime(entry: MealEntry): boolean {
  const diff = Math.abs(entry.at - entry.planned);
  return Math.min(diff, DAY - diff) <= ON_TIME;
}

/**
 * Wie pünktlich in den letzten 7 Tagen: geplante Mahlzeiten seit dem Einrichten, heute nur die schon vorbei sind
 * (oder abgehakt). `days` sind die `dateKey`s von heute rückwärts.
 */
export function rhythmScore(log: MealLog, days: string[], plan: MealPlan, since: string, nowMinutes: number) {
  let planned = 0;
  let eaten = 0;
  let punctual = 0;
  const times = mealTimes(plan);
  days.forEach((day, i) => {
    if (day < since) return;
    const entries = log[day] ?? {};
    times.forEach((t, index) => {
      const entry = entries[String(index)];
      // Heute zählt eine Mahlzeit erst, wenn sie vorbei ist oder schon abgehakt.
      if (i === 0 && !entry && nowMinutes < t + ON_TIME) return;
      planned += 1;
      if (entry) {
        eaten += 1;
        if (onTime(entry)) punctual += 1;
      }
    });
  });
  return { planned, eaten, punctual };
}

// ---------------------------------------------------------------------------------------------
// Persönliche Hinweise

const DAY_LETTERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** `Mo, Mi, Fr` */
export function formatDays(days: number[]): string {
  if (days.length === 7) return 'jeden Tag';
  return [...days].sort((a, b) => a - b).map((d) => DAY_LETTERS[d]).join(', ');
}

/** Warum die Erholung bei dir länger oder kürzer dauert, in Worten. */
export function recoveryReasons(p: Profile): string[] {
  const out: string[] = [];
  if (p.age >= 50) out.push(p.age >= 65 ? 'ab 65 dauert Erholung länger' : 'ab 50 dauert Erholung etwas länger');
  const hours = sleepHours(p);
  if (hours < 7) out.push(`${String(Math.round(hours * 10) / 10).replace('.', ',')} Std. Schlaf sind wenig`);
  if (p.experience === 'neu') out.push('am Anfang reagieren Muskeln stärker');
  if (p.experience === 'erfahren') out.push('trainierte Muskeln erholen sich schneller');
  return out;
}

/** Hinweise aus Gesundheit und Gewohnheiten. Ersetzen keinen ärztlichen Rat, sie sagen, wann man fragen sollte. */
export function personalNotes(p: Profile): Advice[] {
  const out: Advice[] = [];
  const blocked = goalBlocked(p);
  if (blocked) out.push({ level: 'info', text: blocked, sources: [] });
  if (p.diabetes) {
    out.push({
      level: 'warn',
      text: 'Mit Diabetes, besonders mit Insulin oder Tabletten, die den Zucker senken: Essens- und Trainingszeiten mit deinem Diabetes-Team abstimmen. Lange Pausen oder hartes Training können sonst zu Unterzucker führen.',
      sources: ['kanaley2022', 'ada2026'],
    });
  }
  if (p.medication) {
    out.push({
      level: 'info',
      text: p.medicationWithFood
        ? 'Gehört ein Medikament zum Essen, nimm es immer zur selben Mahlzeit. So passen Rhythmus und Einnahme zusammen. Die Uhrzeit selbst bestimmen Ärztin oder Apotheke, nicht Orbit.'
        : 'Nimm deine Medikamente so, wie es mit Ärztin oder Apotheke besprochen ist. Orbit verschiebt daran nichts.',
      sources: [],
    });
  }
  if (p.pregnant) {
    out.push({ level: 'info', text: 'In Schwangerschaft und Stillzeit ist der Bedarf höher und anders verteilt. Orbit rechnet deshalb kein Defizit, und die Zahlen sind nur eine grobe Orientierung.', sources: ['efsa2012protein', 'iom2009'] });
  }
  if (p.shiftWork) {
    out.push({
      level: 'info',
      text: 'Bei Schichtarbeit: richte das Rad nach deiner häufigsten Schicht und halte die Abstände gleich, auch wenn sich die Uhrzeiten verschieben. Nachts lieber leicht essen.',
      sources: ['gillpanda2015'],
    });
  }
  if (p.lateCaffeine) {
    out.push({ level: 'info', text: 'Koffein wirkt lange nach: Selbst 6 Stunden vor dem Schlafen kann eine starke Dosis den Schlaf um rund eine Stunde verkürzen. Also lieber früh am Nachmittag den letzten Kaffee, guter Schlaf hilft auch der Erholung.', sources: ['drake2013', 'craven2022'] });
  }
  if (p.hideNumbers) {
    out.push({
      level: 'info',
      text: 'Kalorien sind ausgeblendet, Orbit achtet nur auf den Rhythmus. Wenn Essen oder Zählen dich belastet, sprich mit jemandem, dem du vertraust, oder einer Beratungsstelle.',
      sources: ['simpson2017', 'linardon2019'],
    });
  }
  return out;
}
