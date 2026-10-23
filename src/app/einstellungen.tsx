import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { PageHeader } from '../components/shell/PageHeader';
import { confirmDelete } from '../lib/confirm';
import { WEEKDAYS } from '../lib/date';
import { useShell } from '../lib/shell';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import { useCanHover, useLayout } from '../lib/useLayout';
import { isDaily, useHabits, type Habit } from '../lib/useHabits';
import { useTags, type Tag } from '../lib/useTags';
import { heading, spaceToggles } from '../lib/web';
import { COMPACT_MAX_WIDTH, CONTENT_MAX_WIDTH, colors, fonts, space } from '../theme';

/** Einstellungen: Habits mit ihren Wochentagen, Tags für Aufgaben. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const keyboard = useKeyboardInset();
  const { tags, loaded, add, rename, remove } = useTags();
  const habits = useHabits();
  const [draft, setDraft] = useState('');
  const [habitDraft, setHabitDraft] = useState('');

  if (!loaded || !habits.loaded) return <View style={styles.root} />;

  const rowY = wide ? space.rowYWide : space.rowY;

  return (
    <View style={styles.root}>
      <PageHeader color={colors.days[0]} gutter={gutter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: keyboard }]}
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
            <Text style={[styles.heading, wide && styles.headingWide]} role="heading" maxFontSizeMultiplier={1.3}>
              EINSTELLUNGEN
            </Text>
          </View>
        </View>

        {/* Habits: Name und die Wochentage, an denen es sich wiederholt. */}
        <View style={{ backgroundColor: colors.days[1], paddingVertical: rowY + 6, paddingHorizontal: gutter }}>
          <View style={[styles.inner, wide ? styles.innerWide : styles.innerCompact]}>
            <View style={wide ? styles.side : undefined}>
              <Text {...heading(2)} style={[styles.section, wide && styles.sectionWide]} maxFontSizeMultiplier={1.3}>
                HABITS
              </Text>
              <Text style={styles.hint}>Wiederholt sich an den dunklen Tagen. Jeden Tag gibt es ein frisches Kästchen.</Text>
            </View>
            <View style={wide ? styles.bodyWide : styles.bodyCompact}>
              {habits.habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  wide={wide}
                  canHover={canHover}
                  onRename={(title) => habits.rename(habit.id, title)}
                  onDays={(days) => habits.setDays(habit.id, days)}
                  onRemove={() =>
                    confirmDelete(`Habit „${habit.title}“ löschen?`, 'Das Habit und alle Haken verschwinden.', () =>
                      habits.remove(habit.id),
                    )
                  }
                />
              ))}
              <View style={styles.tagRow}>
                <Icon name="plus" size={16} color={colors.inkFaint} />
                <TextInput
                  value={habitDraft}
                  onChangeText={setHabitDraft}
                  onSubmitEditing={() => {
                    habits.add(habitDraft);
                    setHabitDraft('');
                  }}
                  submitBehavior="submit"
                  blurOnSubmit={false}
                  placeholder="Neues Habit, z. B. Lesen…"
                  placeholderTextColor={colors.inkFaint}
                  returnKeyType="done"
                  aria-label="Neues Habit hinzufügen"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Tags: links der Name des Abschnitts, rechts die Liste mit Punkten. */}
        <View style={[styles.band, { backgroundColor: colors.days[2], paddingVertical: rowY + 6, paddingHorizontal: gutter }]}>
          <View style={[styles.inner, wide ? styles.innerWide : styles.innerCompact]}>
            <View style={wide ? styles.side : undefined}>
              <Text {...heading(2)} style={[styles.section, wide && styles.sectionWide]} maxFontSizeMultiplier={1.3}>
                TAGS
              </Text>
              <Text style={styles.hint}>Zum Sortieren deiner Aufgaben, z. B. Schule.</Text>
            </View>
            <View style={wide ? styles.bodyWide : styles.bodyCompact}>
              {tags.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  canHover={canHover}
                  onRename={(name) => rename(tag.id, name)}
                  onRemove={() =>
                    confirmDelete(`Tag „${tag.name}“ löschen?`, 'Aufgaben verlieren nur diesen Tag, sonst nichts.', () =>
                      remove(tag.id),
                    )
                  }
                />
              ))}
              <View style={styles.tagRow}>
                <Icon name="plus" size={16} color={colors.inkFaint} />
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => {
                    add(draft);
                    setDraft('');
                  }}
                  submitBehavior="submit"
                  blurOnSubmit={false}
                  placeholder="Neuer Tag…"
                  placeholderTextColor={colors.inkFaint}
                  returnKeyType="done"
                  aria-label="Neuen Tag hinzufügen"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];

type HabitRowProps = {
  habit: Habit;
  wide: boolean;
  canHover: boolean;
  onRename: (title: string) => void;
  onDays: (days: number[]) => void;
  onRemove: () => void;
};

