import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayRow } from '../components/DayRow';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader } from '../components/shell/PageHeader';
import { WEEKDAYS, addDays, dateKey, formatDate, startOfWeek } from '../lib/date';
import { useShell } from '../lib/shell';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useTasks } from '../lib/useTasks';
import { CONTENT_MAX_WIDTH, COMPACT_MAX_WIDTH, colors, fonts, space } from '../theme';

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function greeting(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'Guten Morgen';
  if (h >= 11 && h < 17) return 'Guten Tag';
  if (h >= 17 && h < 23) return 'Guten Abend';
  return 'Gute Nacht';
}

/** Startseite: Begrüßung, die Aufgaben von heute und alle Werkzeuge als Bänder. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const now = useNow();
  const { tasks, loaded, add, toggle, remove } = useTasks();
  const [draft, setDraft] = useState('');

  if (!loaded) return <View style={styles.root} />;

  const todayKey = dateKey(now);
  const today = tasks[todayKey] ?? [];
  const todayDone = today.filter((t) => t.done).length;
  const weekStart = startOfWeek(now);
  const weekOpen = WEEKDAYS.reduce(
    (sum, _, i) => sum + (tasks[dateKey(addDays(weekStart, i))] ?? []).filter((t) => !t.done).length,
    0,
  );
  const weekday = WEEKDAYS[(now.getDay() + 6) % 7];

  const summary =
    today.length === 0
      ? 'Für heute ist noch nichts geplant.'
      : `Heute ${today.length} ${today.length === 1 ? 'Aufgabe' : 'Aufgaben'}, ${todayDone} erledigt.`;

  const rowY = wide ? space.rowYWide : space.rowY;

  return (
    <View style={styles.root}>
      <PageHeader title="Startseite" color={colors.days[0]} gutter={gutter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* Begrüßung */}
        <View
          style={[
            styles.band,
            {
              backgroundColor: colors.days[0],
              paddingTop: (wide ? 40 : rowY) + (hasHeader ? 0 : insets.top),
              paddingBottom: wide ? 36 : rowY,
              paddingHorizontal: gutter,
            },
          ]}
        >
          <View style={[styles.inner, wide ? styles.innerWide : styles.innerCompact]}>
            <View style={wide ? styles.side : undefined}>
              <Text style={[styles.welcome, wide && styles.welcomeWide]} role="heading" maxFontSizeMultiplier={1.3}>
                WILLKOMMEN
              </Text>
              <Text style={styles.greeting}>
                {greeting(now)}. {weekday}, {formatDate(now)}
              </Text>
            </View>
            <View style={wide ? styles.bodyWide : styles.summaryCompact}>
              <Text style={styles.summary}>{summary}</Text>
              <Text style={styles.summaryMuted}>
                Diese Woche {weekOpen === 0 ? 'ist alles erledigt.' : `${weekOpen} offen.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Heute: dieselbe Tageszeile wie im Wochenplaner, immer offen */}
        <DayRow
          label="Heute"
          date={now}
          now={now}
          color={colors.days[1]}
          isToday
          expanded
          wide={wide}
          gutter={gutter}
          canHover={canHover}
          tasks={today}
          draft={draft}
          onDraftChange={setDraft}
          onAdd={(title) => add(todayKey, title)}
          onToggle={(id) => toggle(todayKey, id)}
          onRemove={(id) => remove(todayKey, id)}
        />

        <ToolBand
          name="Woche"
          icon="week"
          description={weekOpen === 0 ? 'Wochenplaner' : `Wochenplaner · ${weekOpen} offen`}
          color={colors.days[2]}
          wide={wide}
          gutter={gutter}
          canHover={canHover}
          onPress={() => router.navigate('/woche')}
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
      onPress={onPress}
      disabled={soon}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role={soon ? undefined : 'link'}
      aria-label={soon ? `${name}, kommt bald` : `${name} öffnen`}
      aria-disabled={soon}
      style={[styles.band, styles.tool, { backgroundColor: color, paddingVertical: rowY + 4, paddingHorizontal: gutter }]}
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
  band: {
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
  side: {
    flexBasis: '40%',
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
  tool: {
    cursor: 'pointer',
    justifyContent: 'center',
  },
  toolHover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.hover,
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
