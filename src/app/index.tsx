import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayRow } from '../components/DayRow';
import { WeekFooter } from '../components/WeekFooter';
import { WEEKDAYS, addDays, dateKey, formatWeekRange, isSameDay, isoWeek, startOfWeek } from '../lib/date';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useTasks } from '../lib/useTasks';
import { colors } from '../theme';

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const tap = () => Haptics.selectionAsync().catch(() => {});
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/** Platzhalter für „der heutige Tag“, damit der offene Tag nach Mitternacht mitwandert. */
const TODAY = 'today';

export default function WeekScreen() {
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const now = useNow();
  const { tasks, loaded, add, toggle, remove } = useTasks();

  // `null` = aktuelle Woche (wandert am Montag um 0 Uhr automatisch weiter), sonst eine fest gewählte Woche.
  const [pinnedWeek, setPinnedWeek] = useState<Date | null>(null);
  const currentWeek = startOfWeek(now);
  const weekStart = pinnedWeek ?? currentWeek;
  const isCurrentWeek = isSameDay(weekStart, currentWeek);
  const days = WEEKDAYS.map((label, i) => ({ label, date: addDays(weekStart, i) }));

  // Am Handy ist beim Start der heutige Tag aufgeklappt, wie ein aufgeschlagenes Notizbuch.
  // Am PC ist Platz genug, dort sind alle Tage offen.
  const [expanded, setExpanded] = useState<string | null>(TODAY);
  const todayKey = dateKey(now);
  const expandedKey = expanded === TODAY ? todayKey : expanded;

  // Spiegel von `pinnedWeek` für den Tastatur-Listener, der nur einmal angelegt wird.
  // Wird ausschließlich in shiftWeek geschrieben, dem einzigen Ort, der die Woche ändert.
  const pinnedRef = useRef<Date | null>(null);

  const shiftWeek = (weeks: number | 'today') => {
    animate();
    const thisWeek = startOfWeek(new Date());
    const target = weeks === 'today' ? thisWeek : addDays(pinnedRef.current ?? thisWeek, weeks * 7);
    const backToCurrent = isSameDay(target, thisWeek);
    pinnedRef.current = backToCurrent ? null : target;
    setPinnedWeek(pinnedRef.current);
    // Zurück in der aktuellen Woche ist wieder heute offen, in anderen Wochen erst mal kein Tag.
    setExpanded(backToCurrent ? TODAY : null);
  };

  // Tastatur am PC: ← → wechseln die Woche, T springt zu heute. Eingabefelder schlucken ihre Tasten selbst.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'ArrowLeft') shiftWeek(-1);
      else if (e.key === 'ArrowRight') shiftWeek(1);
      else if (e.key === 't' || e.key === 'T') shiftWeek('today');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleDay = (key: string) => {
    animate();
    tap();
    setExpanded((current) => {
      const resolved = current === TODAY ? dateKey(new Date()) : current;
      if (resolved === key) return null;
      return key === dateKey(new Date()) ? TODAY : key;
    });
  };

  // Erst laden, dann zeigen: kein leerer Zwischenzustand und keine Eingabe, bevor die Daten da sind.
  if (!loaded) return <View style={styles.root} />;

  const footer = (
    <WeekFooter
      week={isoWeek(weekStart)}
      range={formatWeekRange(weekStart)}
      isCurrentWeek={isCurrentWeek}
      wide={wide}
      showKeyHint={canHover}
      bottomInset={insets.bottom}
      onPrev={() => shiftWeek(-1)}
      onNext={() => shiftWeek(1)}
      onToday={() => shiftWeek('today')}
    />
  );

  return (
    <View style={styles.root}>
      {/* Hinter dem Bounce oben die passende Farbe zeigen. */}
      <View style={styles.topFill} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        // Im Browser gehört eine (dezente) Scrollleiste dazu, sonst sieht man nicht, dass es weitergeht.
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {days.map(({ label, date }, i) => {
          const key = dateKey(date);
          return (
            <DayRow
              key={key}
              label={label}
              date={date}
              now={now}
              color={colors.days[i]}
              isToday={key === todayKey}
              expanded={wide || expandedKey === key}
              wide={wide}
              gutter={gutter}
              canHover={canHover}
              topInset={i === 0 ? insets.top : 0}
              tasks={tasks[key] ?? []}
              onPressHeader={() => toggleDay(key)}
              onAdd={(title) => {
                animate();
                add(key, title);
              }}
              onToggle={(id) => {
                tap();
                toggle(key, id);
              }}
              onRemove={(id) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                animate();
                remove(key, id);
              }}
            />
          );
        })}
        {/* Am Handy scrollt die Wochen-Navigation mit, am PC bleibt sie unten immer sichtbar. */}
        {!wide && footer}
      </ScrollView>
      {wide && footer}

      {/* Leicht deckende Fläche hinter der Statusleiste, damit Uhrzeit und Akku lesbar bleiben. */}
      <View style={[styles.statusBar, { height: insets.top }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.footer,
  },
  topFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: colors.days[0],
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.days[0],
    opacity: 0.94,
    pointerEvents: 'none',
  },
});
