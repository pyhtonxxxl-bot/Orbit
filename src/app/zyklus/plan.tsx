import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdviceList } from '../../components/health/AdviceList';
import { Band } from '../../components/health/Band';
import { CycleWheel } from '../../components/health/CycleWheel';
import { Choice, FormRow, NumberField, PillButton, Stepper, TextField, Toggle, WeekdayPicker } from '../../components/health/Form';
import { PageHeader } from '../../components/shell/PageHeader';
import { dateKey } from '../../lib/date';
import {
  ACTIVITY_LEVELS,
  CHRONOTYPES,
  DEFAULT_PROFILE,
  EXPERIENCE,
  GOALS,
  MAX_PLAN_WINDOW,
  MEAL_COUNT,
  MEAL_INTERVAL,
  checkMeals,
  checkTraining,
  formatClock,
  formatDays,
  formatDuration,
  formatNumber,
  mealNames,
  mealShares,
  mealTimes,
  performancePeak,
  personalNotes,
  recoveryFactor,
  recoveryReasons,
  sleepHours,
  suggestMeals,
  suggestTrainingStart,
  targets,
  type MealPlan,
  type Profile,
  type TrainingPlan,
} from '../../lib/health';
import { useShell } from '../../lib/shell';
import { useColors } from '../../lib/theme';
import { useHealth, type Health } from '../../lib/useHealth';
import { useKeyboardInset } from '../../lib/useKeyboardInset';
import { useLayout } from '../../lib/useLayout';
import { fonts, themed } from '../../theme';

type Draft = {
  profile: Profile;
  meals: MealPlan;
  training: TrainingPlan;
  /** Solange nichts von Hand gedreht wurde, folgt der Plan dem Vorschlag. */
  auto: boolean;
};

function fromHealth(h: Health): Draft {
  if (h.profile) return { profile: h.profile, meals: h.meals, training: h.training, auto: false };
  const profile = DEFAULT_PROFILE;
  const days = [0, 2, 4];
  return withSuggestion({ profile, meals: h.meals, training: { ...h.training, days }, auto: true });
}

/** Mahlzeiten und Trainingsbeginn nach dem Vorschlag, die Trainingstage bleiben. */
function withSuggestion(d: Draft): Draft {
  const meals = suggestMeals(d.profile, d.training.days.length);
  return { ...d, meals, training: { ...d.training, start: suggestTrainingStart(d.profile, meals, d.training.duration) } };
}

