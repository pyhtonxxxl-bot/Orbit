import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitRow } from '../components/HabitRow';
import { WeekFooter } from '../components/WeekFooter';
import { PageHeader } from '../components/shell/PageHeader';
import { confirmDelete } from '../lib/confirm';
import { dateKey, formatWeekRange, isoWeek } from '../lib/date';
import { useShell } from '../lib/shell';
import { streak, streakText, useHabits } from '../lib/useHabits';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useNow } from '../lib/useNow';
import { useWeekNav } from '../lib/useWeekNav';
import { COMPACT_MAX_WIDTH, CONTENT_MAX_WIDTH, bandColor, colors, fonts, space } from '../theme';

const tap = () => Haptics.selectionAsync().catch(() => {});

/** Habits: was du jeden Tag tun willst. Pro Habit ein Band mit den sieben Tagen der Woche zum Abhaken. */
export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const now = useNow();
  const { habits, loaded, add, toggle, remove } = useHabits();
  const { weekStart, isCurrentWeek, shiftWeek } = useWeekNav(now);
  const [draft, setDraft] = useState('');

  if (!loaded) return <View style={styles.root} />;

  const todayKey = dateKey(now);
  const streaks = habits.map((h) => streak(h, now));
  const doneToday = habits.filter((h) => h.done.includes(todayKey)).length;
  const best = streaks.reduce((max, s, i) => (s > (streaks[max] ?? 0) ? i : max), -1);
  const rowY = wide ? space.rowYWide : space.rowY;
  // Ein Band mehr als Habits: das letzte ist das Feld für ein neues.
  const bands = habits.length + 1;

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

      <PageHeader title="Habits" color={colors.days[0]} gutter={gutter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
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
              <Text style={[styles.heading, wide && styles.headingWide]} role="heading" maxFontSizeMultiplier={1.3}>
                HABITS
              </Text>
              <Text style={styles.subline}>Jeden Tag ein Haken.</Text>
            </View>
            <View style={wide ? styles.bodyWide : styles.summaryCompact}>
              {habits.length === 0 ? (
                <>
                  <Text style={styles.summary}>Noch keine Habits.</Text>
                  <Text style={styles.summaryMuted}>Leg unten dein erstes an, z. B. Lesen oder Wasser trinken.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.summary}>
                    Heute {doneToday} von {habits.length} erledigt.
                  </Text>
                  {best >= 0 && (
                    <Text style={styles.summaryMuted}>
                      Längste Serie: {habits[best].title}, {streakText(streaks[best], false)}.
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {habits.map((habit, i) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            streak={streaks[i]}
            weekStart={weekStart}
            todayKey={todayKey}
            color={bandColor(i, bands)}
            wide={wide}
            gutter={gutter}
            canHover={canHover}
            onToggle={(day) => {
              tap();
              toggle(habit.id, day);
            }}
            onRemove={() =>
              confirmDelete(`„${habit.title}“ löschen?`, 'Das Habit und alle Haken verschwinden.', () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                remove(habit.id);
              })
            }
          />
        ))}

        <NewHabit
          color={bandColor(habits.length, bands)}
          wide={wide}
          gutter={gutter}
          draft={draft}
          onDraftChange={setDraft}
          onAdd={(title) => add(title)}
        />

        {/* Am Handy scrollt die Wochen-Navigation mit, am PC bleibt sie unten immer sichtbar. */}
        {!wide && footer}
      </ScrollView>
      {wide && footer}

      {/* Leicht deckende Fläche hinter der Statusleiste, damit Uhrzeit und Akku lesbar bleiben. */}
      {!hasHeader && <View style={[styles.statusBar, { height: insets.top }]} />}
    </View>
  );
}

type NewHabitProps = {
  color: string;
  wide: boolean;
  gutter: number;
  draft: string;
  onDraftChange: (text: string) => void;
  onAdd: (title: string) => void;
};

/** Letztes Band: hier entsteht ein neues Habit. Es füllt den restlichen Platz, damit der Stapel bis unten reicht. */
function NewHabit({ color, wide, gutter, draft, onDraftChange, onAdd }: NewHabitProps) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);
  const rowY = wide ? space.rowYWide : space.rowY;

  const input = (
    <TextInput
      ref={ref}
      value={draft}
      onChangeText={onDraftChange}
      onSubmitEditing={() => {
        onAdd(draft);
        onDraftChange('');
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyPress={Platform.OS === 'web' ? (e) => e.nativeEvent.key === 'Escape' && ref.current?.blur() : undefined}
      submitBehavior="submit"
      blurOnSubmit={false}
      placeholder="Neues Habit hinzufügen…"
      placeholderTextColor={colors.inkFaint}
      returnKeyType="done"
      aria-label="Neues Habit hinzufügen"
      style={[styles.input, focused && styles.inputFocused]}
    />
  );

  return (
    <View style={[styles.newBand, { backgroundColor: color, paddingVertical: rowY + 6, paddingHorizontal: gutter }]}>
      <View style={[styles.inner, wide ? styles.innerWide : styles.innerCompact]}>
        {wide && <View style={styles.side} />}
        <View style={wide ? styles.bodyWide : undefined}>{input}</View>
      </View>
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
    flexBasis: '43%',
    maxWidth: 460,
  },
  bodyWide: {
    flex: 1,
    maxWidth: 620,
  },
  heading: {
    fontFamily: fonts.heavy,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  headingWide: {
    fontSize: 48,
    lineHeight: 54,
  },
  subline: {
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
  newBand: {
    flexGrow: 1,
    minHeight: 96,
  },
  input: {
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
    outlineWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  // Sichtbarer Fokus ohne Browser-Rahmen: eine feine Linie unter dem Feld.
  inputFocused: {
    borderBottomColor: colors.focus,
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
