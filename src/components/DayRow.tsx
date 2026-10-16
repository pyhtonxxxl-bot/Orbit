import { useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDate, formatTime } from '../lib/date';
import type { Task } from '../lib/useTasks';
import { COMPACT_MAX_WIDTH, CONTENT_MAX_WIDTH, colors, fonts, space } from '../theme';
import { TaskItem } from './TaskItem';

type Props = {
  label: string;
  /** Überschrift, falls sie anders lauten soll als der Tag (Startseite: „Todos“). */
  title?: string;
  /** Kleiner Zusatz im Kopf, z. B. ein Link zur ganzen Woche. */
  accessory?: ReactNode;
  date: Date;
  now: Date;
  color: string;
  isToday: boolean;
  expanded: boolean;
  /** Desktop-Layout: Tag links, Aufgaben rechts, immer offen. */
  wide: boolean;
  /** Teilt sich übrige Höhe mit den anderen Bändern (Standard). Auf der Startseite aus. */
  fill?: boolean;
  gutter: number;
  canHover: boolean;
  topInset?: number;
  tasks: Task[];
  /** Halb getippte Aufgabe. Liegt außerhalb, damit sie Zuklappen, Wochenwechsel und Mitternacht übersteht. */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Antippen klappt den Tag auf/zu (Handy). Ohne Handler bleibt der Kopf ein fester Titel, z. B. auf der Startseite. */
  onPressHeader?: () => void;
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function DayRow({
  label,
  title = label,
  accessory,
  date,
  now,
  color,
  isToday,
  expanded,
  wide,
  fill = true,
  gutter,
  canHover,
  topInset = 0,
  tasks,
  draft,
  onDraftChange,
  onPressHeader,
  onAdd,
  onToggle,
  onRemove,
}: Props) {
  const done = tasks.filter((t) => t.done).length;
  const rowY = wide ? space.rowYWide : space.rowY;

  const dateText = (
    <Text style={[styles.date, wide && styles.dateWide]}>
      {formatDate(date)}
      {isToday ? ` – ${formatTime(now)}` : ''}
    </Text>
  );

  const body = (
    <>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          canHover={canHover}
          onToggle={() => onToggle(task.id)}
          onRemove={() => onRemove(task.id)}
        />
      ))}
      <TaskInput
        label={label}
        alone={wide && tasks.length === 0}
        draft={draft}
        onDraftChange={onDraftChange}
        onAdd={onAdd}
      />
    </>
  );

  // PC: Datum neben dem Tag, damit die ganze Woche auf einen Bildschirm passt.
  if (wide) {
    return (
      <View style={[fill && styles.row, { backgroundColor: color, paddingVertical: rowY, paddingHorizontal: gutter }]}>
        <View style={styles.innerWide}>
          <View style={styles.side}>
            <View style={styles.headerLineWide}>
              {isToday && <View style={styles.todayDot} />}
              <Text role="heading" style={[styles.day, styles.dayWide]} maxFontSizeMultiplier={1.3}>
                {title.toUpperCase()}
              </Text>
              {dateText}
            </View>
            {accessory && <View style={styles.accessoryWide}>{accessory}</View>}
          </View>
          <View style={styles.bodyWide}>{body}</View>
        </View>
      </View>
    );
  }

  const headerStyle = [
    styles.compactHeader,
    !expanded && styles.compactHeaderCollapsed,
    { paddingTop: rowY + topInset, paddingBottom: expanded ? 0 : rowY, paddingHorizontal: gutter },
  ];
  const headerContent = (
    <View style={styles.compactInner}>
      <View style={styles.headerLine}>
        <Text style={styles.day} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {title.toUpperCase()}
        </Text>
        {!expanded && tasks.length > 0 && (
          <Text style={styles.count}>
            {done}/{tasks.length}
          </Text>
        )}
        {accessory}
      </View>
      {(expanded || isToday) && dateText}
    </View>
  );

  // Handy: das ganze Band ist antippbar und klappt den Tag auf oder zu.
  return (
    <View style={[fill && styles.row, { backgroundColor: color }]}>
      {onPressHeader ? (
        <Pressable
          onPress={onPressHeader}
          role="button"
          aria-expanded={expanded}
          aria-label={`${label}, ${formatDate(date)}${isToday ? ', heute' : ''}${tasks.length ? `, ${done} von ${tasks.length} erledigt` : ''}`}
          style={headerStyle}
        >
          {headerContent}
        </Pressable>
      ) : (
        <View style={[headerStyle, styles.staticHeader]}>{headerContent}</View>
      )}

      {expanded && (
        // Eigene (wirkungslose) Tippfläche: sonst ordnen Touch-Browser ein Tippen knapp über dem
        // nächsten Band diesem zu und klappen ungewollt den nächsten Tag auf.
        <Pressable
          accessible={false}
          focusable={false}
          tabIndex={-1}
          style={[styles.compactBody, { paddingHorizontal: gutter, paddingBottom: rowY }]}
        >
          <View style={[styles.compactInner, styles.body]}>{body}</View>
        </Pressable>
      )}
    </View>
  );
}

