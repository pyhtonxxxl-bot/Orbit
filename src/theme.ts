// Design tokens. Alles Visuelle läuft hier zusammen, damit der Look an einer Stelle justiert werden kann.

export const colors = {
  // Tagesbänder: von hell (Montag) nach dunkel (Sonntag), wie ein Stapel Papier.
  days: ['#DBDBDB', '#D4D4D4', '#CDCDCD', '#C4C4C4', '#B7B7B7', '#AAAAAA', '#9D9D9D'],
  footer: '#939393',

  ink: '#3A3A3A',
  inkMuted: 'rgba(0, 0, 0, 0.42)',
  inkFaint: 'rgba(0, 0, 0, 0.28)',

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
  rowY: 28,
};
