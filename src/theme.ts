// Design tokens. Alles Visuelle läuft hier zusammen, damit der Look an einer Stelle justiert werden kann.

export const colors = {
  // Tagesbänder: von hell (Montag) nach dunkel (Sonntag), wie ein Stapel Papier.
  days: ['#DBDBDB', '#D4D4D4', '#CDCDCD', '#C4C4C4', '#B7B7B7', '#AAAAAA', '#9D9D9D'],
  footer: '#939393',

  // Text als Schwarz mit Transparenz, damit er auf jedem Grau gleich wirkt
  // und auch auf dem dunkelsten Band (Sonntag) gut lesbar bleibt.
  ink: '#333333',
  inkMuted: 'rgba(0, 0, 0, 0.58)', // Datum, Wochenangabe
  inkFaint: 'rgba(0, 0, 0, 0.45)', // Platzhalter, Zähler, Hinweise
  control: 'rgba(0, 0, 0, 0.55)', // Checkbox-Rand, ×, Pfeile (mind. 3:1 Kontrast)
  done: 'rgba(0, 0, 0, 0.45)', // erledigte Aufgaben, mit orangem Strich
  hover: 'rgba(0, 0, 0, 0.05)',
  // Hover auf ganzen Bändern hellt auf statt abzudunkeln, sonst kippt die Hell-dunkel-Treppe.
  hoverBand: 'rgba(255, 255, 255, 0.22)',
  focus: 'rgba(0, 0, 0, 0.35)',

  accent: '#E4642B',
  // Dasselbe Orange, dunkler: für kleine Schrift auf Weiß (Kontrast 5:1).
  accentText: '#B84A1C',
  white: '#FFFFFF',
  shadow: '#000000',

  // Sperrbildschirm: blendet aus Weiß ein. Hintergrund = Rand des Statuenbilds
  // (scripts/make-lock-image.py), dunkle Wisch-Leiste wie ein Hardware-Schalter.
  paper: '#FFFFFF',
  lock: '#ECECEC',
  pill: '#2B2B2B',
  pillTrack: 'rgba(255, 255, 255, 0.35)',

  // Seitenleiste: eine Spur heller als Montag, damit sie wie ein eigenes Blatt wirkt.
  sidebar: '#E9E9E9',
  sidebarLine: 'rgba(0, 0, 0, 0.07)',
  active: 'rgba(0, 0, 0, 0.07)',
  backdrop: 'rgba(0, 0, 0, 0.28)',
};

/**
 * Grau für Band `index` von `count` in Listen beliebiger Länge (z. B. Habits): dieselbe Hell-dunkel-Treppe
 * wie die Wochentage, vom zweiten Tagesband an. Bis zu sechs Bänder bekommen genau die Tagesfarben,
 * bei mehr wird die Treppe feiner, endet aber nie dunkler als Sonntag.
 */
export function bandColor(index: number, count: number): string {
  const steps = colors.days.length - 1;
  const t = Math.min(steps, 1 + (index * (steps - 1)) / Math.max(steps - 1, count - 1));
  const lo = Math.floor(t);
  const hi = Math.min(steps, lo + 1);
  const grey = (hex: string) => parseInt(hex.slice(1, 3), 16);
  const v = Math.round(grey(colors.days[lo]) + (grey(colors.days[hi]) - grey(colors.days[lo])) * (t - lo));
  const h = v.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`.toUpperCase();
}

export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  heavy: 'Barlow_800ExtraBold',
};

export const space = {
  gutter: 24,
  gutterTablet: 40,
  gutterWide: 48,
  rowY: 28,
  rowYWide: 18,
};

/** Ab dieser Inhaltsbreite (PC, Tablet quer) liegen alle Tage offen da: Tag links, Aufgaben rechts. */
export const WIDE_BREAKPOINT = 860;

/** Ab dieser Fensterbreite steht die Seitenleiste fest links, darunter öffnet sie sich über das Menü-Symbol. */
export const SIDEBAR_BREAKPOINT = 1100;
export const SIDEBAR_WIDTH = 232;

/** Maximale Inhaltsbreite auf großen Bildschirmen. Die Farbbänder selbst laufen immer über die volle Breite. */
export const CONTENT_MAX_WIDTH = 1120;

/** Im Handy-Layout auf Tablets: Inhalt nicht über die ganze Breite ziehen. */
export const COMPACT_MAX_WIDTH = 640;
