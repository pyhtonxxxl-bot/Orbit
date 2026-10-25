import { Fragment, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { parseHours, type Occurrence } from '../lib/useTasks';
import { useColors } from '../lib/theme';
import { fonts, themed } from '../theme';
import { Icon } from './Icon';
import { TaskItem } from './TaskItem';

const QUICK_HOURS = [0.5, 1, 2, 3];

type Props = {
  /** Wochentag, für „Aufgabe für Montag hinzufügen“. */
  label: string;
  items: Occurrence[];
  todayKey: string;
  canHover: boolean;
  /** Offene Aufgabe im Fenster, als `id@dateKey`. */
  selected?: string;
  onToggle: (item: Occurrence) => void;
  onOpen: (item: Occurrence) => void;
  onHours: (item: Occurrence, hours: number | undefined) => void;
  onAdd: () => void;
};

/** Die Aufgaben eines Tages. Nach dem Abhaken fragt eine leise Zeile, wie viele Stunden es waren. */
export function TaskList({ label, items, todayKey, canHover, selected, onToggle, onOpen, onHours, onAdd }: Props) {
  // Bei welcher Aufgabe gerade nach Stunden gefragt wird (immer nur eine).
  const [asking, setAsking] = useState<string | null>(null);

  return (
    <>
      {items.map((item) => {
        const key = `${item.task.id}@${item.day}`;
        return (
          <Fragment key={key}>
            <TaskItem
              item={item}
              todayKey={todayKey}
              canHover={canHover}
              selected={key === selected}
              onToggle={() => {
                // Gerade abgehakt: nach den Stunden fragen. Wieder offen: Frage weg.
                setAsking(item.done ? null : key);
                onToggle(item);
              }}
              onOpen={() => onOpen(item)}
            />
            {asking === key && item.done && (
              <HoursPrompt
                title={item.task.title}
                onPick={(hours) => {
                  onHours(item, hours);
                  setAsking(null);
                }}
                onSkip={() => setAsking(null)}
              />
            )}
          </Fragment>
        );
      })}
      <AddRow label={label} alone={items.length === 0} onPress={onAdd} />
    </>
  );
}

type HoursPromptProps = {
  title: string;
  onPick: (hours: number) => void;
  onSkip: () => void;
};

/** „Stunden?“ mit ein paar schnellen Werten und einem Feld für alles andere. Überspringen geht immer. */
function HoursPrompt({ title, onPick, onSkip }: HoursPromptProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [text, setText] = useState('');
  const submit = () => {
    const hours = parseHours(text);
    if (hours) onPick(hours);
  };
  return (
    <View style={styles.prompt} role="group" aria-label={`Wie viele Stunden für „${title}“?`}>
      <Text style={styles.promptLabel}>Stunden?</Text>
      {QUICK_HOURS.map((hours) => (
        <Pressable
          key={hours}
          onPress={() => onPick(hours)}
          role="button"
          aria-label={`${String(hours).replace('.', ',')} Stunden`}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Text style={styles.chipText}>{hours === 0.5 ? '½' : hours}</Text>
        </Pressable>
      ))}
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        onKeyPress={Platform.OS === 'web' ? (e) => e.nativeEvent.key === 'Escape' && onSkip() : undefined}
        placeholder="…"
        placeholderTextColor={colors.inkFaint}
        keyboardType="decimal-pad"
        inputMode="decimal"
        returnKeyType="done"
        aria-label="Andere Stundenzahl"
        style={styles.chipInput}
      />
      <Pressable
        onPress={onSkip}
        role="button"
        aria-label="Ohne Stunden"
        hitSlop={8}
        style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
      >
        <Icon name="close" size={14} color={colors.control} />
      </Pressable>
    </View>
  );
}

type AddRowProps = {
  label: string;
  /** Erste Zeile ohne Aufgaben darüber: sitzt auf der Grundlinie des Tagesnamens. */
  alone: boolean;
  onPress: () => void;
};

/** Leise Zeile „+ Aufgabe hinzufügen“ am Ende eines Tages. Öffnet das Fenster für eine neue Aufgabe. */
function AddRow({ label, alone, onPress }: AddRowProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      role="button"
      aria-label={`Aufgabe für ${label} hinzufügen`}
      style={({ pressed }) => [styles.add, alone && styles.addAlone, pressed && styles.pressed]}
    >
      <Icon name="plus" size={18} color={hovered ? colors.ink : colors.inkFaint} strokeWidth={1.75} />
      <Text style={[styles.addText, hovered && styles.addTextStrong]}>Aufgabe hinzufügen</Text>
    </Pressable>
  );
}

const getStyles = themed((colors) => ({
  // Eingerückt unter die Beschreibung, damit klar ist, zu welcher Aufgabe die Frage gehört.
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 36,
    marginBottom: 6,
  },
  promptLabel: {
    marginRight: 4,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.inkMuted,
  },
  chip: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.chip,
    cursor: 'pointer',
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  chipInput: {
    width: 44,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.chip,
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'center',
    color: colors.ink,
    outlineWidth: 0,
  },
  skip: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    cursor: 'pointer',
  },
  pressed: {
    opacity: 0.6,
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
  addText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.inkFaint,
  },
  addTextStrong: {
    color: colors.ink,
  },
}));
