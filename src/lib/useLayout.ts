import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

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

const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * `true`, wenn mit Maus/Trackpad bedient wird (PC). Dann gibt es Hover-Effekte und das ×
 * zum Löschen. Auf Touch-Geräten (Handy, Tablet, auch im Browser) wird lange gedrückt.
 */
export function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(
    () => Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.(HOVER_QUERY).matches,
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia(HOVER_QUERY);
    const onChange = () => setCanHover(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return canHover;
}
