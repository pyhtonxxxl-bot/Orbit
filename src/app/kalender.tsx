import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Band } from '../components/health/Band';
import { PillButton, Toggle, WeekdayPicker } from '../components/health/Form';
import { PageHeader } from '../components/shell/PageHeader';
import { suggestWithClaude } from '../lib/ai';
import {
  WINDOW_DAYS,
  formatDay,
  formatMinutes,
  suggestByRules,
  weekdayOf,
  type CalendarEvent,
  type Existing,
  type Suggestion,
  type SuggestionKind,
} from '../lib/calendar';
import { addDays, dateKey, fromDateKey } from '../lib/date';
import { BUILT_IN_CLIENT_ID, connect, disconnect, fetchEvents, googleSupported, hasToken, preloadGoogle } from '../lib/google';
import { formatWhen } from '../lib/health';
import { useShell } from '../lib/shell';
import { useColors } from '../lib/theme';
import { useCalendar } from '../lib/useCalendar';
import { useHabits } from '../lib/useHabits';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import { useCanHover, useLayout } from '../lib/useLayout';
import { useNow } from '../lib/useNow';
import { useTasks } from '../lib/useTasks';
import { enterActivates } from '../lib/web';
import { fonts, themed } from '../theme';

const tap = () => Haptics.selectionAsync().catch(() => {});
/** Kein Browser-Fokusrahmen in Eingabefeldern. */
const NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;
const CLIENT_ID = /^[\w-]+\.apps\.googleusercontent\.com$/;

/**
 * Kalender: Termine aus Google holen, daraus Vorschläge für Todos und Habits machen (nach Regeln oder mit Claude),
 * und die Person entscheidet pro Vorschlag: übernehmen, ändern oder ignorieren.
 */
