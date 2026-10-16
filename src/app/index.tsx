import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayRow } from '../components/DayRow';
import { HabitItem } from '../components/HabitItem';
import { Icon, type IconName } from '../components/Icon';
import { SectionLink } from '../components/SectionLink';
import { PageHeader } from '../components/shell/PageHeader';
import { WEEKDAYS, addDays, dateKey, startOfWeek } from '../lib/date';
import { useShell } from '../lib/shell';
import { streak, useHabits, type Habit } from '../lib/useHabits';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useNow } from '../lib/useNow';
import { useTasks } from '../lib/useTasks';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import { enterActivates, heading } from '../lib/web';
import { CONTENT_MAX_WIDTH, COMPACT_MAX_WIDTH, colors, fonts, space } from '../theme';

const tap = () => Haptics.selectionAsync().catch(() => {});

function greeting(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'Guten Morgen';
  if (h >= 11 && h < 17) return 'Guten Tag';
  return 'Guten Abend';
}

/** Startseite: Begrüßung, heute aufgeteilt in Habits und Todos, darunter die kommenden Werkzeuge. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const now = useNow();
  const tasks = useTasks();
  const habits = useHabits();
  const [draft, setDraft] = useState('');
  const keyboard = useKeyboardInset();

  if (!tasks.loaded || !habits.loaded) return <View style={styles.root} />;

  const todayKey = dateKey(now);
  const today = tasks.tasks[todayKey] ?? [];
  const todosDone = today.filter((t) => t.done).length;
  const habitsDone = habits.habits.filter((h) => h.done.includes(todayKey)).length;
  const weekStart = startOfWeek(now);
  const weekTasks = WEEKDAYS.flatMap((_, i) => tasks.tasks[dateKey(addDays(weekStart, i))] ?? []);
  const weekOpen = weekTasks.filter((t) => !t.done).length;
  const weekday = WEEKDAYS[(now.getDay() + 6) % 7];

  const parts = [
    habits.habits.length > 0 && `${habitsDone} von ${habits.habits.length} Habits`,
    today.length > 0 && `${todosDone} von ${today.length} Todos`,
  ].filter(Boolean);
  const summary = parts.length === 0 ? 'Für heute ist noch nichts geplant.' : `Heute ${parts.join(' und ')} erledigt.`;
  const weekSummary =
    weekTasks.length === 0
      ? 'Diese Woche noch keine Todos.'
      : weekOpen === 0
        ? 'Diese Woche sind alle Todos erledigt.'
        : `Diese Woche ${weekOpen} ${weekOpen === 1 ? 'Todo' : 'Todos'} offen.`;

  const rowY = wide ? space.rowYWide : space.rowY;

  return (
    <View style={styles.root}>
      <PageHeader title="Startseite" color={colors.days[0]} gutter={gutter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: keyboard }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* Begrüßung */}
        <View
          style={{
            backgroundColor: colors.days[0],
            paddingTop: (wide ? 40 : rowY) + (hasHeader ? 0 : insets.top),
            paddingBottom: wide ? 36 : rowY,
            paddingHorizontal: gutter,
          }}
        >
          <View style={[styles.inner, wide ? styles.innerWide : styles.innerCompact]}>
            <View style={wide ? styles.side : undefined}>
              <Text style={[styles.welcome, wide && styles.welcomeWide]} role="heading" maxFontSizeMultiplier={1.3}>
                WILLKOMMEN
              </Text>
              <Text style={styles.greeting}>
                {greeting(now)}. Heute ist {weekday}.
              </Text>
            </View>
            <View style={wide ? styles.bodyWide : styles.summaryCompact}>
              <Text style={styles.summary}>{summary}</Text>
              <Text style={styles.summaryMuted}>{weekSummary}</Text>
            </View>
          </View>
        </View>

        {/* Habits: jeden Tag dasselbe abhaken */}
        <HabitsToday
          habits={habits.habits}
          now={now}
          color={colors.days[1]}
          wide={wide}
          gutter={gutter}
          canHover={canHover}
          onToggle={(id) => {
            tap();
            habits.toggle(id, todayKey);
          }}
        />

        {/* Todos: dieselbe Tageszeile wie im Wochenplaner, immer offen */}
        <DayRow
          label="Heute"
          title="Todos"
          subtitle={today.length === 0 ? 'Noch nichts geplant' : `${todosDone} von ${today.length} erledigt`}
          todayDot={false}
          accessory={
            <SectionLink
              label="Alle Todos"
              canHover={canHover}
              onPress={() => router.navigate('/todos')}
              style={!wide && styles.linkCompact}
            />
          }
          date={now}
          now={now}
          color={colors.days[2]}
          isToday
          expanded
          fill={false}
          wide={wide}
          gutter={gutter}
          canHover={canHover}
          tasks={today}
          draft={draft}
          onDraftChange={setDraft}
          onAdd={(title) => tasks.add(todayKey, title)}
          onToggle={(id) => {
            tap();
            tasks.toggle(todayKey, id);
          }}
          onRemove={(id) => tasks.remove(todayKey, id)}
        />

        <ToolBand
          name="Training"
          icon="training"
          description="Trainingspläne · kommt bald"
          color={colors.days[3]}
          wide={wide}
          gutter={gutter}
          canHover={canHover}
        />
        <ToolBand
          name="Ernährung"
          icon="food"
          description="Essen tracken · kommt bald"
          color={colors.days[4]}
          wide={wide}
          gutter={gutter}
          canHover={canHover}
        />

        <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
          <Text style={styles.footerText}>Startseite anpassen · kommt bald</Text>
        </View>
      </ScrollView>
    </View>
  );
}

