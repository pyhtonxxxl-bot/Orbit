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
  focus: 'rgba(0, 0, 0, 0.35)',

  accent: '#E4642B',
  white: '#FFFFFF',
};

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

/** Ab dieser Fensterbreite (PC, Tablet quer) liegen alle Tage offen da: Tag links, Aufgaben rechts. */
export const WIDE_BREAKPOINT = 900;

/** Maximale Inhaltsbreite auf großen Bildschirmen. Die Farbbänder selbst laufen immer über die volle Breite. */
export const CONTENT_MAX_WIDTH = 1120;

/** Im Handy-Layout auf Tablets: Inhalt nicht über die ganze Breite ziehen. */
export const COMPACT_MAX_WIDTH = 640;