/** Ein Habit: Punkt, Name zum Umbenennen, die sieben Wochentage zum An- und Abschalten, × zum Löschen. */
function HabitRow({ habit, wide, canHover, onRename, onDays, onRemove }: HabitRowProps) {
  const [name, setName] = useState(habit.title);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<TextInput>(null);
  const days = habit.days ?? [0, 1, 2, 3, 4, 5, 6];

  // Name wurde woanders geändert (anderer Tab): übernehmen, solange hier nicht getippt wird.
  const [lastName, setLastName] = useState(habit.title);
  if (habit.title !== lastName) {
    setLastName(habit.title);
    if (!focused) setName(habit.title);
  }

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) setName(habit.title);
    else if (trimmed !== habit.title) onRename(trimmed);
  };
  // Der letzte Tag lässt sich nicht abschalten: ein Habit ohne Tage stünde nie an.
  const toggleDay = (d: number) => {
    if (days.includes(d)) {
      if (days.length > 1) onDays(days.filter((x) => x !== d));
    } else onDays([...days, d]);
  };

  const dayButtons = (
    <View style={styles.weekdays} role="group" aria-label={`Wiederholung von „${habit.title}“`}>
      {LETTERS.map((letter, d) => {
        const on = days.includes(d);
        return (
          <Pressable
            key={d}
            {...spaceToggles(() => toggleDay(d))}
            onPress={() => toggleDay(d)}
            role="checkbox"
            aria-checked={on}
            aria-label={WEEKDAYS[d]}
            style={({ pressed }) => [styles.weekday, on && styles.weekdayOn, pressed && styles.pressed]}
          >
            <Text style={[styles.weekdayText, on && styles.weekdayTextOn]} selectable={false}>
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const nameInput = (
    <TextInput
      ref={ref}
      value={name}
      onChangeText={setName}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onSubmitEditing={() => ref.current?.blur()}
      returnKeyType="done"
      aria-label={`Habit „${habit.title}“ umbenennen`}
      style={[styles.input, styles.tagName, focused && styles.inputFocused]}
    />
  );
  const removeButton = (
    <Pressable
      onPress={onRemove}
      role="button"
      aria-label={`Habit „${habit.title}“ löschen`}
      style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
    >
      <Icon name="close" size={16} color={colors.control} />
    </Pressable>
  );

  return (
    <View
      style={[styles.habitRow, canHover && hovered && styles.tagRowHovered]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <View style={styles.habitHead}>
        <View style={styles.dot} />
        {nameInput}
        {wide && dayButtons}
        {removeButton}
      </View>
      {!wide && <View style={styles.habitDays}>{dayButtons}</View>}
      {!wide && <Text style={styles.repeat}>{isDaily(habit) ? 'Jeden Tag' : days.map((d) => WEEKDAYS[d].slice(0, 2)).join(' · ')}</Text>}
    </View>
  );
}

type TagRowProps = {
  tag: Tag;
  canHover: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
};

/** Ein Tag: Punkt, Name zum direkten Umbenennen, × zum Löschen. */
function TagRow({ tag, canHover, onRename, onRemove }: TagRowProps) {
  const [name, setName] = useState(tag.name);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<TextInput>(null);

  // Name wurde woanders geändert (anderer Tab): übernehmen, solange hier nicht getippt wird.
  const [lastName, setLastName] = useState(tag.name);
  if (tag.name !== lastName) {
    setLastName(tag.name);
    if (!focused) setName(tag.name);
  }

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) setName(tag.name);
    else if (trimmed !== tag.name) onRename(trimmed);
  };

  return (
    <View
      style={[styles.tagRow, canHover && hovered && styles.tagRowHovered]}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <View style={styles.dot} />
      <TextInput
        ref={ref}
        value={name}
        onChangeText={setName}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onSubmitEditing={() => ref.current?.blur()}
        returnKeyType="done"
        aria-label={`Tag „${tag.name}“ umbenennen`}
        style={[styles.input, styles.tagName, focused && styles.inputFocused]}
      />
      <Pressable
        onPress={onRemove}
        role="button"
        aria-label={`Tag „${tag.name}“ löschen`}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
      >
        <Icon name="close" size={16} color={colors.control} />
      </Pressable>
    </View>
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
    flexBasis: '43%',
    maxWidth: 460,
  },
  bodyWide: {
    flex: 1,
    maxWidth: 620,
  },
  bodyCompact: {
    marginTop: 18,
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
  section: {
    fontFamily: fonts.heavy,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  sectionWide: {
    fontSize: 34,
    lineHeight: 40,
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkMuted,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    minHeight: 44,
    borderRadius: 8,
  },
  tagRowHovered: {
    backgroundColor: colors.hover,
  },
  habitRow: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  habitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  habitDays: {
    marginLeft: 28,
  },
  repeat: {
    marginLeft: 28,
    marginTop: 4,
    marginBottom: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.inkMuted,
  },
  weekdays: {
    flexDirection: 'row',
    gap: 6,
  },
  // Wochentag: dunkel gefüllt = an diesem Tag, nur Ring = nicht.
  weekday: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.control,
    cursor: 'pointer',
  },
  weekdayOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  weekdayText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.inkMuted,
    userSelect: 'none',
  },
  weekdayTextOn: {
    color: colors.white,
  },
  dot: {
    width: 6,
    height: 6,
    marginHorizontal: 5,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
    outlineWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tagName: {
    fontFamily: fonts.medium,
  },
  inputFocused: {
    borderBottomColor: colors.focus,
  },
  remove: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    cursor: 'pointer',
  },
  pressed: {
    opacity: 0.6,
  },
});