type HabitsTodayProps = {
  habits: Habit[];
  now: Date;
  color: string;
  wide: boolean;
  gutter: number;
  canHover: boolean;
  onToggle: (id: string) => void;
};

/** Band „Habits“: alle Habits für heute zum Abhaken, mit Link zur Wochenansicht. */
function HabitsToday({ habits, now, color, wide, gutter, canHover, onToggle }: HabitsTodayProps) {
  const todayKey = dateKey(now);
  const done = habits.filter((h) => h.done.includes(todayKey)).length;
  const rowY = wide ? space.rowYWide : space.rowY;
  const status = habits.length === 0 ? 'Noch keine angelegt' : `${done} von ${habits.length} erledigt`;
  const link = (
    <SectionLink
      label={habits.length === 0 ? 'Anlegen' : 'Alle Habits'}
      canHover={canHover}
      onPress={() => router.navigate('/habits')}
      style={!wide && styles.linkCompact}
    />
  );

  const list =
    habits.length === 0 ? (
      <Text style={styles.empty}>Was willst du jeden Tag schaffen? Lesen, Sport, Wasser trinken …</Text>
    ) : (
      habits.map((habit) => (
        <HabitItem
          key={habit.id}
          title={habit.title}
          checked={habit.done.includes(todayKey)}
          streak={streak(habit, now)}
          canHover={canHover}
          onToggle={() => onToggle(habit.id)}
        />
      ))
    );

  if (wide) {
    return (
      <View style={{ backgroundColor: color, paddingVertical: rowY, paddingHorizontal: gutter }}>
        <View style={[styles.inner, styles.innerWide]}>
          <View style={styles.side}>
            <View style={styles.sectionHeadWide}>
              <Text {...heading(2)} style={[styles.sectionTitle, styles.sectionTitleWide]} maxFontSizeMultiplier={1.3}>
                HABITS
              </Text>
              <Text style={styles.status}>{status}</Text>
            </View>
            <View style={styles.linkWide}>{link}</View>
          </View>
          <View style={[styles.bodyWide, styles.listWide]}>{list}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: color, paddingVertical: rowY, paddingHorizontal: gutter }}>
      <View style={[styles.inner, styles.innerCompact]}>
        <View style={styles.sectionHead}>
          <Text
            {...heading(2)}
            style={styles.sectionTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.3}
          >
            HABITS
          </Text>
          {link}
        </View>
        <Text style={[styles.status, styles.statusCompact]}>{status}</Text>
        <View style={styles.listCompact}>{list}</View>
      </View>
    </View>
  );
}

