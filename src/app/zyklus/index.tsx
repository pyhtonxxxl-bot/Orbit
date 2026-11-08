import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Checkbox } from '../../components/Checkbox';
import { Icon } from '../../components/Icon';
import { SectionLink } from '../../components/SectionLink';
import { AdviceList } from '../../components/health/AdviceList';
import { Band } from '../../components/health/Band';
import { CycleWheel } from '../../components/health/CycleWheel';
import { Chips, Choice, PillButton } from '../../components/health/Form';
import { RecoveryCurve } from '../../components/health/RecoveryCurve';
import { PageHeader } from '../../components/shell/PageHeader';
import { addDays, dateKey } from '../../lib/date';
import {
  INTENSITIES,
  MUSCLE_GROUPS,
  ON_TIME,
  formatClock,
  formatDays,
  formatDuration,
  formatNumber,
  formatRemaining,
  formatWhen,
  mealNames,
  mealShares,
  mealTimes,
  minutesOf,
  onTime,
  personalNotes,
  recoveryFactor,
  recoveryOf,
  recoveryTimes,
  rhythmScore,
  targets,
  type Intensity,
  type MuscleGroup,
  type Recovery,
} from '../../lib/health';
import { useShell } from '../../lib/shell';
import { useColors } from '../../lib/theme';
import { useHealth } from '../../lib/useHealth';
import { useCanHover, useLayout } from '../../lib/useLayout';
import { useNow } from '../../lib/useNow';
import { fonts, themed } from '../../theme';

const tap = () => Haptics.selectionAsync().catch(() => {});
const HOUR_MS = 3_600_000;