type TaskInputProps = {
  label: string;
  alone: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  onAdd: (title: string) => void;
};

function TaskInput({ label, alone, draft, onDraftChange, onAdd }: TaskInputProps) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);

  const submit = () => {
    onAdd(draft);
    onDraftChange('');
  };

  return (
    <TextInput
      ref={ref}
      value={draft}
      onChangeText={onDraftChange}
      onSubmitEditing={submit}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      // Am PC: Escape verlässt das Feld, danach funktionieren ← → und T wieder.
      onKeyPress={Platform.OS === 'web' ? (e) => e.nativeEvent.key === 'Escape' && ref.current?.blur() : undefined}
      // Nach Enter im Feld bleiben, um gleich die nächste Aufgabe zu tippen.
      // `submitBehavior` gilt auf iOS/Android, `blurOnSubmit` braucht react-native-web.
      submitBehavior="submit"
      blurOnSubmit={false}
      placeholder="Aufgabe hinzufügen…"
      placeholderTextColor={colors.inkFaint}
      returnKeyType="done"
      aria-label={`Aufgabe für ${label} hinzufügen`}
      style={[styles.input, alone && styles.inputAlone, focused && styles.inputFocused]}
    />
  );
}

const styles = StyleSheet.create({
  // Die Bänder teilen sich übrige Höhe, damit der Stapel immer den ganzen Bildschirm füllt.
  row: {
    flexGrow: 1,
  },
  compactHeader: {
    cursor: 'pointer',
  },
  staticHeader: {
    cursor: 'auto',
  },
  // Zugeklappt füllt die Tippfläche das ganze Band, der Inhalt sitzt mittig.
  compactHeaderCollapsed: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  compactBody: {
    cursor: 'auto',
  },
  compactInner: {
    width: '100%',
    maxWidth: COMPACT_MAX_WIDTH,
  },
  innerWide: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: 48,
  },
  // 43 %: „DONNERSTAG“ und Datum passen bei 1280 px mit Seitenleiste noch in eine Zeile.
  side: {
    flexBasis: '43%',
    maxWidth: 460,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  accessoryWide: {
    marginTop: 6,
    alignItems: 'flex-start',
  },
  headerLineWide: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 16,
  },
  // Kleiner oranger Punkt im Seitenrand markiert heute.
  todayDot: {
    position: 'absolute',
    left: -20,
    top: 19,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  day: {
    flexShrink: 1,
    fontFamily: fonts.heavy,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  dayWide: {
    fontSize: 38,
    lineHeight: 44,
  },
  count: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.inkFaint,
  },
  date: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.inkMuted,
  },
  dateWide: {
    marginTop: 0,
  },
  body: {
    marginTop: 18,
  },
  // Erste Aufgabe steht auf derselben Grundlinie wie Tagesname und Datum.
  bodyWide: {
    flex: 1,
    marginTop: 10,
    maxWidth: 620,
  },
  input: {
    marginTop: 6,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    outlineWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  inputAlone: {
    marginTop: 3,
    paddingBottom: 4,
  },
  // Sichtbarer Fokus ohne Browser-Rahmen: eine feine Linie unter dem Feld.
  inputFocused: {
    borderBottomColor: colors.focus,
  },
});
