import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayBand } from '../components/DayBand';
import { HabitItem } from '../components/HabitItem';
import { Icon } from '../components/Icon';
import { WeekFooter } from '../components/WeekFooter';
import { PageHeader } from '../components/shell/PageHeader';
import { WEEKDAYS, addDays, dateKey, formatWeekRange, isoWeek } from '../lib/date';
import { useShell } from '../lib/shell';
import { isDaily, isScheduled, streak, useHabits, type Habit } from '../lib/useHabits';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useNow } from '../lib/useNow';
import { useWeekNav } from '../lib/useWeekNav';
import { useColors } from '../lib/theme';
import { fonts, themed } from '../theme';

const tap = () => Haptics.selectionAsync().catch(() => {});
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/** Platzhalter für „der heutige Tag“, damit der offene Tag nach Mitternacht mitwandert. */
const TODAY = 'today';

/**
 * Habits: jeden Tag eine frische Liste zum Abhaken, aufgebaut wie die Todos. Welche Habits an welchem
 * Tag anstehen, steht in den Einstellungen.
 */
export default function HabitsScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const now = useNow();
  const { habits, loaded, toggle } = useHabits();

  const [expanded, setExpanded] = useState<string | null>(TODAY);
  const todayKey = dateKey(now);
  const expandedKey = expanded === TODAY ? todayKey : expanded;
  const { weekStart, isCurrentWeek, shiftWeek } = useWeekNav(now, (backToCurrent) =>
    setExpanded(backToCurrent ? TODAY : null),
  );

  const toggleDay = (key: string) => {
    animate();
    tap();
    setExpanded((current) => {
      const resolved = current === TODAY ? dateKey(new Date()) : current;
      if (resolved === key) return null;
      return key === dateKey(new Date()) ? TODAY : key;
    });
  };

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
      {Platform.OS !== 'web' && <View style={styles.topFill} />}

      <PageHeader color={colors.days[0]} gutter={gutter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {WEEKDAYS.map((label, i) => {
          const date = addDays(weekStart, i);
          const key = dateKey(date);
          const due = habits.filter((h) => isScheduled(h, date));
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
              count={{ done: due.filter((h) => h.done.includes(key)).length, total: due.length }}
              onPressHeader={() => toggleDay(key)}
            >
              <HabitList
                habits={due}
                anyHabits={habits.length > 0}
                dayKey={key}
                todayKey={todayKey}
                now={now}
                canHover={canHover}
                onToggle={(id) => {
                  tap();
                  toggle(id, key);
                }}
              />
            </DayBand>
          );
        })}
        {!wide && footer}
      </ScrollView>
      {wide && footer}

      {!hasHeader && <View style={[styles.statusBar, { height: insets.top }]} />}
    </View>
  );
}

type HabitListProps = {
  /** Die Habits, die an diesem Tag anstehen. */
  habits: Habit[];
  anyHabits: boolean;
  dayKey: string;
  todayKey: string;
  now: Date;
  canHover: boolean;
  onToggle: (id: string) => void;
};

/** Die Kästchen eines Tages. Die Serie steht nur bei heute, sie zählt bis heute. */
function HabitList({ habits, anyHabits, dayKey, todayKey, now, canHover, onToggle }: HabitListProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const future = dayKey > todayKey;
  return (
    <>
      {!anyHabits && <Text style={styles.empty}>Noch keine Habits.</Text>}
      {anyHabits && habits.length === 0 && <Text style={styles.empty}>An diesem Tag steht nichts an.</Text>}
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          title={habit.title}
          checked={habit.done.includes(dayKey)}
          streak={dayKey === todayKey ? streak(habit, now) : 0}
          daily={isDaily(habit)}
          disabled={future}
          canHover={canHover}
          onToggle={() => onToggle(habit.id)}
        />
      ))}
      <ManageRow label={anyHabits ? 'Habits verwalten' : 'Habits anlegen'} />
    </>
  );
}

/** Leise Zeile zu den Einstellungen, dort werden Habits angelegt und ihre Tage festgelegt. */
function ManageRow({ label }: { label: string }) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={() => router.navigate('/einstellungen')}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="link"
      aria-label={`${label} (Einstellungen)`}
      style={({ pressed }) => [styles.manage, pressed && styles.pressed]}
    >
      <Icon name="settings" size={17} color={hovered ? colors.ink : colors.inkFaint} />
      <Text style={[styles.manageText, hovered && styles.manageTextStrong]}>{label}</Text>
    </Pressable>
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
  empty: {
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginHorizontal: -8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  manageText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkFaint,
  },
  manageTextStrong: {
    color: colors.ink,
  },
  pressed: {
    opacity: 0.6,
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