/** Health Zyklus, heute: das Rad mit „jetzt“, Mahlzeiten zum Abhaken und wie erholt jede Muskelgruppe ist. */
export default function CycleScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const canHover = useCanHover();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const now = useNow();
  const { health, loaded, toggleMeal, setMealTime, addSession, removeSession } = useHealth();
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  const [logging, setLogging] = useState(false);

  if (!loaded) return <View style={styles.root} />;
  // Erst die Studien, dann einrichten, dann diese Übersicht.
  if (!health.introSeen) return <Redirect href="/zyklus/studien" />;
  if (!health.profile) return <Redirect href="/zyklus/plan" />;

  const profile = health.profile;
  const { meals, training } = health;
  const todayKey = dateKey(now);
  const nowMin = minutesOf(now);
  const times = mealTimes(meals);
  const names = mealNames(times);
  const shares = mealShares(meals.count);
  const eatenToday = health.eaten[todayKey] ?? {};
  const eaten = times.map((_, i) => !!eatenToday[i]);
  const t = targets(profile, training.days.length);
  const weekday = (now.getDay() + 6) % 7;
  const trainsToday = training.days.includes(weekday);
  const factor = recoveryFactor(profile);
  const nowMs = now.getTime();
  const recovery = MUSCLE_GROUPS.map((g) => ({ ...g, state: recoveryOf(g.id, health.sessions, factor, nowMs) }));
  const last7 = Array.from({ length: 7 }, (_, i) => dateKey(addDays(now, -i)));
  const score = rhythmScore(health.eaten, last7, meals, health.since ?? todayKey, nowMin);
  const notes = personalNotes(profile);

  // Was als Nächstes kommt: die erste offene Mahlzeit, die noch nicht lange vorbei ist.
  const nextIndex = times.findIndex((time, i) => !eaten[i] && nowMin < time + ON_TIME);
  const next =
    nextIndex >= 0
      ? times[nextIndex] > nowMin
        ? `${names[nextIndex]} um ${formatClock(times[nextIndex])}, in ${formatDuration(times[nextIndex] - nowMin)}.`
        : `${names[nextIndex]} ist jetzt dran (${formatClock(times[nextIndex])}).`
      : eaten.every(Boolean)
        ? `Für heute ist alles gegessen. Morgen geht es um ${formatClock(times[0])} weiter.`
        : `Für heute steht keine Mahlzeit mehr an. Morgen geht es um ${formatClock(times[0])} weiter.`;

  const contentWidth = shell?.contentWidth ?? 390;
  const wheelSize = wide
    ? Math.min(380, Math.floor((contentWidth - 2 * gutter - 48) * 0.57))
    : Math.min(360, contentWidth - 2 * gutter);

  const ready = recovery.filter((r) => r.state.phase === 'fenster');
  const resting = recovery.filter((r) => r.state.phase === 'erholung');
  const focus = recovery.find((r) => r.id === selected) ?? ready[0] ?? resting[0] ?? null;
  const focusTimes = focus?.state.session ? recoveryTimes(focus.id, focus.state.session.intensity, factor) : null;
  const recent = [...health.sessions].sort((a, b) => b.at - a.at).slice(0, 5);
  const nextTraining = (() => {
    for (let i = 1; i <= 7; i++) if (training.days.includes((weekday + i) % 7)) return addDays(now, i);
    return null;
  })();

  return (
    <View style={styles.root}>
      <PageHeader color={colors.days[0]} gutter={gutter} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        <Band
          first
          title="HEALTH ZYKLUS"
          hint={next}
          color={colors.days[0]}
          wide={wide}
          gutter={gutter}
          topInset={hasHeader ? 0 : insets.top}
          side={
            <View style={styles.links}>
              <SectionLink label="Plan ändern" canHover={canHover} onPress={() => router.navigate('/zyklus/plan')} />
              <SectionLink label="Warum? Die Studien" canHover={canHover} onPress={() => router.navigate('/zyklus/studien')} />
            </View>
          }
        />

        <Band
          title="HEUTE"
          hint={
            trainsToday
              ? `Training ${formatClock(training.start)}–${formatClock(training.start + training.duration)}.`
              : nextTraining
                ? `Heute kein Training. Nächstes: ${formatWhen(nextTraining.setHours(0, 0, 0, 0) + training.start * 60_000, nowMs)}.`
                : 'Kein Training geplant.'
          }
          color={colors.days[1]}
          wide={wide}
          gutter={gutter}
        >
          <View style={styles.wheelWrap}>
            <CycleWheel
              size={wheelSize}
              bed={profile.sleep}
              wake={profile.wake}
              meals={times}
              eaten={eaten}
              training={trainsToday ? training : null}
              now={nowMin}
            >
              <Text style={styles.centerBig}>{formatClock(nowMin)}</Text>
              <Text style={styles.centerSmall}>
                {eaten.filter(Boolean).length} von {times.length} gegessen
              </Text>
            </CycleWheel>
          </View>
        </Band>

        <Band
          title="ESSEN"
          hint={
            profile.hideNumbers
              ? 'Regelmäßig, zu festen Zeiten. Abhaken, wenn du gegessen hast.'
              : `Heute etwa ${formatNumber(t.energy)} kcal und ${formatNumber(t.protein)} g Eiweiß.`
          }
          color={colors.days[2]}
          wide={wide}
          gutter={gutter}
          side={<Rhythm score={score} />}
        >
          {times.map((time, i) => {
            const entry = eatenToday[i];
            const late = !!entry && !onTime(entry);
            return (
              <View key={i}>
                <Pressable
                  onPress={() => {
                    tap();
                    toggleMeal(todayKey, i, time, nowMin);
                  }}
                  role="checkbox"
                  aria-checked={!!entry}
                  aria-label={`${names[i]} um ${formatClock(time)}${entry ? `, gegessen um ${formatClock(entry.at)}` : ''}`}
                  style={({ pressed }) => [styles.meal, pressed && styles.pressed]}
                >
                  <Checkbox checked={!!entry} due={i === nextIndex && !entry && nowMin >= time - 15} />
                  <View style={styles.mealText}>
                    <Text style={[styles.mealName, !!entry && styles.mealDone]}>
                      {formatClock(time)} {names[i]}
                    </Text>
                    <Text style={styles.mealMeta}>
                      {entry
                        ? `Gegessen um ${formatClock(entry.at)}${late ? '' : ', pünktlich'}`
                        : profile.hideNumbers
                          ? shares[i] > 1 / times.length
                            ? 'eher größer'
                            : 'eher kleiner'
                          : `etwa ${formatNumber(Math.round((t.energy * shares[i]) / 10) * 10)} kcal · ${Math.round(t.protein * shares[i])} g Eiweiß`}
                    </Text>
                  </View>
                </Pressable>
                {late && (
                  <View style={styles.fix}>
                    <PillButton label={`War doch um ${formatClock(time)}`} quiet onPress={() => setMealTime(todayKey, i, time)} />
                  </View>
                )}
              </View>
            );
          })}
          <Text style={styles.soon}>Mit „Ernährung“ (kommt bald) zählt hier, was du wirklich gegessen hast.</Text>
        </Band>

        <Band
          title="TRAINING"
          hint={
            ready.length
              ? `Im besten Fenster: ${ready.map((r) => r.label).join(', ')}.`
              : resting.length
                ? `Noch in Erholung: ${resting.map((r) => r.label).join(', ')}.`
                : 'Trag dein Training ein, dann zeigt Orbit, wann jede Muskelgruppe wieder dran ist.'
          }
          color={colors.days[3]}
          wide={wide}
          gutter={gutter}
          side={
            <View style={styles.sideNote}>
              <Text style={styles.small}>
                Plan: {training.days.length ? `${formatDays(training.days)} um ${formatClock(training.start)}` : 'kein Training'}.
              </Text>
            </View>
          }
        >
          {recovery.map((r) => (
            <GroupRow
              key={r.id}
              label={r.label}
              state={r.state}
              now={nowMs}
              selected={focus?.id === r.id}
              canHover={canHover}
              onPress={() => setSelected(r.id)}
            />
          ))}
          {focus && focusTimes && focus.state.session && (
            <View style={styles.curve}>
              <Text style={styles.curveTitle}>{focus.label}</Text>
              <RecoveryCurve recover={focusTimes.recover} window={focusTimes.window} now={(nowMs - focus.state.session.at) / HOUR_MS} />
            </View>
          )}

          {logging ? (
            <LogForm
              onCancel={() => setLogging(false)}
              onSave={(groups, intensity, hoursAgo) => {
                addSession({ at: nowMs - hoursAgo * HOUR_MS, groups, intensity });
                setSelected(groups[0]);
                setLogging(false);
              }}
            />
          ) : (
            <Pressable
              onPress={() => setLogging(true)}
              role="button"
              aria-label="Training eintragen"
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
            >
              <Icon name="plus" size={18} color={colors.inkMuted} />
              <Text style={styles.addText}>Training eintragen</Text>
            </Pressable>
          )}

          {recent.length > 0 && (
            <View style={styles.recent}>
              {recent.map((s) => (
                <View key={s.id} style={styles.recentRow}>
                  <Text style={styles.recentText}>
                    {formatWhen(s.at, nowMs)} · {s.groups.map((g) => MUSCLE_GROUPS.find((m) => m.id === g)?.label).join(', ')} ·{' '}
                    {INTENSITIES.find((i) => i.value === s.intensity)?.label}
                  </Text>
                  <Pressable
                    onPress={() => removeSession(s.id)}
                    role="button"
                    aria-label="Eintrag löschen"
                    hitSlop={8}
                    style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                  >
                    <Icon name="close" size={15} color={colors.control} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Band>

        <Band title="HINWEISE" color={colors.days[4]} wide={wide} gutter={gutter} grow>
          {notes.length > 0 && <AdviceList items={notes} />}
          <Text style={[styles.small, styles.disclaimer]}>
            Orbit rechnet mit Durchschnittswerten aus Studien. Das ist eine Orientierung, keine Diagnose und kein Ersatz für
            ärztlichen Rat. Wenn sich etwas nicht gut anfühlt, hör auf deinen Körper.
          </Text>
        </Band>
      </ScrollView>
    </View>
  );
}

/** Pünktlichkeit der letzten 7 Tage als dünner Balken. */
function Rhythm({ score }: { score: { planned: number; eaten: number; punctual: number } }) {
  const styles = getStyles(useColors());
  if (!score.planned) return <Text style={[styles.small, styles.rhythm]}>Dein Rhythmus erscheint hier, sobald die erste Mahlzeit vorbei ist.</Text>;
  const share = score.punctual / score.planned;
  return (
    <View style={styles.rhythm}>
      <Text style={styles.rhythmValue}>{Math.round(share * 100)} % im Takt</Text>
      <View style={styles.track} aria-hidden>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
      </View>
      <Text style={styles.small}>
        {score.punctual} von {score.planned} Mahlzeiten in den letzten 7 Tagen pünktlich (±{ON_TIME} Min.).
      </Text>
    </View>
  );
}

type GroupRowProps = {
  label: string;
  state: Recovery;
  now: number;
  selected: boolean;
  canHover: boolean;
  onPress: () => void;
};

/** Eine Muskelgruppe: Punkt (orange = jetzt ideal, Ring = noch erholen) und wie lange noch. */
function GroupRow({ label, state, now, selected, canHover, onPress }: GroupRowProps) {
  const styles = getStyles(useColors());
  const [hovered, setHovered] = useState(false);
  const status =
    state.phase === 'frei'
      ? 'Noch nicht eingetragen'
      : state.phase === 'erholung'
        ? `Erholt sich, noch ${formatRemaining(state.recoveredAt! - now)}`
        : state.phase === 'fenster'
          ? `Jetzt ideal, bis ${formatWhen(state.windowEnd!, now)}`
          : 'Bereit';
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={!state.session}
      role="button"
      aria-label={`${label}: ${status}`}
      aria-selected={selected}
      style={({ pressed }) => [
        styles.group,
        canHover && hovered && !!state.session && styles.groupHovered,
        selected && styles.groupSelected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.groupDot,
          state.phase === 'fenster' && styles.groupDotReady,
          state.phase === 'erholung' && styles.groupDotRest,
          (state.phase === 'bereit' || state.phase === 'frei') && styles.groupDotFree,
        ]}
      />
      <Text style={styles.groupLabel}>{label}</Text>
      <Text style={[styles.groupStatus, state.phase === 'fenster' && styles.groupStatusReady]}>{status}</Text>
    </Pressable>
  );
}

type LogFormProps = {
  onCancel: () => void;
  onSave: (groups: MuscleGroup[], intensity: Intensity, hoursAgo: number) => void;
};

/** Training eintragen: welche Muskeln, wie hart, wann. */
function LogForm({ onCancel, onSave }: LogFormProps) {
  const styles = getStyles(useColors());
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [intensity, setIntensity] = useState<Intensity>(2);
  const [ago, setAgo] = useState(0);
  return (
    <View style={styles.form}>
      <Text style={styles.formLabel}>Was hast du trainiert?</Text>
      <Chips label="Muskelgruppen" options={MUSCLE_GROUPS.map((g) => ({ value: g.id, label: g.label }))} values={groups} onChange={setGroups} />
      <Text style={styles.formLabel}>Wie hart?</Text>
      <Choice label="Wie hart" options={INTENSITIES} value={intensity} onChange={setIntensity} />
      <Text style={styles.formLabel}>Wann?</Text>
      <Choice
        label="Wann"
        inline
        options={[
          { value: 0, label: 'Gerade eben' },
          { value: 3, label: 'Vor 3 Std.' },
          { value: 24, label: 'Gestern' },
        ]}
        value={ago}
        onChange={setAgo}
      />
      <View style={styles.formButtons}>
        <PillButton label="Eintragen" disabled={!groups.length} onPress={() => onSave(groups, intensity, ago)} />
        <PillButton label="Abbrechen" quiet onPress={onCancel} />
      </View>
    </View>
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
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 28,
    marginTop: 14,
  },
  wheelWrap: {
    alignItems: 'center',
  },
  centerBig: {
    fontFamily: fonts.heavy,
    fontSize: 30,
    letterSpacing: 0.5,
    color: colors.ink,
    textAlign: 'center',
  },
  centerSmall: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  meal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 8,
    cursor: 'pointer',
  },
  pressed: {
    opacity: 0.6,
  },
  mealText: {
    flex: 1,
  },
  mealName: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  mealDone: {
    color: colors.done,
  },
  mealMeta: {
    marginTop: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  fix: {
    marginLeft: 36,
    marginTop: -4,
  },
  soon: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkFaint,
  },
  rhythm: {
    marginTop: 18,
    gap: 6,
  },
  rhythmValue: {
    fontFamily: fonts.heavy,
    fontSize: 22,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.wheelTrack,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  sideNote: {
    marginTop: 12,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  groupHovered: {
    backgroundColor: colors.hover,
  },
  groupSelected: {
    backgroundColor: colors.active,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupDotReady: {
    backgroundColor: colors.accent,
  },
  groupDotRest: {
    borderWidth: 1.5,
    borderColor: colors.control,
  },
  groupDotFree: {
    backgroundColor: colors.ink,
  },
  groupLabel: {
    width: 130,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
  },
  groupStatus: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.inkMuted,
  },
  groupStatusReady: {
    fontFamily: fonts.medium,
    color: colors.ink,
  },
  curve: {
    marginTop: 16,
    marginBottom: 4,
  },
  curveTitle: {
    marginBottom: 4,
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    marginTop: 10,
    cursor: 'pointer',
  },
  addText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.inkMuted,
  },
  form: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.chip,
    gap: 8,
  },
  formLabel: {
    marginTop: 4,
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  formButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 8,
  },
  recent: {
    marginTop: 12,
    gap: 2,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
  },
  recentText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.inkMuted,
  },
  remove: {
    padding: 6,
    cursor: 'pointer',
  },
  disclaimer: {
    marginTop: 14,
  },
}));
