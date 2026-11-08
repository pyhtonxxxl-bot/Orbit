import { useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, TextInput, View, type TextStyle } from 'react-native';

import { spaceToggles } from '../../lib/web';
import { useColors } from '../../lib/theme';
import { fonts, themed } from '../../theme';
import { Checkbox } from '../Checkbox';

// Bausteine für das Einrichten im Health Zyklus. Gleiche Optik wie die Einstellungen: Punkte, Ringe, Kästchen.

/** Kein Browser-Fokusrahmen in Eingabefeldern (siehe CLAUDE.md). */
const NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

type RowProps = {
  label: string;
  /** Beschriftung über dem Inhalt statt links daneben (für Auswahllisten). */
  stacked?: boolean;
  children: ReactNode;
};

/** Eine Zeile: Name links (oder oben), Inhalt rechts. */
export function FormRow({ label, stacked = false, children }: RowProps) {
  const styles = getStyles(useColors());
  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <Text style={[styles.rowLabel, stacked && styles.rowLabelStacked]}>{label}</Text>
      <View style={stacked ? undefined : styles.rowBody}>{children}</View>
    </View>
  );
}

type Option<T> = { value: T; label: string; hint?: string };

type ChoiceProps<T> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nebeneinander (kurze Wörter) statt untereinander. */
  inline?: boolean;
};