/** Health Zyklus einrichten: Angaben, das Rad zum Drehen, Gesundheit und die Auswertung. */
export default function CyclePlanScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { wide, gutter } = useLayout();
  const shell = useShell();
  const hasHeader = !!shell && !shell.sidebarDocked;
  const keyboard = useKeyboardInset();
  const { health, loaded, save } = useHealth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragging, setDragging] = useState(false);
  // Einmal aus dem Speicher übernehmen, danach ist es ein Entwurf bis „Speichern“.
  if (loaded && !draft) setDraft(fromHealth(health));
  if (!draft) return <View style={styles.root} />;

  const { profile, meals, training } = draft;
  const days = training.days.length;
  const setProfile = (patch: Partial<Profile>) =>
    setDraft((d) => {
      const next = { ...d!, profile: { ...d!.profile, ...patch } };
      return next.auto ? withSuggestion(next) : next;
    });
  const setMeals = (patch: Partial<MealPlan>) => setDraft((d) => ({ ...d!, auto: false, meals: { ...d!.meals, ...patch } }));
  const setTraining = (patch: Partial<TrainingPlan>, manual = true) =>
    setDraft((d) => {
      const next = { ...d!, auto: d!.auto && !manual, training: { ...d!.training, ...patch } };
      return next.auto ? withSuggestion(next) : next;
    });

  const suggestion = withSuggestion(draft);
  const differs =
    suggestion.meals.first !== meals.first ||
    suggestion.meals.count !== meals.count ||
    suggestion.meals.interval !== meals.interval ||
    suggestion.training.start !== training.start;

  const times = mealTimes(meals);
  const names = mealNames(times);
  const t = targets(profile, days);
  const shares = mealShares(meals.count);
  const factor = recoveryFactor(profile);
  const reasons = recoveryReasons(profile);
  const advice = [...checkMeals(profile, meals), ...(days ? checkTraining(profile, meals, training) : [])];
  const notes = personalNotes(profile);

  const contentWidth = shell?.contentWidth ?? 390;
  const wheelSize = wide
    ? Math.min(380, Math.floor((contentWidth - 2 * gutter - 48) * 0.57))
    : Math.min(360, contentWidth - 2 * gutter);

  const onSave = () => {
    save(profile, meals, training, dateKey(new Date()));
    router.replace('/zyklus');
  };

  return (
    <View style={styles.root}>
      <PageHeader color={colors.days[0]} gutter={gutter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: keyboard }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        scrollEnabled={!dragging}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <Band
          first
          title="DEIN ZYKLUS"
          hint="Erzähl Orbit, wie dein Tag aussieht. Daraus wird dein Plan fürs Essen und Training. Alles bleibt auf deinem Gerät."
          color={colors.days[0]}
          wide={wide}
          gutter={gutter}
          topInset={hasHeader ? 0 : insets.top}
        />

        <Band title="ÜBER DICH" hint="Für den Grundumsatz nach der Mifflin-St-Jeor-Formel." color={colors.days[1]} wide={wide} gutter={gutter}>
          <FormRow label="Körper">
            <Choice
              label="Körper für die Formel"
              inline
              options={[
                { value: 'female', label: 'Weiblich' },
                { value: 'male', label: 'Männlich' },
              ]}
              value={profile.sex}
              onChange={(sex) => setProfile({ sex })}
            />
          </FormRow>
          <FormRow label="Alter">
            <NumberField label="Alter" unit="Jahre" min={12} max={100} value={profile.age} onChange={(age) => setProfile({ age })} />
          </FormRow>
          <FormRow label="Größe">
            <NumberField label="Größe" unit="cm" min={120} max={230} value={profile.height} onChange={(height) => setProfile({ height })} />
          </FormRow>
          <FormRow label="Gewicht">
            <NumberField label="Gewicht" unit="kg" min={30} max={250} decimal value={profile.weight} onChange={(weight) => setProfile({ weight })} />
          </FormRow>
          <FormRow label="Alltag" stacked>
            <Choice
              label="Alltag"
              options={ACTIVITY_LEVELS.map((a, i) => ({ value: i, label: a.label, hint: a.hint }))}
              value={profile.activity}
              onChange={(activity) => setProfile({ activity })}
            />
          </FormRow>
          <FormRow label="Ziel" stacked>
            <Choice label="Ziel" inline options={GOALS} value={profile.goal} onChange={(goal) => setProfile({ goal })} />
          </FormRow>
        </Band>

        <Band title="DEIN TAG" hint="Gewohnheiten und wann du fit bist." color={colors.days[2]} wide={wide} gutter={gutter}>
          <FormRow label="Typ" stacked>
            <Choice label="Typ" options={CHRONOTYPES} value={profile.chronotype} onChange={(chronotype) => setProfile({ chronotype })} />
          </FormRow>
          <FormRow label="Gewohnheiten" stacked>
            <Toggle label="Ich frühstücke gern" hint="Sonst kommt die erste Mahlzeit etwas später" value={profile.breakfast} onChange={(breakfast) => setProfile({ breakfast })} />
            <Toggle label="Ich arbeite im Schichtdienst" value={profile.shiftWork} onChange={(shiftWork) => setProfile({ shiftWork })} />
            <Toggle label="Ich trinke nachmittags Kaffee oder Energy" value={profile.lateCaffeine} onChange={(lateCaffeine) => setProfile({ lateCaffeine })} />
          </FormRow>
          <FormRow label="Training" stacked>
            <View style={styles.gap}>
              <WeekdayPicker label="Trainingstage" days={training.days} onChange={(d) => setTraining({ days: d }, false)} />
              <Text style={styles.small}>{days ? `${days}× pro Woche: ${formatDays(training.days)}` : 'Kein Training geplant'}</Text>
            </View>
          </FormRow>
          {days > 0 && (
            <FormRow label="Erfahrung" stacked>
              <Choice label="Trainingserfahrung" options={EXPERIENCE} value={profile.experience} onChange={(experience) => setProfile({ experience })} />
            </FormRow>
          )}
        </Band>

        <Band
          title="DEIN RAD"
          hint="Dreh an den Punkten: Mond und Sonne für den Schlaf, die Zahlen für die Mahlzeiten (alle drehen mit), Orange fürs Training."
          color={colors.days[3]}
          wide={wide}
          gutter={gutter}
          side={
            wide ? (
              <View style={styles.legendWide}>
                <Legend profile={profile} meals={meals} training={training} />
              </View>
            ) : undefined
          }
        >
          <View style={styles.wheelWrap}>
            <CycleWheel
              size={wheelSize}
              bed={profile.sleep}
              wake={profile.wake}
              meals={times}
              training={days ? training : null}
              onBed={(sleep) => setProfile({ sleep })}
              onWake={(wake) => setProfile({ wake })}
              onMeals={(first) => setMeals({ first })}
              onTraining={days ? (start) => setTraining({ start }) : undefined}
              onDragging={setDragging}
            >
              <Text style={styles.centerBig}>{meals.count} Mahlzeiten</Text>
              <Text style={styles.centerSmall}>alle {formatDuration(meals.interval)}</Text>
            </CycleWheel>
          </View>
          {!wide && <Legend profile={profile} meals={meals} training={training} />}

          <View style={styles.controls}>
            <FormRow label="Mahlzeiten">
              <Stepper
                label="Mahlzeiten pro Tag"
                value={String(meals.count)}
                onMinus={meals.count > MEAL_COUNT.min ? () => setMeals({ count: meals.count - 1 }) : undefined}
                onPlus={
                  meals.count < MEAL_COUNT.max && meals.count * meals.interval <= MAX_PLAN_WINDOW
                    ? () => setMeals({ count: meals.count + 1 })
                    : undefined
                }
              />
            </FormRow>
            <FormRow label="Abstand">
              <Stepper
                label="Abstand zwischen den Mahlzeiten"
                value={formatDuration(meals.interval)}
                onMinus={meals.interval > MEAL_INTERVAL.min ? () => setMeals({ interval: meals.interval - MEAL_INTERVAL.step }) : undefined}
                onPlus={
                  meals.interval < MEAL_INTERVAL.max && (meals.count - 1) * (meals.interval + MEAL_INTERVAL.step) <= MAX_PLAN_WINDOW
                    ? () => setMeals({ interval: meals.interval + MEAL_INTERVAL.step })
                    : undefined
                }
              />
            </FormRow>
            {days > 0 && (
              <FormRow label="Training">
                <Stepper
                  label="Trainingsdauer"
                  value={formatDuration(training.duration)}
                  onMinus={training.duration > 15 ? () => setTraining({ duration: training.duration - 15 }) : undefined}
                  onPlus={training.duration < 180 ? () => setTraining({ duration: training.duration + 15 }) : undefined}
                />
              </FormRow>
            )}
          </View>

          {advice.length > 0 && <AdviceList items={advice} />}
          {differs && (
            <View style={styles.suggest}>
              <Text style={styles.small}>
                Vorschlag aus den Studien: {suggestion.meals.count} Mahlzeiten ab {formatClock(suggestion.meals.first)}, alle{' '}
                {formatDuration(suggestion.meals.interval)}
                {days ? `, Training ab ${formatClock(suggestion.training.start)}` : ''}.
              </Text>
              <PillButton label="Vorschlag übernehmen" quiet onPress={() => setDraft((d) => withSuggestion({ ...d!, auto: true }))} />
            </View>
          )}
        </Band>

        <Band title="GESUNDHEIT" hint="Nur für Hinweise. Nichts davon verlässt dein Gerät." color={colors.days[4]} wide={wide} gutter={gutter}>
          <Toggle label="Ich nehme regelmäßig Medikamente" value={profile.medication} onChange={(medication) => setProfile({ medication })} />
          {profile.medication && (
            <View style={styles.indent}>
              <Toggle
                label="Eins davon gehört zum Essen"
                value={profile.medicationWithFood}
                onChange={(medicationWithFood) => setProfile({ medicationWithFood })}
              />
              <TextField
                label="Welche, und wann"
                placeholder="Welche, und wann? (nur für dich)"
                value={profile.medicationNote}
                onChange={(medicationNote) => setProfile({ medicationNote })}
              />
            </View>
          )}
          <Toggle label="Ich habe Diabetes" value={profile.diabetes} onChange={(diabetes) => setProfile({ diabetes })} />
          {profile.sex === 'female' && (
            <Toggle label="Ich bin schwanger oder stille" value={profile.pregnant} onChange={(pregnant) => setProfile({ pregnant })} />
          )}
          <Toggle
            label="Keine Kalorien zeigen"
            hint="Zum Beispiel, wenn Zählen dir nicht guttut. Dann geht es nur um den Rhythmus."
            value={profile.hideNumbers}
            onChange={(hideNumbers) => setProfile({ hideNumbers })}
          />
          <View style={styles.notes}>
            <TextField
              label="Sonst noch etwas"
              placeholder="Sonst noch etwas? Allergien, Unverträglichkeiten, Vorlieben …"
              value={profile.notes}
              onChange={(notes) => setProfile({ notes })}
            />
          </View>
        </Band>

        <Band
          title="DEINE ANALYSE"
          hint="Berechnet auf deinem Gerät aus Formeln und Studien. Keine KI-Cloud und keine Diagnose."
          color={colors.days[5]}
          wide={wide}
          gutter={gutter}
          grow
        >
          {profile.hideNumbers ? (
            <Text style={styles.body}>Kalorien sind ausgeblendet. Iss die größeren Mahlzeiten eher früh am Tag und die kleinste am Abend.</Text>
          ) : (
            <>
              <Fact
                label="Tagesbedarf"
                value={`${formatNumber(t.energy)} kcal`}
                detail={`Grundumsatz ${formatNumber(t.resting)} kcal × ${String(t.pal).replace('.', ',')} für deinen Alltag${
                  t.energy !== t.maintenance
                    ? `, ${t.energy < t.maintenance ? '−' : '+'}${formatNumber(Math.abs(t.maintenance - t.energy))} kcal fürs Ziel`
                    : ''
                }`}
              />
              <Fact label="Eiweiß" value={`${formatNumber(t.protein)} g`} detail={`${String(t.proteinPerKg).replace('.', ',')} g pro kg Körpergewicht`} />
            </>
          )}
          <View style={styles.meals}>
            {times.map((time, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.mealTime}>{formatClock(time)}</Text>
                <Text style={styles.mealName}>{names[i]}</Text>
                {!profile.hideNumbers && (
                  <Text style={styles.mealAmount}>
                    {formatNumber(Math.round((t.energy * shares[i]) / 10) * 10)} kcal · {Math.round(t.protein * shares[i])} g Eiweiß
                  </Text>
                )}
              </View>
            ))}
          </View>
          {days > 0 && (
            <Fact
              label="Training"
              value={`${formatClock(training.start)}–${formatClock(training.start + training.duration)}`}
              detail={`Dein Leistungshoch liegt um ${formatClock(performancePeak(profile))}. Erholung bei dir: ${
                factor === 1 ? 'durchschnittlich' : `etwa ${String(Math.round(factor * 100) / 100).replace('.', ',')}× so lang`
              }${reasons.length ? ` (${reasons.join(', ')})` : ''}.`}
            />
          )}
          <Fact label="Schlaf" value={`${String(Math.round(sleepHours(profile) * 10) / 10).replace('.', ',')} Std.`} detail={`${formatClock(profile.sleep)} bis ${formatClock(profile.wake)}`} />
          {notes.length > 0 && <AdviceList items={notes} />}
          <View style={styles.saveRow}>
            <PillButton label="Plan speichern" onPress={onSave} />
            {health.profile && <PillButton label="Abbrechen" quiet onPress={() => router.replace('/zyklus')} />}
          </View>
        </Band>
      </ScrollView>
    </View>
  );
}

