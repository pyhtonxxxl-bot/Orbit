import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';

import { addDays, isSameDay, startOfWeek } from './date';
import { isDialogOpen } from './web';

const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/**
 * Welche Woche eine Seite zeigt. Am PC auch per Tastatur: ← → wechseln die Woche, T springt zu heute.
 * `onShift` erfährt nach jedem Wechsel, ob wieder die aktuelle Woche zu sehen ist.
 */
export function useWeekNav(now: Date, onShift?: (backToCurrent: boolean) => void) {
  // `null` = aktuelle Woche (wandert am Montag um 0 Uhr automatisch weiter), sonst eine fest gewählte Woche.
  const [pinnedWeek, setPinnedWeek] = useState<Date | null>(null);
  // Spiegel von `pinnedWeek` für den Tastatur-Listener, der nur einmal angelegt wird.
  // Wird ausschließlich in shiftWeek geschrieben, dem einzigen Ort, der die Woche ändert.
  const pinnedRef = useRef<Date | null>(null);
  const onShiftRef = useRef(onShift);
  useEffect(() => {
    onShiftRef.current = onShift;
  });

  const shiftWeek = useCallback((weeks: number | 'today') => {
    animate();
    const thisWeek = startOfWeek(new Date());
    const target = weeks === 'today' ? thisWeek : addDays(pinnedRef.current ?? thisWeek, weeks * 7);
    const backToCurrent = isSameDay(target, thisWeek);
    pinnedRef.current = backToCurrent ? null : target;
    setPinnedWeek(pinnedRef.current);
    onShiftRef.current?.(backToCurrent);
  }, []);

  // Eingabefelder schlucken ihre Tasten selbst.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      // Sperrbildschirm oder Menü-Schublade offen: die Woche dahinter bleibt, wie sie ist.
      if (e.metaKey || e.ctrlKey || e.altKey || isDialogOpen()) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'ArrowLeft') shiftWeek(-1);
      else if (e.key === 'ArrowRight') shiftWeek(1);
      else if (e.key === 't' || e.key === 'T') shiftWeek('today');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shiftWeek]);

  const currentWeek = startOfWeek(now);
  const weekStart = pinnedWeek ?? currentWeek;
  return { weekStart, isCurrentWeek: isSameDay(weekStart, currentWeek), shiftWeek };
}
