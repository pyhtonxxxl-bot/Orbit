import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatLongDate, fromDateKey } from '../lib/date';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import type { PanelState } from '../lib/useTaskPanel';
import type { Tag } from '../lib/useTags';
import {
  daysBefore,
  formatHours,
  hoursOn,
  isDoneOn,
  lastDay,
  normalizeOn,
  parseHours,
  totalHours,
  type Task,
  type TaskDetails,
} from '../lib/useTasks';
import { focusFirst, spaceToggles } from '../lib/web';
import { useColors } from '../lib/theme';
import { fonts, themed } from '../theme';
import { Checkbox } from './Checkbox';
import { DatePicker, DaysPicker } from './DatePicker';
import { Icon } from './Icon';

type Props = {
  state: PanelState;
  /** Die offene Aufgabe (nur beim Bearbeiten). */
  task?: Task;
  tags: Tag[];
  todayKey: string;
  /** PC: Fenster rechts über der Liste. Handy: Blatt von unten. */
  wide: boolean;
  onClose: () => void;
  onCreate: (day: string, details: TaskDetails) => void;
  onUpdate: (patch: Partial<TaskDetails>) => void;
  /** Haken für den Tag, an dem das Fenster geöffnet wurde. */
  onToggle: () => void;
  /** Gearbeitete Stunden an diesem Tag, ohne Zahl gelöscht. */
  onHours: (hours: number | undefined) => void;
  onRemove: () => void;
  /** Zu den Einstellungen, um Tags anzulegen oder umzubenennen. */
  onEditTags: () => void;
};

const isWeb = Platform.OS === 'web';

/** `orbit.app` → `https://orbit.app`. Leer bleibt leer. */
function normalizeLink(raw: string): string {
  const link = raw.trim();
  if (!link) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(link) ? link : `https://${link}`;
}

const SHORT_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** „Jeden Tag“ oder die gewählten Tage plus Fälligkeitstag kurz: „Mo · Mi · Fr“. */
function daysSummary(on: string[] | undefined, end: string): string {
  if (!on) return 'Jeden Tag';
  const days = [...on, end];
  if (days.length > 5) return `${days.length} Tage`;
  return days.map((d) => SHORT_DAYS[fromDateKey(d).getDay()]).join(' · ');
}

/** `1.5` → `1,5`, für das Stundenfeld. */
function hoursInput(hours: number | undefined): string {
  return hours ? String(hours).replace('.', ',') : '';
}

/**
 * Fenster für eine Aufgabe: Beschreibung, Bis, Stunden, Link und Tags. Neue Aufgaben entstehen hier
 * auch (Plus oder Klick auf einen Tag). Schließen mit ×, Escape oder (Handy) Tippen daneben.
 */
