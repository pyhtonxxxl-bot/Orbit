import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayRow } from '../components/DayRow';
import { WeekFooter } from '../components/WeekFooter';
import { WEEKDAYS, addDays, dateKey, isSameDay, isoWeek, startOfWeek } from '../lib/date';
import { useLayout } from '../lib/useLayout';
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

export default function WeekScreen() {
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const now = useNow();
  const { tasks, add, toggle, remove } = useTasks();

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(now), weekOffset * 7), [now, weekOffset]);
  const days = useMemo(() => WEEKDAYS.map((label, i) => ({ label, date: addDays(weekStart, i) })), [weekStart]);

  // Am Handy ist beim Start der heutige Tag aufgeklappt, wie ein aufgeschlagenes Notizbuch.
  // Am PC ist Platz genug, dort sind alle Tage offen.
  const [expandedKey, setExpandedKey] = useState<string | null>(() => dateKey(now));

  const goToWeek = (offset: number) => {
    animate();
    setWeekOffset(offset);
    setExpandedKey(offset === 0 ? dateKey(new Date()) : null);
  };

  // Tastatur am PC: ← → wechseln die Woche, T springt zu heute. Eingabefelder schlucken ihre Tasten selbst.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'ArrowLeft') goToWeek(weekOffset - 1);
      else if (e.key === 'ArrowRight') goToWeek(weekOffset + 1);
      else if (e.key === 't' || e.key === 'T') goToWeek(0);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const toggleDay = (key: string) => {
    animate();
    tap();
    setExpandedKey((current) => (current === key ? null : key));
  };

  const thursday = addDays(weekStart, 3);

  return (
    <View style={styles.root}>
      {/* Hinter dem Bounce oben/unten die passende Farbe zeigen. */}
      <View style={styles.topFill} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
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
              isToday={isSameDay(date, now)}
              expanded={wide || expandedKey === key}
              wide={wide}
              gutter={gutter}
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
        <WeekFooter
          week={isoWeek(weekStart)}
          year={thursday.getFullYear()}
          isCurrentWeek={weekOffset === 0}
          wide={wide}
          bottomInset={insets.bottom}
          onPrev={() => goToWeek(weekOffset - 1)}
          onNext={() => goToWeek(weekOffset + 1)}
          onToday={() => goToWeek(0)}
        />
      </ScrollView>

      {/* Leicht deckende Fläche hinter der Statusleiste, damit Uhrzeit & Akku lesbar bleiben. */}
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
