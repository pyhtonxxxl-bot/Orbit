import { useWindowDimensions } from 'react-native';

import { WIDE_BREAKPOINT, space } from '../theme';

export type Layout = {
  /** PC und breite Tablets: alle Tage offen, Tag links, Aufgaben rechts. */
  wide: boolean;
  /** Seitenrand, wächst mit der Fensterbreite. */
  gutter: number;
};

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const gutter = wide ? space.gutterWide : width >= 600 ? space.gutterTablet : space.gutter;
  return { wide, gutter };
}