/** Eine Auswahl aus mehreren: gefüllter Punkt = gewählt. */
export function Choice<T extends string | number>({ label, options, value, onChange, inline = false }: ChoiceProps<T>) {
  const styles = getStyles(useColors());
  return (
    <View role="radiogroup" aria-label={label} style={inline ? styles.choicesInline : styles.choices}>
      {options.map((option) => {
        const on = option.value === value;
        const pick = () => onChange(option.value);
        return (
          <Pressable
            key={String(option.value)}
            onPress={pick}
            {...spaceToggles(pick)}
            role="radio"
            aria-checked={on}
            aria-label={option.hint ? `${option.label}, ${option.hint}` : option.label}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <View style={[styles.radio, on && styles.radioOn]} />
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, on && styles.optionLabelOn]}>{option.label}</Text>
              {!!option.hint && !inline && <Text style={styles.optionHint}>{option.hint}</Text>}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

type ToggleProps = {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/** Ja oder nein, mit dem Kästchen aus den Todos. */
export function Toggle({ label, hint, value, onChange }: ToggleProps) {
  const styles = getStyles(useColors());
  const flip = () => onChange(!value);
  return (
    <Pressable
      onPress={flip}
      {...spaceToggles(flip)}
      role="checkbox"
      aria-checked={value}
      aria-label={hint ? `${label}, ${hint}` : label}
      style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
    >
      <View style={styles.toggleBox}>
        <Checkbox checked={value} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, value && styles.optionLabelOn]}>{label}</Text>
        {!!hint && <Text style={styles.optionHint}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

type StepperProps = {
  /** Für Screenreader, z. B. „Mahlzeiten pro Tag“. */
  label: string;
  value: string;
  onMinus?: () => void;
  onPlus?: () => void;
};

/** − Wert + : für kleine Zahlen wie Mahlzeiten pro Tag oder Abstand in Stunden. */
export function Stepper({ label, value, onMinus, onPlus }: StepperProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  return (
    <View style={styles.stepper}>
      <StepButton glyph="−" label={`${label} verringern`} onPress={onMinus} />
      <Text style={styles.stepValue} aria-live="polite" aria-label={`${label}: ${value}`}>
        {value}
      </Text>
      <StepButton glyph="+" label={`${label} erhöhen`} onPress={onPlus} />
    </View>
  );
}

function StepButton({ glyph, label, onPress }: { glyph: string; label: string; onPress?: () => void }) {
  const styles = getStyles(useColors());
  const [hovered, setHovered] = useState(false);
  const disabled = !onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      style={({ pressed }) => [
        styles.stepButton,
        hovered && !disabled && styles.stepButtonHovered,
        disabled && styles.stepButtonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.stepGlyph}>{glyph}</Text>
    </Pressable>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  /** Mit Komma (z. B. Gewicht). */
  decimal?: boolean;
  onChange: (value: number) => void;
};

/** Zahl eintippen. Gültiges zählt sofort, Unsinn oder außerhalb von min bis max springt beim Verlassen zurück. */
export function NumberField({ label, value, unit, min, max, decimal = false, onChange }: NumberFieldProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const show = (v: number) => String(v).replace('.', ',');
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);
  const [last, setLast] = useState(value);
  // Ändert sich der Wert von außen (z. B. gespeicherter Plan geladen), das Feld nachziehen.
  if (value !== last) {
    setLast(value);
    if (!focused) setText(show(value));
  }

  /** Gültige Zahl aus dem Text, sonst nichts. */
  const parse = (raw: string): number | null => {
    const parsed = Number.parseFloat(raw.trim().replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
    return decimal ? Math.round(parsed * 10) / 10 : Math.round(parsed);
  };
  // Gültiges sofort übernehmen: am Handy tippt man oft direkt auf „Speichern“, ohne das Feld zu verlassen.
  const change = (raw: string) => {
    setText(raw);
    const clean = parse(raw);
    if (clean !== null && clean !== value) onChange(clean);
  };
  // Beim Verlassen nur noch die Anzeige aufräumen, Unsinn springt auf den letzten gültigen Wert zurück.
  const commit = () => setText(show(parse(text) ?? value));

  return (
    <View style={styles.numberRow}>
      <TextInput
        value={text}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onSubmitEditing={commit}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputMode={decimal ? 'decimal' : 'numeric'}
        returnKeyType="done"
        selectTextOnFocus
        aria-label={`${label} in ${unit}`}
        style={[styles.number, focused && styles.numberFocused, NO_OUTLINE]}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

/** Freier Text, z. B. welche Medikamente. */
export function TextField({ label, value, placeholder, onChange }: TextFieldProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      placeholderTextColor={colors.inkFaint}
      multiline
      aria-label={label}
      style={[styles.text, focused && styles.numberFocused, NO_OUTLINE]}
    />
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Leiser Knopf (nur Schrift) statt dunkler Pille. */
  quiet?: boolean;
  disabled?: boolean;
};

/** Knopf wie „Hinzufügen“ im Aufgaben-Fenster. */
export function PillButton({ label, onPress, quiet = false, disabled = false }: ButtonProps) {
  const styles = getStyles(useColors());
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      style={({ pressed }) => [
        quiet ? styles.quiet : styles.pill,
        hovered && !disabled && (quiet ? styles.quietHovered : styles.pillHovered),
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={quiet ? styles.quietText : styles.pillText}>{label}</Text>
    </Pressable>
  );
}

type ChipsProps<T> = {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  onChange: (values: T[]) => void;
};

/** Mehrere aus vielen, als kleine Schilder: gefüllt = gewählt (z. B. Muskelgruppen). */
export function Chips<T extends string>({ label, options, values, onChange }: ChipsProps<T>) {
  const styles = getStyles(useColors());
  return (
    <View style={styles.chips} role="group" aria-label={label}>
      {options.map((option) => {
        const on = values.includes(option.value);
        const flip = () => onChange(on ? values.filter((v) => v !== option.value) : [...values, option.value]);
        return (
          <Pressable
            key={option.value}
            onPress={flip}
            {...spaceToggles(flip)}
            role="checkbox"
            aria-checked={on}
            aria-label={option.label}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/** Wochentage an- und abwählen, wie bei den Habits in den Einstellungen. 0 = Montag. */
export function WeekdayPicker({ label, days, onChange }: { label: string; days: number[]; onChange: (days: number[]) => void }) {
  const styles = getStyles(useColors());
  return (
    <View style={styles.weekdays} role="group" aria-label={label}>
      {LETTERS.map((letter, day) => {
        const on = days.includes(day);
        const flip = () => onChange(on ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b));
        return (
          <Pressable
            key={day}
            onPress={flip}
            {...spaceToggles(flip)}
            role="checkbox"
            aria-checked={on}
            aria-label={DAY_NAMES[day]}
            hitSlop={4}
            style={({ pressed }) => [styles.weekday, on && styles.weekdayOn, pressed && styles.pressed]}
          >
            <Text style={[styles.weekdayText, on && styles.weekdayTextOn]}>{letter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = themed((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 48,
  },
  rowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
    paddingTop: 10,
  },
  rowLabel: {
    width: 120,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.inkMuted,
  },
  rowLabelStacked: {
    width: 'auto',
  },
  rowBody: {
    flex: 1,
  },
  choices: {
    gap: 2,
  },
  choicesInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
    paddingVertical: 10,
    cursor: 'pointer',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
    paddingVertical: 9,
    cursor: 'pointer',
  },
  toggleBox: {
    marginTop: -1,
  },
  pressed: {
    opacity: 0.6,
  },
  // Gewählt: voller Punkt, sonst nur ein Ring, wie bei „Darstellung“ in den Einstellungen.
  radio: {
    width: 12,
    height: 12,
    marginTop: 5,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.control,
  },
  radioOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  optionText: {
    flexShrink: 1,
  },
  optionLabel: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  optionLabelOn: {
    fontFamily: fonts.medium,
    color: colors.ink,
  },
  optionHint: {
    marginTop: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colors.inkFaint,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.control,
    cursor: 'pointer',
  },
  stepButtonHovered: {
    backgroundColor: colors.hover,
  },
  stepButtonDisabled: {
    opacity: 0.3,
    cursor: 'auto',
  },
  stepGlyph: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 22,
    marginTop: -2,
    color: colors.ink,
    userSelect: 'none',
  },
  stepValue: {
    minWidth: 78,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.ink,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  number: {
    width: 72,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.chip,
    fontFamily: fonts.medium,
    fontSize: 17,
    textAlign: 'right',
    color: colors.ink,
  },
  numberFocused: {
    backgroundColor: colors.panel,
  },
  unit: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkMuted,
  },
  text: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.chip,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.pill,
    cursor: 'pointer',
  },
  pillHovered: {
    opacity: 0.88,
  },
  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.inverse,
  },
  quiet: {
    alignSelf: 'flex-start',
    marginHorizontal: -10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    cursor: 'pointer',
  },
  quietHovered: {
    backgroundColor: colors.hover,
  },
  quietText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  disabled: {
    opacity: 0.35,
    cursor: 'auto',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.control,
    cursor: 'pointer',
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.inkMuted,
    userSelect: 'none',
  },
  chipTextOn: {
    color: colors.inverse,
  },
  weekdays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Wochentag: dunkel gefüllt = an diesem Tag, nur Ring = nicht.
  weekday: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
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
    fontSize: 13,
    color: colors.inkMuted,
    userSelect: 'none',
  },
  weekdayTextOn: {
    color: colors.inverse,
  },
}));