type ToolBandProps = {
  name: string;
  icon: IconName;
  description: string;
  color: string;
  wide: boolean;
  gutter: number;
  canHover: boolean;
  /** Ohne Handler ist das Werkzeug noch nicht verfügbar. */
  onPress?: () => void;
};

function ToolBand({ name, icon, description, color, wide, gutter, canHover, onPress }: ToolBandProps) {
  const [hovered, setHovered] = useState(false);
  const soon = !onPress;
  const rowY = wide ? space.rowYWide : space.rowY;

  return (
    <Pressable
      {...enterActivates(onPress)}
      onPress={onPress}
      disabled={soon}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role={soon ? undefined : 'link'}
      aria-label={soon ? `${name}, kommt bald` : `${name} öffnen`}
      aria-disabled={soon}
      style={[
        styles.tool,
        soon && styles.toolSoon,
        { backgroundColor: color, paddingVertical: rowY + 4, paddingHorizontal: gutter },
      ]}
    >
      {canHover && hovered && !soon && <View style={styles.toolHover} />}
      <View style={[styles.inner, wide ? styles.innerWide : styles.innerCompact, soon && styles.soon]}>
        <View style={[styles.toolHead, wide && styles.side]}>
          <Icon name={icon} size={wide ? 30 : 26} color={colors.ink} strokeWidth={1.6} />
          <Text style={[styles.toolName, wide && styles.toolNameWide]} maxFontSizeMultiplier={1.3}>
            {name.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.toolBody, wide && styles.bodyWide]}>
          <Text style={styles.toolDescription}>{description}</Text>
          {!soon && <Icon name="arrow" size={22} color={colors.control} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.footer,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  inner: {
    width: '100%',
  },
  innerCompact: {
    maxWidth: COMPACT_MAX_WIDTH,
  },
  innerWide: {
    flexDirection: 'row',
    alignSelf: 'center',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: 48,
  },
  // Gleiche Spalten wie im Wochenplaner, damit die Bänder untereinander fluchten.
  side: {
    flexBasis: '43%',
    maxWidth: 460,
  },
  bodyWide: {
    flex: 1,
    maxWidth: 620,
  },
  welcome: {
    fontFamily: fonts.heavy,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  welcomeWide: {
    fontSize: 48,
    lineHeight: 54,
  },
  greeting: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.inkMuted,
  },
  summaryCompact: {
    marginTop: 18,
  },
  summary: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
  },
  summaryMuted: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkMuted,
  },
  // Kopf der Bänder „Habits“ und „Todos“: wie die Tagesnamen im Wochenplaner.
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeadWide: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 16,
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: fonts.heavy,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  sectionTitleWide: {
    fontSize: 38,
    lineHeight: 44,
  },
  status: {
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.inkMuted,
  },
  statusCompact: {
    marginTop: 10,
  },
  linkWide: {
    marginTop: 6,
    alignItems: 'flex-start',
  },
  // Am Handy steht der Link rechts neben der Überschrift, mittig zu ihr.
  linkCompact: {
    alignSelf: 'center',
    marginHorizontal: 0,
    marginRight: -10,
  },
  listWide: {
    marginTop: 10,
  },
  listCompact: {
    marginTop: 18,
  },
  empty: {
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  tool: {
    cursor: 'pointer',
    justifyContent: 'center',
  },
  toolSoon: {
    cursor: 'auto',
  },
  toolHover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.hoverBand,
  },
  soon: {
    opacity: 0.55,
  },
  toolHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  toolName: {
    fontFamily: fonts.heavy,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  toolNameWide: {
    fontSize: 34,
    lineHeight: 40,
  },
  toolBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 6,
  },
  toolDescription: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkMuted,
  },
  footer: {
    backgroundColor: colors.footer,
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.inkMuted,
  },
});