/** Die Zeiten zum Rad in Worten. */
function Legend({ profile, meals, training }: { profile: Profile; meals: MealPlan; training: TrainingPlan }) {
  const styles = getStyles(useColors());
  const times = mealTimes(meals);
  return (
    <View style={styles.legend}>
      <LegendRow swatch="night" label="Schlaf" value={`${formatClock(profile.sleep)} bis ${formatClock(profile.wake)}`} />
      <LegendRow swatch="meal" label="Essen" value={times.map(formatClock).join(' · ')} />
      {training.days.length > 0 && (
        <LegendRow
          swatch="train"
          label="Training"
          value={`${formatClock(training.start)}–${formatClock(training.start + training.duration)}, ${formatDays(training.days)}`}
        />
      )}
    </View>
  );
}

function LegendRow({ swatch, label, value }: { swatch: 'night' | 'meal' | 'train'; label: string; value: string }) {
  const styles = getStyles(useColors());
  return (
    <View style={styles.legendRow}>
      <View style={[styles.swatch, swatch === 'night' ? styles.swatchNight : swatch === 'meal' ? styles.swatchMeal : styles.swatchTrain]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const styles = getStyles(useColors());
  return (
    <View style={styles.fact}>
      <View style={styles.factHead}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
      {!!detail && <Text style={styles.small}>{detail}</Text>}
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
  gap: {
    gap: 8,
  },
  indent: {
    marginLeft: 34,
    gap: 6,
    marginBottom: 6,
  },
  notes: {
    marginTop: 10,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
  wheelWrap: {
    alignItems: 'center',
  },
  centerBig: {
    fontFamily: fonts.heavy,
    fontSize: 20,
    letterSpacing: 0.3,
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
  legendWide: {
    marginTop: 24,
  },
  legend: {
    gap: 8,
    marginTop: 18,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  swatch: {
    width: 22,
    height: 10,
    borderRadius: 5,
  },
  swatchNight: {
    backgroundColor: colors.wheelNight,
  },
  swatchMeal: {
    backgroundColor: colors.wheelWindow,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  swatchTrain: {
    backgroundColor: colors.accent,
  },
  legendLabel: {
    width: 70,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  legendValue: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.inkMuted,
  },
  controls: {
    marginTop: 18,
  },
  suggest: {
    marginTop: 14,
    gap: 4,
  },
  fact: {
    paddingVertical: 8,
  },
  factHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  factLabel: {
    width: 110,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.inkMuted,
  },
  factValue: {
    fontFamily: fonts.heavy,
    fontSize: 24,
    letterSpacing: 0.3,
    color: colors.ink,
  },
  meals: {
    marginVertical: 8,
    gap: 6,
  },
  mealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 12,
  },
  mealTime: {
    width: 50,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  mealName: {
    minWidth: 110,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
  },
  mealAmount: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.inkMuted,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 24,
  },
}));
