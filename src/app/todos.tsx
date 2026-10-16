import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayRow } from '../components/DayRow';
import { WeekFooter } from '../components/WeekFooter';
import { PageHeader } from '../components/shell/PageHeader';
import { WEEKDAYS, addDays, dateKey, formatWeekRange, isoWeek } from '../lib/date';
import { useShell } from '../lib/shell';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useNow } from '../lib/useNow';
import { useTasks } from '../lib/useTasks';
import { useWeekNav } from '../lib/useWeekNav';
import { colors } from '../theme';

const tap = () => Haptics.selectionAsync().catch(() => {});
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/** Platzhalter für „der heutige Tag“, damit der offene Tag nach Mitternacht mitwandert. */
const TODAY = 'today';

/** Todos: der Wochenplaner, sieben Tagesbänder von hell (Montag) nach dunkel (Sonntag). */
export default function TodosScreen() {
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  // Ohne feste Seitenleiste gibt es oben eine Kopfzeile mit Menü-Symbol; sie übernimmt dann den Statusleisten-Abstand.
  const hasHeader = !!shell && !shell.sidebarDocked;
  const now = useNow();
  const { tasks, loaded, add, toggle, remove } = useTasks();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const keyboard = useKeyboardInset();

  // Am Handy ist beim Start der heutige Tag aufgeklappt, wie ein aufgeschlagenes Notizbuch.
  // Am PC ist Platz genug, dort sind alle Tage offen.
  const [expanded, setExpanded] = useState<string | null>(TODAY);
  const todayKey = dateKey(now);
  const expandedKey = expanded === TODAY ? todayKey : expanded;

  // Zurück in der aktuellen Woche ist wieder heute offen, in anderen Wochen erst mal kein Tag.
  const { weekStart, isCurrentWeek, shiftWeek } = useWeekNav(now, (backToCurrent) =>
    setExpanded(backToCurrent ? TODAY : null),
  );
  const days = WEEKDAYS.map((label, i) => ({ label, date: addDays(weekStart, i) }));

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
      canHover={canHover}
      bottomInset={insets.bottom}
      onPrev={() => shiftWeek(-1)}
      onNext={() => shiftWeek(1)}
      onToday={() => shiftWeek('today')}
    />
  );

  return (
    <View style={styles.root}>
      {/* iOS: hinter dem Bounce oben die passende Farbe zeigen. Im Browser gibt es keinen Bounce. */}
      {Platform.OS !== 'web' && <View style={styles.topFill} />}

      <PageHeader color={colors.days[0]} gutter={gutter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: keyboard }]}
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
              topInset={i === 0 && !hasHeader ? insets.top : 0}
              tasks={tasks[key] ?? []}
              draft={drafts[key] ?? ''}
              onDraftChange={(text) => setDrafts((prev) => ({ ...prev, [key]: text }))}
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
      {!hasHeader && <View style={[styles.statusBar, { height: insets.top }]} />}
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
