// Design tokens. Alles Visuelle läuft hier zusammen, damit der Look an einer Stelle justiert werden kann.

export const colors = {
  // Tagesbänder: von hell (Montag) nach dunkel (Sonntag), wie ein Stapel Papier.
  days: ['#DBDBDB', '#D4D4D4', '#CDCDCD', '#C4C4C4', '#B7B7B7', '#AAAAAA', '#9D9D9D'],
  footer: '#939393',

  ink: '#3A3A3A',
  inkMuted: 'rgba(0, 0, 0, 0.42)',
  inkFaint: 'rgba(0, 0, 0, 0.28)',
  hover: 'rgba(0, 0, 0, 0.04)',

  accent: '#E4642B',
  accentMuted: '#B9866C',
  checkboxBorder: '#7F7F7F',
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
  rowYWide: 22,
};

/** Ab dieser Fensterbreite (PC, Tablet quer) liegen alle Tage offen nebeneinander: Tag links, Aufgaben rechts. */
export const WIDE_BREAKPOINT = 900;

/** Maximale Inhaltsbreite auf großen Bildschirmen. Die Farbbänder selbst laufen immer über die volle Breite. */
export const CONTENT_MAX_WIDTH = 1120;
