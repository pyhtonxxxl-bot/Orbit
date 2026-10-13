import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayRow } from '../components/DayRow';
import { WeekFooter } from '../components/WeekFooter';
import { WEEKDAYS, addDays, dateKey, isSameDay, isoWeek, startOfWeek } from '../lib/date';
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

export function WeekScreen() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { tasks, add, toggle, remove } = useTasks();

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(now), weekOffset * 7), [now, weekOffset]);
  const days = useMemo(() => WEEKDAYS.map((label, i) => ({ label, date: addDays(weekStart, i) })), [weekStart]);

  // Beim Start ist der heutige Tag aufgeklappt, wie ein aufgeschlagenes Notizbuch.
  const [expandedKey, setExpandedKey] = useState<string | null>(() => dateKey(now));

  const goToWeek = (offset: number) => {
    animate();
    setWeekOffset(offset);
    setExpandedKey(offset === 0 ? dateKey(new Date()) : null);
  };

  const toggleDay = (key: string) => {
    animate();
    tap();
    setExpandedKey((current) => (current === key ? null : key));
  };

  const thursday = addDays(weekStart, 3);

  return (
    <View style={styles.root}>
      {/* Hinter dem Bounce oben/unten die passende Farbe zeigen. */}
      <View style={[StyleSheet.absoluteFill, styles.bottomFill]} />
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
              expanded={expandedKey === key}
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
          bottomInset={insets.bottom}
          onPrev={() => goToWeek(weekOffset - 1)}
          onNext={() => goToWeek(weekOffset + 1)}
          onToday={() => goToWeek(0)}
        />
      </ScrollView>

      {/* Leicht deckende Fläche hinter der Statusleiste, damit Uhrzeit & Akku lesbar bleiben. */}
      <View style={[styles.statusBar, { height: insets.top }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.footer,
  },
  bottomFill: {
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
  },
});