export default function CalendarScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const keyboard = useKeyboardInset();
  const { calendar, loaded, setSettings, setFetched, setSuggestions, decide, clear } = useCalendar();
  const tasks = useTasks();
  const habits = useHabits();
  const [busy, setBusy] = useState<null | 'google' | 'ai'>(null);
  // Wo der Fehler passiert ist: oben bei Google oder unten bei der KI, damit er neben dem Knopf steht.
  const [error, setError] = useState<{ text: string; from: 'google' | 'ai' } | null>(null);
  const [connected, setConnected] = useState(hasToken());
  const now = useNow();

  useEffect(() => {
    preloadGoogle();
  }, []);

  if (!loaded || !tasks.loaded || !habits.loaded) return <View style={styles.root} />;

  const clientId = BUILT_IN_CLIENT_ID || calendar.clientId;
  const today = dateKey(now);
  const existing: Existing = {
    titles: [...habits.habits.map((h) => h.title), ...Object.values(tasks.tasks).flatMap((list) => list.map((t) => t.title))],
  };
  const aiReady = calendar.useAi && calendar.aiKey.trim().length > 0;

  const run = async (events: CalendarEvent[]) => {
    if (!aiReady) return;
    setBusy('ai');
    try {
      setSuggestions(await suggestWithClaude(calendar.aiKey.trim(), events, today, existing));
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : 'Die KI-Vorschläge haben nicht geklappt.', from: 'ai' });
    }
  };

  // Aus dem Klick heraus, sonst blockiert der Browser das Anmelde-Fenster von Google.
  const refresh = async () => {
    setError(null);
    setBusy('google');
    try {
      const token = await connect(clientId);
      setConnected(true);
      const events = await fetchEvents(token);
      setFetched(events, suggestByRules(events, today, existing));
      await run(events);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : 'Das hat nicht geklappt.', from: 'google' });
    } finally {
      setBusy(null);
    }
  };

  const rethink = async () => {
    setError(null);
    await run(calendar.events);
    setBusy(null);
  };

  const accept = (s: Suggestion, kind: SuggestionKind, title: string, days: number[]) => {
    tap();
    if (kind === 'todo') {
      const day = s.day ?? (s.eventIds.length ? calendar.events.find((e) => e.id === s.eventIds[0])?.day : undefined) ?? today;
      tasks.add(day, { title, due: s.kind === 'todo' ? s.due : undefined });
    } else {
      habits.add(title, days);
    }
    decide(s.key, 'accepted');
  };

  const onDisconnect = () => {
    disconnect();
    setConnected(false);
    clear();
  };

  const upcoming = calendar.events.filter((e) => e.day >= today && e.day <= dateKey(addDays(fromDateKey(today), 6)));
  const status = calendar.fetchedAt
    ? `${connected ? 'Verbunden. ' : ''}Zuletzt geholt ${formatWhen(calendar.fetchedAt, now.getTime())}: ${calendar.events.length} ${calendar.events.length === 1 ? 'Termin' : 'Termine'} in den nächsten ${WINDOW_DAYS} Tagen.`
    : 'Noch nicht verbunden.';

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
        <Band
          first
          title="KALENDER"
          hint="Hol deine Termine aus Google. Orbit macht daraus Vorschläge für Todos und Habits, und du entscheidest, was übernommen wird."
          color={colors.days[0]}
          wide={wide}
          gutter={gutter}
          topInset={hasHeader ? 0 : insets.top}
          side={
            <View style={styles.connect}>
              <Text style={styles.status}>{status}</Text>
              {!googleSupported ? (
                <Text style={styles.small}>Verbinden geht im Browser: öffne Orbit auf orbit-e610.onrender.com.</Text>
              ) : clientId ? (
                <View style={styles.buttons}>
                  <PillButton
                    label={busy === 'google' ? 'Hole Termine …' : busy === 'ai' ? 'Claude denkt nach …' : calendar.fetchedAt ? 'Neu abrufen' : 'Mit Google verbinden'}
                    disabled={!!busy}
                    onPress={refresh}
                  />
                  {calendar.fetchedAt !== null && !busy && <PillButton label="Trennen" quiet onPress={onDisconnect} />}
                </View>
              ) : (
                <Text style={styles.small}>Einmal einrichten, dann geht es mit einem Klick (siehe unten).</Text>
              )}
              {!!error && (
                <Text style={styles.error} role="alert">
                  {error.text}
                </Text>
              )}
            </View>
          }
        />

        <Band
          title="VORSCHLÄGE"
          hint={
            calendar.suggestions.length
              ? `${calendar.suggestions.length} ${calendar.suggestions.length === 1 ? 'Vorschlag' : 'Vorschläge'}${
                  calendar.suggestions.some((s) => s.source === 'ki') ? ' von Claude' : ' nach Regeln'
                }. Titel und Tage kannst du vorher ändern.`
              : calendar.fetchedAt
                ? 'Gerade nichts Neues. Ruf neu ab, wenn sich dein Kalender ändert.'
                : 'Erscheinen hier, sobald Termine geholt sind.'
          }
          color={colors.days[1]}
          wide={wide}
          gutter={gutter}
        >
          {calendar.suggestions.length > 0 ? (
            calendar.suggestions.map((s) => (
              <SuggestionCard
                // Mit Quelle und Titel: kommt für denselben Termin ein neuer Vorschlag (z. B. von Claude), startet die Karte frisch.
                key={`${s.key}:${s.source}:${s.title}`}
                suggestion={s}
                events={calendar.events}
                canHover={canHover}
                onAccept={(kind, title, days) => accept(s, kind, title, days)}
                onDismiss={() => {
                  tap();
                  decide(s.key, 'dismissed');
                }}
              />
            ))
          ) : (
            <Text style={styles.empty}>Keine offenen Vorschläge.</Text>
          )}
        </Band>

        <Band
          title="MIT KI"
          hint="Optional. Mit Claude werden die Vorschläge schlauer, zum Beispiel ein Lernplan vor einer Prüfung oder das Training als Habit statt als Termin."
          color={colors.days[2]}
          wide={wide}
          gutter={gutter}
        >
          <Toggle
            label="Vorschläge mit Claude"
            hint="Sonst rechnet Orbit nach festen Regeln, ganz auf deinem Gerät."
            value={calendar.useAi}
            onChange={(useAi) => setSettings({ useAi })}
          />
          {calendar.useAi && (
            <View style={styles.ai}>
              <Text style={styles.label}>Dein Anthropic-API-Schlüssel</Text>
              <TextInput
                value={calendar.aiKey}
                onChangeText={(aiKey) => setSettings({ aiKey })}
                placeholder="sk-ant-…"
                placeholderTextColor={colors.inkFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                aria-label="Anthropic-API-Schlüssel"
                style={[styles.input, NO_OUTLINE]}
              />
              <Text style={styles.small}>
                Den Schlüssel bekommst du in der Anthropic Console unter „API Keys“. Er bleibt nur auf diesem Gerät. Pro Durchlauf
                kostet es über dein Anthropic-Konto wenige Cent. An Claude gehen nur Titel, Tag und Uhrzeit deiner Termine, keine
                Beschreibungen oder Orte.
              </Text>
              <View style={styles.buttons}>
                <LinkButton label="Anthropic Console öffnen" url="https://console.anthropic.com/settings/keys" canHover={canHover} />
                {calendar.events.length > 0 && (
                  <PillButton label={busy === 'ai' ? 'Claude denkt nach …' : 'Jetzt mit Claude vorschlagen'} quiet disabled={!aiReady || !!busy} onPress={rethink} />
                )}
              </View>
              {error?.from === 'ai' && <Text style={styles.error}>{error.text}</Text>}
            </View>
          )}
        </Band>

        <Band
          title="DEINE TERMINE"
          hint={upcoming.length ? 'Die nächsten 7 Tage aus deinem Kalender.' : 'Noch keine Termine geholt.'}
          color={colors.days[3]}
          wide={wide}
          gutter={gutter}
          grow={!!clientId}
        >
          {upcoming.length > 0 && <EventList events={upcoming} />}
        </Band>

        {!BUILT_IN_CLIENT_ID && (
          <Band
            title="EINRICHTEN"
            hint="Einmal, etwa 10 Minuten. Orbit hat keinen eigenen Server, deshalb braucht es einen eigenen Google-Zugang für deine App."
            color={colors.days[4]}
            wide={wide}
            gutter={gutter}
            grow
          >
            <Setup clientId={calendar.clientId} canHover={canHover} onClientId={(id) => setSettings({ clientId: id })} />
          </Band>
        )}
      </ScrollView>
    </View>
  );
}

