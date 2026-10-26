import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayBand } from '../components/DayBand';
import { TaskList } from '../components/TaskList';
import { TaskPanel } from '../components/TaskPanel';
import { AddButton, WeekFooter } from '../components/WeekFooter';
import { PageHeader } from '../components/shell/PageHeader';
import { WEEKDAYS, addDays, dateKey, formatWeekRange, isoWeek } from '../lib/date';
import { useShell } from '../lib/shell';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useNow } from '../lib/useNow';
import { useTags } from '../lib/useTags';
import { useTaskPanel } from '../lib/useTaskPanel';
import { tasksOn, useTasks } from '../lib/useTasks';
import { useWeekNav } from '../lib/useWeekNav';
import { isDialogOpen } from '../lib/web';
import { useColors } from '../lib/theme';
import { themed } from '../theme';

const tap = () => Haptics.selectionAsync().catch(() => {});
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/** Platzhalter für „der heutige Tag“, damit der offene Tag nach Mitternacht mitwandert. */
const TODAY = 'today';

/** Todos: der Wochenplaner, sieben Tagesbänder von hell (Montag) nach dunkel (Sonntag). */
export default function TodosScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  // Ohne feste Seitenleiste gibt es oben eine Kopfzeile mit Menü-Symbol; sie übernimmt dann den Statusleisten-Abstand.
  const hasHeader = !!shell && !shell.sidebarDocked;
  const now = useNow();
  const { tasks, loaded, add, update, toggle, setHours, remove } = useTasks();
  const { tags } = useTags();
  const { panel, task: panelTask, openNew, openTask, close, moveTo } = useTaskPanel(tasks);
  const keyboard = useKeyboardInset();

  // Wie ein Notizbuch: beim Start ist heute aufgeklappt, ein Klick auf einen anderen Tag klappt den auf
  // und die übrigen zu. Am Handy und am PC gleich.
  const [expanded, setExpanded] = useState<string | null>(TODAY);
  const todayKey = dateKey(now);
  const expandedKey = expanded === TODAY ? todayKey : expanded;

  // Zurück in der aktuellen Woche ist wieder heute offen, in anderen Wochen erst mal kein Tag.
  const { weekStart, isCurrentWeek, shiftWeek } = useWeekNav(now, (backToCurrent) =>
    setExpanded(backToCurrent ? TODAY : null),
  );
  const days = WEEKDAYS.map((label, i) => ({ label, date: addDays(weekStart, i) }));

  // Neue Aufgabe ohne bestimmten Tag (Plus, Taste N): der offene Tag, sonst heute bzw. Montag der Woche.
  const defaultDay = expandedKey ?? (isCurrentWeek ? todayKey : dateKey(weekStart));
  const newRef = useRef(() => openNew(defaultDay));
  useEffect(() => {
    newRef.current = () => openNew(defaultDay);
  });

  // Tastatur am PC: N legt eine neue Aufgabe an.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isDialogOpen()) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        newRef.current();
      }
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
      canHover={canHover}
      bottomInset={insets.bottom}
      onPrev={() => shiftWeek(-1)}
      onNext={() => shiftWeek(1)}
      onToday={() => shiftWeek('today')}
      onAdd={() => openNew(defaultDay)}
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
          const items = tasksOn(tasks, key);
          return (
            <DayBand
              key={key}
              label={label}
              date={date}
              now={now}
              color={colors.days[i]}
              isToday={key === todayKey}
              expanded={expandedKey === key}
              wide={wide}
              gutter={gutter}
              topInset={i === 0 && !hasHeader ? insets.top : 0}
              count={{ done: items.filter((it) => it.done).length, total: items.length }}
              onPressHeader={() => toggleDay(key)}
            >
              <TaskList
                label={label}
                items={items}
                todayKey={todayKey}
                canHover={canHover}
                selected={panel?.mode === 'edit' ? `${panel.id}@${panel.date}` : undefined}
                onToggle={(item) => {
                  tap();
                  toggle(item.start, item.task.id, item.day);
                }}
                onOpen={(item) => openTask(item.start, item.task.id, item.day)}
                onHours={(item, hours) => setHours(item.start, item.task.id, item.day, hours)}
                onAdd={() => openNew(key)}
              />
            </DayBand>
          );
        })}
        {/* Am Handy scrollt die Wochen-Navigation mit, am PC bleibt sie unten immer sichtbar. */}
        {!wide && footer}
      </ScrollView>
      {wide && footer}

      {/* Leicht deckende Fläche hinter der Statusleiste, damit Uhrzeit und Akku lesbar bleiben. */}
      {!hasHeader && <View style={[styles.statusBar, { height: insets.top }]} />}

      {/* Handy: schwebendes Plus unten rechts, in Daumennähe. */}
      {!wide && !panel && (
        <View style={[styles.fab, { bottom: insets.bottom + 20 }]}>
          <AddButton onPress={() => openNew(defaultDay)} canHover={canHover} size={56} />
        </View>
      )}

      {panel && (
        <TaskPanel
          key={panel.mode === 'edit' ? `${panel.id}@${panel.date}` : `new-${panel.day}`}
          state={panel}
          task={panelTask}
          tags={tags}
          todayKey={todayKey}
          wide={wide}
          onClose={close}
          onCreate={(day, details) => {
            animate();
            add(day, details);
          }}
          onUpdate={(patch) => {
            if (panel.mode !== 'edit') return;
            if ('due' in patch) animate();
            moveTo(update(panel.day, panel.id, patch));
          }}
          onToggle={() => {
            if (panel.mode !== 'edit') return;
            tap();
            toggle(panel.day, panel.id, panel.date);
          }}
          onHours={(hours) => {
            if (panel.mode === 'edit') setHours(panel.day, panel.id, panel.date, hours);
          }}
          onRemove={() => {
            if (panel.mode !== 'edit') return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            animate();
            remove(panel.day, panel.id);
            close();
          }}
          onEditTags={() => {
            close();
            router.navigate('/einstellungen');
          }}
        />
      )}
    </View>
  );
}

const getStyles = themed((colors) => ({
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
  fab: {
    position: 'absolute',
    right: 20,
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
}));
