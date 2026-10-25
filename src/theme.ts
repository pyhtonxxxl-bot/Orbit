// Design tokens. Alles Visuelle läuft hier zusammen, damit der Look an einer Stelle justiert werden kann.

import { StyleSheet } from 'react-native';

const light = {
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
  // Kleine Auswahl-Schilder auf den Bändern (z. B. Stunden nach dem Abhaken).
  chip: 'rgba(255, 255, 255, 0.45)',
  // Schrift auf Flächen in Textfarbe (z. B. gewählte Wochentage, Knöpfe in `pill`).
  inverse: '#FFFFFF',

  accent: '#E4642B',
  // Dasselbe Orange, für kleine Schrift auf `panel` (Kontrast mind. 4,5:1).
  accentText: '#B84A1C',
  white: '#FFFFFF',
  shadow: '#000000',

  // Seitengrund (davor blendet der Sperrbildschirm ein) und das Aufgaben-Fenster.
  paper: '#FFFFFF',
  panel: '#FFFFFF',
  // Knöpfe wie „Hinzufügen“ und das Plus: dunkel auf hell, im dunklen Design umgekehrt.
  pill: '#2B2B2B',

  // Sperrbildschirm: Hintergrund = Rand des Statuenbilds (scripts/make-lock-image.py),
  // dunkle Wisch-Leiste wie ein Hardware-Schalter, weißer Knopf mit dunkler Schrift.
  lock: '#ECECEC',
  lockScrim: 'transparent',
  track: '#2B2B2B',
  pillTrack: 'rgba(255, 255, 255, 0.35)',
  knobInk: '#333333',

  // Seitenleiste: eine Spur heller als Montag, damit sie wie ein eigenes Blatt wirkt.
  sidebar: '#E9E9E9',
  sidebarLine: 'rgba(0, 0, 0, 0.07)',
  active: 'rgba(0, 0, 0, 0.07)',
  backdrop: 'rgba(0, 0, 0, 0.28)',
};

export type Palette = typeof light;

/** Dunkles Design: dieselbe Treppe in Schwarz-Grau, Montag am hellsten, Sonntag fast schwarz. */
const dark: Palette = {
  days: ['#3A3A3A', '#343434', '#2E2E2E', '#292929', '#242424', '#1F1F1F', '#1A1A1A'],
  footer: '#141414',

  ink: '#EDEDED',
  inkMuted: 'rgba(255, 255, 255, 0.62)',
  inkFaint: 'rgba(255, 255, 255, 0.46)',
  control: 'rgba(255, 255, 255, 0.6)',
  done: 'rgba(255, 255, 255, 0.42)',
  hover: 'rgba(255, 255, 255, 0.06)',
  hoverBand: 'rgba(255, 255, 255, 0.05)',
  focus: 'rgba(255, 255, 255, 0.4)',
  chip: 'rgba(255, 255, 255, 0.12)',
  inverse: '#141414',

  accent: '#E4642B',
  accentText: '#F2905F',
  white: '#FFFFFF',
  shadow: '#000000',

  paper: '#111111',
  panel: '#2A2A2A',
  pill: '#EDEDED',

  // Das helle Statuenbild bekommt einen dunklen Schleier, die Leiste bleibt schwarz.
  lock: '#ECECEC',
  lockScrim: 'rgba(14, 14, 14, 0.7)',
  track: '#0E0E0E',
  pillTrack: 'rgba(255, 255, 255, 0.35)',
  knobInk: '#333333',

  sidebar: '#202020',
  sidebarLine: 'rgba(255, 255, 255, 0.08)',
  active: 'rgba(255, 255, 255, 0.09)',
  backdrop: 'rgba(0, 0, 0, 0.55)',
};

export const palettes = { light, dark };
export type ThemeName = keyof typeof palettes;

/**
 * Stile, die von den Farben abhängen. Statt `StyleSheet.create({...})` am Dateiende:
 * `const getStyles = themed((colors) => ({...}))`, im Bauteil `const styles = getStyles(useColors())`.
 * Jede Palette wird nur einmal in ein StyleSheet übersetzt.
 */
export function themed<T extends StyleSheet.NamedStyles<T>>(make: (colors: Palette) => T): (colors: Palette) => T {
  const cache = new Map<Palette, T>();
  return (colors) => {
    let sheet = cache.get(colors);
    if (!sheet) {
      sheet = StyleSheet.create(make(colors));
      cache.set(colors, sheet);
    }
    return sheet;
  };
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