type CardProps = {
  suggestion: Suggestion;
  events: CalendarEvent[];
  canHover: boolean;
  onAccept: (kind: SuggestionKind, title: string, days: number[]) => void;
  onDismiss: () => void;
};

/** Ein Vorschlag: Art, Titel zum Ändern, wann, warum, und die Knöpfe. */
function SuggestionCard({ suggestion: s, events, canHover, onAccept, onDismiss }: CardProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [title, setTitle] = useState(s.title);
  const [kind, setKind] = useState<SuggestionKind>(s.kind);
  const firstEvent = events.find((e) => e.id === s.eventIds[0]);
  const [days, setDays] = useState<number[]>(
    s.days?.length ? s.days : firstEvent ? [weekdayOf(firstEvent.day)] : s.day ? [weekdayOf(s.day)] : [0],
  );
  const day = s.day ?? firstEvent?.day;
  const when =
    kind === 'habit'
      ? null
      : day
        ? s.kind === 'todo' && s.due
          ? `${formatDay(day)} bis ${formatDay(s.due)}`
          : formatDay(day)
        : 'heute';

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={[styles.kind, kind === 'habit' && styles.kindHabit]}>{kind === 'todo' ? 'TODO' : 'HABIT'}</Text>
        {s.source === 'ki' && <Text style={styles.ki}>Claude</Text>}
        {!!when && <Text style={styles.when}>{when}</Text>}
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        aria-label="Titel"
        style={[styles.title, NO_OUTLINE]}
        returnKeyType="done"
      />
      {kind === 'habit' && (
        <View style={styles.days}>
          <WeekdayPicker label="Wochentage" days={days} onChange={(d) => d.length && setDays(d)} />
        </View>
      )}
      <Text style={styles.reason}>{s.reason}</Text>
      <View style={styles.cardButtons}>
        <PillButton label={kind === 'todo' ? 'Als Todo eintragen' : 'Als Habit eintragen'} disabled={!title.trim()} onPress={() => onAccept(kind, title.trim(), days)} />
        <PillButton label="Ignorieren" quiet onPress={onDismiss} />
        <SwitchKind kind={kind} canHover={canHover} onPress={() => setKind(kind === 'todo' ? 'habit' : 'todo')} />
      </View>
    </View>
  );
}

function SwitchKind({ kind, canHover, onPress }: { kind: SuggestionKind; canHover: boolean; onPress: () => void }) {
  const styles = getStyles(useColors());
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="button"
      aria-label={kind === 'todo' ? 'Lieber als Habit' : 'Lieber als Todo'}
      style={({ pressed }) => [styles.switch, canHover && hovered && styles.switchHovered, pressed && styles.pressed]}
    >
      <Text style={styles.switchText}>{kind === 'todo' ? 'Lieber als Habit' : 'Lieber als Todo'}</Text>
    </Pressable>
  );
}