export function TaskPanel({
  state,
  task,
  tags,
  todayKey,
  wide,
  onClose,
  onCreate,
  onUpdate,
  onToggle,
  onHours,
  onRemove,
  onEditTags,
}: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const isNew = state.mode === 'new';
  const [title, setTitle] = useState(task?.title ?? '');
  const [link, setLink] = useState(task?.link ?? '');
  // Neue Aufgabe: alles bleibt im Entwurf, bis „Hinzufügen“. Bestehende: Fälligkeit und Tags gelten sofort.
  const [draftDue, setDraftDue] = useState<string | undefined>(undefined);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftOn, setDraftOn] = useState<string[] | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);
  // Browser: das Feld wächst mit dem Text (am Handy macht das die Plattform selbst).
  const [titleHeight, setTitleHeight] = useState(0);
  const panelRef = useRef<View>(null);
  const [slide] = useState(() => new Animated.Value(wide ? 1 : 0));

  const due = isNew ? draftDue : task?.due;
  const selectedTags = isNew ? draftTags : (task?.tags ?? []);
  const validLink = normalizeLink(link);
  // Bestehende Aufgabe: Haken und Stunden gelten für den Tag, an dem das Fenster geöffnet wurde.
  const date = state.mode === 'edit' ? state.date : state.day;
  const end = task ? lastDay(task, state.day) : (due ?? state.day);
  const ranged = end > state.day;
  const done = !!task && isDoneOn(task, state.day, date);
  const dayHours = task ? hoursOn(task, date) : undefined;
  const total = task ? totalHours(task) : 0;
  const [hoursText, setHoursText] = useState(hoursInput(dayHours));
  // Mit „Bis“: an welchen Tagen davor sie in der Liste steht (nichts = jeden Tag).
  const on = normalizeOn(isNew ? draftOn : task?.on, state.day, end);
  const dueHere = !!due && date === end && !done;
  const overdue = !!task && !!due && due < todayKey && !isDoneOn(task, state.day, end);

  const commitTitle = () => {
    if (isNew || !task) return;
    const trimmed = title.trim();
    if (!trimmed) setTitle(task.title);
    else if (trimmed !== task.title) onUpdate({ title: trimmed });
  };
  const commitLink = () => {
    const next = normalizeLink(link);
    setLink(next);
    if (!isNew && task && next !== (task.link ?? '')) onUpdate({ link: next || undefined });
  };
  const setDue = (day: string | undefined) => {
    if (isNew) setDraftDue(day);
    else onUpdate({ due: day });
  };
  const toggleDay = (day: string) => {
    const current = on ?? daysBefore(state.day, end);
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    if (isNew) setDraftOn(next);
    else onUpdate({ on: next });
  };
  const toggleTag = (id: string) => {
    const next = selectedTags.includes(id) ? selectedTags.filter((t) => t !== id) : [...selectedTags, id];
    if (isNew) setDraftTags(next);
    else onUpdate({ tags: next });
  };
  const create = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(state.day, { title: trimmed, due: draftDue, link: validLink || undefined, tags: draftTags, on: draftOn });
    onClose();
  };
  const commitHours = () => {
    const next = parseHours(hoursText);
    setHoursText(hoursInput(next));
    if (!isNew && next !== dayHours) onHours(next);
  };
  // Beim Schließen noch offene Eingaben übernehmen (das Feld verliert den Fokus nicht immer vorher).
  const close = () => {
    commitTitle();
    commitLink();
    commitHours();
    onClose();
  };

  // Textfelder im Browser lassen keine Tasten zur Seite durch (react-native-web): Escape dort selbst abfangen.
  const escapeCloses = isWeb
    ? (e: { nativeEvent: { key: string } }) => {
        if (e.nativeEvent.key === 'Escape') close();
      }
    : undefined;

  // Escape (PC) und Zurück-Taste (Android) schließen. Der Listener liest immer die neueste `close`.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (isWeb && typeof document !== 'undefined') {
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        closeRef.current();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Tastatur im Browser: Fokus ins Fenster, beim Schließen zurück dorthin, wo er vorher war.
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    const previous = document.activeElement as HTMLElement | null;
    if (!isNew) focusFirst(panelRef.current);
    return () => {
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, [isNew]);

  // Handy: das Blatt gleitet von unten herein.
  useEffect(() => {
    if (wide) return;
    Animated.timing(slide, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [wide, slide]);

  const dayLine = isNew ? `Ab ${formatLongDate(fromDateKey(state.day))}` : formatLongDate(fromDateKey(date));

  const content = (
    <>
      <View style={styles.top}>
        {isNew ? (
          <View style={styles.check}>
            <Checkbox checked={false} due={!!due} />
          </View>
        ) : (
          <Pressable
            {...spaceToggles(onToggle)}
            onPress={onToggle}
            role="checkbox"
            aria-checked={done}
            aria-label={ranged ? `Am ${formatLongDate(fromDateKey(date))} erledigt` : 'Erledigt'}
            style={({ pressed }) => [styles.check, styles.clickable, pressed && styles.pressed]}
          >
            <Checkbox checked={done} due={dueHere} />
          </Pressable>
        )}
        <TextInput
          value={title}
          onChangeText={setTitle}
          onBlur={commitTitle}
          onSubmitEditing={isNew ? create : commitTitle}
          onKeyPress={escapeCloses}
          multiline
          numberOfLines={isWeb ? 1 : undefined}
          onContentSizeChange={isWeb ? (e) => setTitleHeight(e.nativeEvent.contentSize.height) : undefined}
          // Enter legt an (neu) bzw. übernimmt; Umschalt+Enter macht im Browser eine neue Zeile.
          blurOnSubmit
          submitBehavior="blurAndSubmit"
          autoFocus={isNew}
          placeholder="Beschreibung…"
          placeholderTextColor={colors.inkFaint}
          aria-label="Beschreibung"
          style={[styles.title, isWeb && { height: Math.max(31, titleHeight) }, done && styles.titleDone]}
        />
        <Pressable
          onPress={close}
          role="button"
          aria-label="Schließen"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Icon name="close" size={20} color={colors.control} />
        </Pressable>
      </View>
      <Text style={styles.dayLine}>{dayLine}</Text>

      <View style={styles.list}>
        <Row label="Bis">
          <View style={styles.dueLine}>
            <Pressable
              onPress={() => setCalendarOpen((open) => !open)}
              role="button"
              aria-expanded={calendarOpen}
              aria-label={due ? `Bis ${formatLongDate(fromDateKey(due))}, ändern` : 'Bis wann? Datum wählen'}
              style={({ pressed }) => [styles.valueButton, pressed && styles.pressed]}
            >
              <Text style={[styles.value, !due && styles.valueEmpty]}>
                {due ? formatLongDate(fromDateKey(due)) : 'Kein Datum'}
              </Text>
            </Pressable>
            {overdue && <Text style={styles.overdue}>überfällig</Text>}
            {due && (
              <Pressable
                onPress={() => {
                  setDue(undefined);
                  setCalendarOpen(false);
                }}
                role="button"
                aria-label="Bis-Datum entfernen"
                hitSlop={8}
                style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
              >
                <Icon name="close" size={14} color={colors.control} />
              </Pressable>
            )}
          </View>
          {calendarOpen && (
            <View style={styles.calendar}>
              <DatePicker
                value={due}
                todayKey={todayKey}
                onChange={(day) => {
                  setDue(day);
                  setCalendarOpen(false);
                }}
              />
            </View>
          )}
        </Row>

        {/* Mit „Bis“: im Mini-Kalender die Tage wählen, an denen sie in der Todo-Liste steht. */}
        {ranged && (
          <Row label="Tage">
            <Pressable
              onPress={() => setDaysOpen((open) => !open)}
              role="button"
              aria-expanded={daysOpen}
              aria-label={`An welchen Tagen in der Liste: ${daysSummary(on, end)}, ändern`}
              style={({ pressed }) => [styles.valueButton, pressed && styles.pressed]}
            >
              <Text style={styles.value}>{daysSummary(on, end)}</Text>
            </Pressable>
            {daysOpen ? (
              <View style={styles.calendar}>
                <DaysPicker start={state.day} end={end} days={on} todayKey={todayKey} onToggle={toggleDay} />
              </View>
            ) : (
              <Text style={styles.note}>An diesen Tagen steht sie in der Liste, am letzten ist sie fällig.</Text>
            )}
          </Row>
        )}

        {!isNew && (
          <Row label="Stunden">
            <View style={styles.hoursLine}>
              <TextInput
                value={hoursText}
                onChangeText={setHoursText}
                onBlur={commitHours}
                onSubmitEditing={commitHours}
                onKeyPress={escapeCloses}
                placeholder="0"
                placeholderTextColor={colors.inkFaint}
                keyboardType="decimal-pad"
                inputMode="decimal"
                returnKeyType="done"
                aria-label={`Stunden am ${formatLongDate(fromDateKey(date))}`}
                style={styles.hoursInput}
              />
              <Text style={styles.hoursUnit}>
                Std.{ranged ? ` am ${formatLongDate(fromDateKey(date)).split(',')[0]}` : ''}
              </Text>
              {total > 0 && total !== (dayHours ?? 0) && <Text style={styles.note}>· gesamt {formatHours(total)}</Text>}
            </View>
          </Row>
        )}

        <Row label="Link">
          <View style={styles.linkLine}>
            <TextInput
              value={link}
              onChangeText={setLink}
              onBlur={commitLink}
              onSubmitEditing={commitLink}
              onKeyPress={escapeCloses}
              placeholder="Link einfügen…"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
              returnKeyType="done"
              aria-label="Link"
              style={styles.linkInput}
            />
            {!!validLink && (
              <Pressable
                onPress={() => Linking.openURL(validLink).catch(() => {})}
                role="link"
                aria-label="Link öffnen"
                hitSlop={8}
                style={({ pressed }) => [styles.openLink, pressed && styles.pressed]}
              >
                <Icon name="external" size={18} color={colors.ink} />
              </Pressable>
            )}
          </View>
        </Row>

        <Row label="Tags">
          <View style={styles.tags}>
            {tags.map((tag) => {
              const on = selectedTags.includes(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  {...spaceToggles(() => toggleTag(tag.id))}
                  onPress={() => toggleTag(tag.id)}
                  role="checkbox"
                  aria-checked={on}
                  aria-label={tag.name}
                  style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
                >
                  <View style={[styles.tagDot, on && styles.tagDotOn]} />
                  <Text style={[styles.tagText, on && styles.tagTextOn]}>{tag.name}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={onEditTags}
              role="link"
              aria-label="Tags bearbeiten"
              style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
            >
              <Text style={styles.editTags}>{tags.length === 0 ? 'Tags anlegen' : 'Bearbeiten'}</Text>
            </Pressable>
          </View>
        </Row>
      </View>

      <View style={styles.footer}>
        {isNew ? (
          <Pressable
            onPress={create}
            disabled={!title.trim()}
            role="button"
            aria-label="Aufgabe hinzufügen"
            style={({ pressed }) => [styles.primary, !title.trim() && styles.primaryDisabled, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Hinzufügen</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onRemove}
            role="button"
            aria-label="Aufgabe löschen"
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>Aufgabe löschen</Text>
          </Pressable>
        )}
      </View>
    </>
  );

  const label = isNew ? 'Neue Aufgabe' : 'Aufgabe';

  // PC: kleines Fenster rechts, über der Liste. Die Liste dahinter bleibt, wie sie ist, und bleibt bedienbar.
  if (wide) {
    return (
      <View style={styles.floating}>
        <View ref={panelRef} style={styles.card} role="dialog" aria-label={label}>
          <ScrollView contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Handy: Blatt von unten über einer abgedunkelten Fläche, Tippen daneben schließt.
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  return (
    <View style={styles.sheetRoot}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={styles.fill} onPress={close} accessible={false} tabIndex={-1} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          ref={panelRef}
          role="dialog"
          aria-modal
          aria-label={label}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 + keyboard, transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Eine Zeile der Aufzählung: Punkt, Name, Inhalt. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  const colors = useColors();
  const styles = getStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.dot} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

const getStyles = themed((colors) => ({
  // PC
  floating: {
    position: 'absolute',
    top: 16,
    right: 16,
    bottom: 16,
    width: 400,
    maxWidth: '92%',
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  card: {
    maxHeight: '100%',
    borderRadius: 16,
    backgroundColor: colors.panel,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardContent: {
    padding: 20,
  },
  // Handy
  sheetRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.backdrop,
  },
  fill: {
    flex: 1,
    cursor: 'auto',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.panel,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginTop: 8,
    borderRadius: 2,
    backgroundColor: colors.sidebarLine,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  // Inhalt
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  check: {
    paddingTop: 5,
    paddingRight: 14,
  },
  clickable: {
    cursor: 'pointer',
  },
  title: {
    flex: 1,
    minHeight: 32,
    paddingVertical: 2,
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 27,
    color: colors.ink,
    outlineWidth: 0,
  },
  titleDone: {
    color: colors.done,
  },
  close: {
    width: 36,
    height: 36,
    marginTop: -2,
    marginRight: -8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    cursor: 'pointer',
  },
  dayLine: {
    marginTop: 4,
    marginLeft: 36,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.inkMuted,
  },
  list: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.sidebarLine,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  rowHead: {
    width: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 28,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.inkFaint,
  },
  rowLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.inkMuted,
  },
  rowBody: {
    flex: 1,
  },
  dueLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 28,
  },
  valueButton: {
    paddingVertical: 4,
    cursor: 'pointer',
  },
  value: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  valueEmpty: {
    fontFamily: fonts.regular,
    color: colors.inkFaint,
  },
  overdue: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.accentText,
  },
  clear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    cursor: 'pointer',
  },
  calendar: {
    marginTop: 8,
    marginLeft: -76,
    alignItems: 'center',
  },
  note: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.inkMuted,
  },
  hoursLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 28,
  },
  hoursInput: {
    width: 56,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.hover,
    fontFamily: fonts.medium,
    fontSize: 15,
    textAlign: 'center',
    color: colors.ink,
    outlineWidth: 0,
  },
  hoursUnit: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.inkMuted,
  },
  linkLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 28,
  },
  linkInput: {
    flex: 1,
    paddingVertical: 4,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    outlineWidth: 0,
  },
  openLink: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    cursor: 'pointer',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 28,
    cursor: 'pointer',
  },
  // Gewählt: voller Punkt, sonst nur ein Ring.
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.control,
  },
  tagDotOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tagText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.inkMuted,
  },
  tagTextOn: {
    fontFamily: fonts.medium,
    color: colors.ink,
  },
  editTags: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.inkFaint,
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.sidebarLine,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  primary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.pill,
    cursor: 'pointer',
  },
  primaryDisabled: {
    opacity: 0.35,
    cursor: 'auto',
  },
  primaryText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.inverse,
  },
  remove: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    cursor: 'pointer',
  },
  removeText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.6,
  },
}));
