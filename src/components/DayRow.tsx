import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dateKey, formatDate, formatTime } from '../lib/date';
import type { Task } from '../lib/useTasks';
import { heading } from '../lib/web';
import { COMPACT_MAX_WIDTH, CONTENT_MAX_WIDTH, colors, fonts, space } from '../theme';
import { Icon } from './Icon';
import { TaskItem } from './TaskItem';

type Props = {
  label: string;
  /** Überschrift, falls sie anders lauten soll als der Tag (Startseite: „Todos“). */
  title?: string;
  /** Kleiner Zusatz im Kopf, z. B. ein Link zur ganzen Woche. */
  accessory?: ReactNode;
  /** Ersetzt Datum und Uhrzeit neben der Überschrift (Startseite: „1 von 3 erledigt“). */
  subtitle?: string;
  /** Oranger Punkt für heute. Auf der Startseite aus, dort ist alles „heute“. */
  todayDot?: boolean;
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
  /** Aufgabe, die gerade im Fenster offen ist (wird hervorgehoben). */
  selectedId?: string;
  /** Antippen klappt den Tag auf/zu (Handy). Ohne Handler bleibt der Kopf ein fester Titel, z. B. auf der Startseite. */
  onPressHeader?: () => void;
  /** Neue Aufgabe für diesen Tag: öffnet das Fenster. Am PC reicht ein Klick irgendwo aufs Band. */
  onAdd: () => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
};

export function DayRow({
  label,
  title = label,
  accessory,
  subtitle,
  todayDot = true,
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
  selectedId,
  onPressHeader,
  onAdd,
  onToggle,
  onOpen,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const done = tasks.filter((t) => t.done).length;
  const rowY = wide ? space.rowYWide : space.rowY;
  const key = dateKey(date);
  const todayKey = dateKey(now);

  const dateText = (
    <Text style={[styles.date, wide && styles.dateWide]}>
      {subtitle ?? `${formatDate(date)}${isToday ? ` – ${formatTime(now)}` : ''}`}
    </Text>
  );

  const body = (
    <>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          dayKey={key}
          todayKey={todayKey}
          canHover={canHover}
          selected={task.id === selectedId}
          onToggle={() => onToggle(task.id)}
          onOpen={() => onOpen(task.id)}
        />
      ))}
      <AddRow label={label} alone={wide && tasks.length === 0} active={canHover && hovered} onPress={onAdd} />
    </>
  );

  // PC: Datum neben dem Tag, damit die ganze Woche auf einen Bildschirm passt.
  // Das ganze Band ist eine Klickfläche für „Neue Aufgabe“ (nur Maus; Tastatur und Screenreader nehmen
  // die Zeile „Aufgabe hinzufügen“). Klicks auf eine Aufgabe landen bei der Aufgabe, nicht hier.
  if (wide) {
    return (
      <Pressable
        onPress={onAdd}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessible={false}
        tabIndex={-1}
        style={[
          fill && styles.row,
          styles.bandWide,
          { backgroundColor: color, paddingVertical: rowY, paddingHorizontal: gutter },
        ]}
      >
        <View style={styles.innerWide}>
          <View style={styles.side}>
            <View style={styles.headerLineWide}>
              {isToday && todayDot && <View style={styles.todayDot} />}
              <Text {...heading(2)} style={[styles.day, styles.dayWide]} maxFontSizeMultiplier={1.3}>
                {title.toUpperCase()}
              </Text>
              {dateText}
            </View>
            {accessory && <View style={styles.accessoryWide}>{accessory}</View>}
          </View>
          <View style={styles.bodyWide}>{body}</View>
        </View>
      </Pressable>
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
        {/* Als Überschrift nur, wenn der Kopf kein Knopf ist (Knöpfe dürfen keine Überschriften enthalten). */}
        <Text
          {...(onPressHeader ? {} : heading(2))}
          style={styles.day}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.3}
        >
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

type AddRowProps = {
  label: string;
  /** Erste Zeile ohne Aufgaben darüber: sitzt auf der Grundlinie des Tagesnamens. */
  alone: boolean;
  /** Maus ist über dem Band: deutlicher zeigen, dass ein Klick eine Aufgabe anlegt. */
  active: boolean;
  onPress: () => void;
};

/** Leise Zeile „+ Aufgabe hinzufügen“ am Ende eines Tages. Öffnet das Fenster für eine neue Aufgabe. */
function AddRow({ label, alone, active, onPress }: AddRowProps) {
  const [hovered, setHovered] = useState(false);
  const strong = active || hovered;
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="button"
      aria-label={`Aufgabe für ${label} hinzufügen`}
      style={({ pressed }) => [styles.add, alone && styles.addAlone, pressed && styles.addPressed]}
    >
      <Icon name="plus" size={18} color={strong ? colors.ink : colors.inkFaint} strokeWidth={1.75} />
      <Text style={[styles.addText, strong && styles.addTextStrong]}>Aufgabe hinzufügen</Text>
    </Pressable>
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
  bandWide: {
    cursor: 'pointer',
  },
  add: {
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
  addAlone: {
    marginTop: 0,
  },
  addPressed: {
    opacity: 0.6,
  },
  addText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkFaint,
  },
  addTextStrong: {
    color: colors.ink,
  },
});