/** Termine nach Tagen, schlicht. */
function EventList({ events }: { events: CalendarEvent[] }) {
  const styles = getStyles(useColors());
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  return (
    <View style={styles.events}>
      {[...byDay].map(([day, list]) => (
        <View key={day} style={styles.eventDay}>
          <Text style={styles.eventDayLabel}>{formatDay(day)}</Text>
          {list.map((e) => (
            <View key={e.id} style={styles.eventRow}>
              <Text style={styles.eventTime}>{e.allDay || e.start === undefined ? 'ganztags' : formatMinutes(e.start)}</Text>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {e.title}
                {e.recurring ? <Text style={styles.small}> · wiederholt sich</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const STEPS: { text: string; url?: string; link?: string }[] = [
  { text: 'In der Google Cloud Console ein neues Projekt anlegen, z. B. „Orbit“.', url: 'https://console.cloud.google.com/projectcreate', link: 'Projekt anlegen' },
  { text: 'Die „Google Calendar API“ für das Projekt aktivieren.', url: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com', link: 'API aktivieren' },
  {
    text: 'Den OAuth-Zustimmungsbildschirm einrichten: Typ „Extern“, App-Name „Orbit“, deine E-Mail. Bei „Testnutzer“ deine eigene Google-Adresse eintragen.',
    url: 'https://console.cloud.google.com/apis/credentials/consent',
    link: 'Zustimmungsbildschirm',
  },
  {
    text: 'Unter „Anmeldedaten“ eine OAuth-Client-ID vom Typ „Webanwendung“ erstellen. Bei „Autorisierte JavaScript-Quellen“ https://orbit-e610.onrender.com eintragen.',
    url: 'https://console.cloud.google.com/apis/credentials',
    link: 'Anmeldedaten',
  },
  { text: 'Die Client-ID kopieren (sie endet auf .apps.googleusercontent.com) und hier einfügen.' },
];

function Setup({ clientId, canHover, onClientId }: { clientId: string; canHover: boolean; onClientId: (id: string) => void }) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [draft, setDraft] = useState(clientId);
  const valid = CLIENT_ID.test(draft.trim());
  return (
    <View>
      {STEPS.map((step, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNumber}>{i + 1}</Text>
          <View style={styles.stepBody}>
            <Text style={styles.stepText}>{step.text}</Text>
            {step.url && <LinkButton label={step.link!} url={step.url} canHover={canHover} />}
          </View>
        </View>
      ))}
      <Text style={[styles.label, styles.clientLabel]}>Client-ID</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="123456-abc.apps.googleusercontent.com"
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        aria-label="Google OAuth-Client-ID"
        style={[styles.input, NO_OUTLINE]}
      />
      {!!draft.trim() && !valid && <Text style={styles.error}>Das sieht nicht wie eine Client-ID aus. Sie endet auf .apps.googleusercontent.com.</Text>}
      <View style={styles.buttons}>
        <PillButton label={clientId && draft.trim() === clientId ? 'Gespeichert' : 'Speichern'} disabled={!valid || draft.trim() === clientId} onPress={() => onClientId(draft.trim())} />
      </View>
      <Text style={styles.small}>
        Die Client-ID ist kein Geheimnis. Orbit fragt damit nur Lese-Zugriff auf deinen Kalender an und speichert den Zugang
        nicht. Solange die App bei Google im Testmodus ist, kann sich nur anmelden, wen du als Testnutzer eingetragen hast.
      </Text>
    </View>
  );
}

function LinkButton({ label, url, canHover }: { label: string; url: string; canHover: boolean }) {
  const styles = getStyles(useColors());
  const [hovered, setHovered] = useState(false);
  const open = () => {
    Linking.openURL(url).catch(() => {});
  };
  return (
    <Pressable
      {...enterActivates(open)}
      onPress={open}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="link"
      aria-label={`${label}, öffnet ${url}`}
      style={({ pressed }) => [styles.link, canHover && hovered && styles.switchHovered, pressed && styles.pressed]}
    >
      <Text style={styles.linkText}>{label} ↗</Text>
    </Pressable>
  );
}

const getStyles = themed((colors) => ({
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
  connect: {
    marginTop: 16,
    gap: 10,
  },
  status: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 20,
    marginTop: 4,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkMuted,
  },
  card: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.sidebarLine,
    gap: 6,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  kind: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.ink,
    overflow: 'hidden',
  },
  kindHabit: {
    backgroundColor: colors.ink,
    color: colors.inverse,
  },
  ki: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accentText,
  },
  when: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.inkMuted,
  },
  title: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
  },
  days: {
    gap: 6,
    marginTop: 2,
  },
  reason: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  cardButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 20,
    rowGap: 6,
    marginTop: 6,
  },
  switch: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: 999,
    cursor: 'pointer',
  },
  switchHovered: {
    backgroundColor: colors.hover,
  },
  switchText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.6,
  },
  ai: {
    marginTop: 8,
    gap: 8,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  clientLabel: {
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.chip,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: 999,
    cursor: 'pointer',
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  events: {
    gap: 14,
  },
  eventDay: {
    gap: 4,
  },
  eventDayLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
  },
  eventTime: {
    width: 64,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  eventTitle: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  stepNumber: {
    width: 22,
    fontFamily: fonts.heavy,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
}));
