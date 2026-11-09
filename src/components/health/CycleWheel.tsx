import * as Haptics from 'expo-haptics';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { DAY, formatClock, mod, snap, span } from '../../lib/health';
import { useColors } from '../../lib/theme';
import { fonts, themed, type Palette } from '../../theme';

/** Tastfläche der Griffe: groß genug für den Daumen, auch wenn der Punkt kleiner ist. */
const HIT = 44;
const STEP = 15;

// Nur im Browser (React Native kennt diese Stile nicht): Ziehen an einem Griff scrollt die Seite nicht (der Rest des
// Rads aber schon), die Hand zeigt, dass man greifen kann, und statt des Fokusrahmens zeigt ein eigener Ring den Fokus.
const isWeb = Platform.OS === 'web';
const WEB_WHEEL = (isWeb ? { userSelect: 'none' } : {}) as ViewStyle;
const WEB_HANDLE = (isWeb ? { cursor: 'grab', outlineStyle: 'none', touchAction: 'none' } : {}) as ViewStyle;

type Props = {
  size: number;
  /** Schlafen und Aufstehen (Minuten seit Mitternacht). */
  bed: number;
  wake: number;
  /** Uhrzeiten der Mahlzeiten. */
  meals: number[];
  /** Pro Mahlzeit: schon gegessen (Übersicht). */
  eaten?: boolean[];
  training?: { start: number; duration: number } | null;
  /** Zeiger für „jetzt“ (Übersicht). */
  now?: number;
  /** Griffe zum Drehen zeigen (Einrichten). */
  onBed?: (minutes: number) => void;
  onWake?: (minutes: number) => void;
  /** Eine Mahlzeit wurde gedreht: alle wandern mit, `first` ist die neue erste Mahlzeit. */
  onMeals?: (first: number) => void;
  onTraining?: (start: number) => void;
  /** Während des Ziehens soll die Seite nicht scrollen. */
  onDragging?: (active: boolean) => void;
  /** Was in der Mitte steht. */
  children?: ReactNode;
};

/** Winkel im Bogenmaß, 0 oben (Mitternacht), im Uhrzeigersinn. */
const angleOf = (minutes: number) => (mod(minutes) / DAY) * Math.PI * 2;
const pointAt = (c: number, r: number, minutes: number) => {
  const a = angleOf(minutes);
  return { x: c + r * Math.sin(a), y: c - r * Math.cos(a) };
};

/** SVG-Bogen von `start` bis `end` im Uhrzeigersinn. */
function arc(c: number, r: number, start: number, end: number): string {
  const sweep = span(start, end);
  if (sweep === 0) return '';
  const p1 = pointAt(c, r, start);
  const p2 = pointAt(c, r, start + Math.min(sweep, DAY - 1));
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${sweep > DAY / 2 ? 1 : 0} 1 ${p2.x} ${p2.y}`;
}

/**
 * Das Tagesrad: 24 Stunden im Kreis, Mitternacht oben. Außen der Schlaf, in der Mitte die Mahlzeiten mit dem
 * Essfenster, innen das Training (orange). Zum Einrichten lassen sich die Punkte drehen (Finger, Maus, Pfeiltasten).
 */
export function CycleWheel({
  size,
  bed,
  wake,
  meals,
  eaten,
  training,
  now,
  onBed,
  onWake,
  onMeals,
  onTraining,
  onDragging,
  children,
}: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const c = size / 2;
  const ring = Math.max(12, Math.round(size * 0.042));
  const rLabel = c - 11;
  const rSleep = c - 30 - ring / 2;
  const rMeal = rSleep - ring - 12;
  const rTrain = rMeal - ring - 12;
  const inner = rTrain - ring / 2 - 10;
  const editable = !!(onBed || onWake || onMeals || onTraining);

  const first = meals[0] ?? 0;
  const last = meals[meals.length - 1] ?? 0;
  const description = [
    `Schlaf ${formatClock(bed)} bis ${formatClock(wake)}`,
    meals.length ? `Mahlzeiten um ${meals.map(formatClock).join(', ')}` : '',
    training ? `Training ${formatClock(training.start)} bis ${formatClock(training.start + training.duration)}` : '',
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <View
      style={[styles.root, { width: size, height: size }, editable && WEB_WHEEL]}
      // Die Übersicht ist ein Bild mit Beschreibung, beim Einrichten sind die Griffe einzeln bedienbar.
      {...(editable ? {} : { role: 'img' as const, 'aria-label': `Tagesrad. ${description}.` })}
    >
      <Svg width={size} height={size} style={styles.svg} pointerEvents="none">
        {/* Stunden-Striche, alle 6 Stunden länger */}
        {Array.from({ length: 24 }, (_, h) => {
          const long = h % 6 === 0;
          const a = pointAt(c, c - 22, h * 60);
          const b = pointAt(c, c - (long ? 30 : 26), h * 60);
          return (
            <Line
              key={h}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={long ? colors.inkMuted : colors.inkFaint}
              strokeWidth={long ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Spuren der drei Ringe */}
        {[rSleep, rMeal, rTrain].map((r) => (
          <Circle key={r} cx={c} cy={c} r={r} stroke={colors.wheelTrack} strokeWidth={ring} fill="none" />
        ))}

        {/* Schlaf */}
        <Path d={arc(c, rSleep, bed, wake)} stroke={colors.wheelNight} strokeWidth={ring} strokeLinecap="round" fill="none" />

        {/* Essfenster: von der ersten bis zur letzten Mahlzeit */}
        {meals.length > 1 && (
          <Path d={arc(c, rMeal, first, last)} stroke={colors.wheelWindow} strokeWidth={ring} strokeLinecap="round" fill="none" />
        )}

        {/* Training */}
        {training && training.duration > 0 && (
          <Path
            d={arc(c, rTrain, training.start, training.start + training.duration)}
            stroke={colors.accent}
            strokeWidth={ring}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Jetzt: dünner Zeiger über alle Ringe */}
        {now !== undefined && (
          <>
            <Line
              x1={pointAt(c, inner + 4, now).x}
              y1={pointAt(c, inner + 4, now).y}
              x2={pointAt(c, c - 20, now).x}
              y2={pointAt(c, c - 20, now).y}
              stroke={colors.ink}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <Circle cx={pointAt(c, c - 20, now).x} cy={pointAt(c, c - 20, now).y} r={3.5} fill={colors.ink} />
          </>
        )}
      </Svg>

      {/* Uhrzeiten außen, alle 3 Stunden */}
      {Array.from({ length: 8 }, (_, i) => {
        const p = pointAt(c, rLabel, i * 180);
        return (
          <Text
            key={i}
            style={[styles.hour, i % 2 === 0 && styles.hourMain, { left: p.x - 12, top: p.y - 8 }]}
            aria-hidden
            maxFontSizeMultiplier={1.2}
          >
            {i * 3}
          </Text>
        );
      })}

      {/* Mitte */}
      <View
        style={[styles.center, { left: c - inner, top: c - inner, width: inner * 2, height: inner * 2, borderRadius: inner }]}
        pointerEvents="box-none"
      >
        {children}
      </View>

      {/* Punkte: Mahlzeiten (gegessen = gefüllt), Schlaf-Griffe, Trainingsbeginn */}
      {meals.map((t, i) => {
        const p = pointAt(c, rMeal, t);
        const done = eaten?.[i] ?? !!onMeals;
        const dot = (
          <View style={[styles.mealDot, { width: ring + 8, height: ring + 8, borderRadius: (ring + 8) / 2 }, done && styles.mealDotDone]}>
            <Text style={[styles.mealNumber, done && styles.mealNumberDone]} maxFontSizeMultiplier={1}>
              {i + 1}
            </Text>
          </View>
        );
        if (!onMeals) {
          return (
            <View key={i} style={[styles.marker, { left: p.x - HIT / 2, top: p.y - HIT / 2 }]} pointerEvents="none">
              {dot}
            </View>
          );
        }
        return (
          <Handle
            key={i}
            c={c}
            r={rMeal}
            value={t}
            label={`Mahlzeit ${i + 1}`}
            hint="Dreht alle Mahlzeiten mit"
            onChange={(m) => onMeals(mod(m - (t - first)))}
            onDragging={onDragging}
          >
            {dot}
          </Handle>
        );
      })}

      {onBed && (
        <Handle c={c} r={rSleep} value={bed} label="Schlafengehen" onChange={onBed} onDragging={onDragging}>
          <View style={[styles.sleepDot, { width: ring + 8, height: ring + 8, borderRadius: (ring + 8) / 2 }]}>
            <Moon color={colors.ink} />
          </View>
        </Handle>
      )}
      {onWake && (
        <Handle c={c} r={rSleep} value={wake} label="Aufstehen" onChange={onWake} onDragging={onDragging}>
          <View style={[styles.sleepDot, { width: ring + 8, height: ring + 8, borderRadius: (ring + 8) / 2 }]}>
            <Sun color={colors.ink} />
          </View>
        </Handle>
      )}
      {training && onTraining && (
        <Handle c={c} r={rTrain} value={training.start} label="Trainingsbeginn" onChange={onTraining} onDragging={onDragging}>
          <View style={[styles.trainDot, { width: ring + 8, height: ring + 8, borderRadius: (ring + 8) / 2 }]} />
        </Handle>
      )}
    </View>
  );
}

type HandleProps = {
  /** Mitte und Radius des Rings, auf dem der Griff sitzt. */
  c: number;
  r: number;
  value: number;
  label: string;
  hint?: string;
  onChange: (minutes: number) => void;
  onDragging?: (active: boolean) => void;
  children: ReactNode;
};

/**
 * Ein Griff auf dem Rad: ziehen dreht ihn um die Mitte, in Viertelstunden. Am PC mit den Pfeiltasten
 * (Umschalt: ganze Stunden), am Handy auch über die Bedienungshilfen (größer/kleiner).
 */
function Handle({ c, r, value, label, hint, onChange, onDragging, children }: HandleProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const p = pointAt(c, r, value);
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Mitte des Rads auf dem Bildschirm und der zuletzt gemeldete Wert, solange gezogen wird.
  const center = useRef({ x: 0, y: 0 });
  const lastValue = useRef(value);

  const end = () => {
    setActive(false);
    onDragging?.(false);
  };

  const drag = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      // Wo liegt die Mitte des Rads auf dem Bildschirm? Aus der Position des Griffs und der Stelle,
      // an der er angefasst wurde. So stimmt es auch, wenn die Seite gescrollt ist.
      const { pageX, pageY, locationX, locationY } = e.nativeEvent;
      center.current = { x: pageX - (p.x - c - HIT / 2 + locationX), y: pageY - (p.y - c - HIT / 2 + locationY) };
      lastValue.current = value;
      setActive(true);
      onDragging?.(true);
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const dx = e.nativeEvent.pageX - center.current.x;
      const dy = e.nativeEvent.pageY - center.current.y;
      if (dx * dx + dy * dy < 16) return;
      const minutes = snap((Math.atan2(dx, -dy) / (Math.PI * 2)) * DAY, STEP);
      if (minutes === lastValue.current) return;
      lastValue.current = minutes;
      if (!isWeb) Haptics.selectionAsync().catch(() => {});
      onChange(minutes);
    },
    onResponderRelease: end,
    onResponderTerminate: end,
  };

  const step = (delta: number) => onChange(snap(value + delta, STEP));

  // Eine View statt Pressable: Pressable würde die Zieh-Gesten mit seinen eigenen überschreiben.
  return (
    <View
      {...drag}
      // Im Browser: Pfeiltasten, wenn der Griff den Fokus hat.
      {...(isWeb
        ? {
            onKeyDown: (e: { key: string; shiftKey?: boolean; preventDefault(): void }) => {
              const big = e.shiftKey ? 60 : STEP;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(big);
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-big);
              else if (e.key === 'PageUp') step(60);
              else if (e.key === 'PageDown') step(-60);
              else return;
              e.preventDefault();
            },
          }
        : {})}
      focusable
      role="slider"
      aria-label={hint ? `${label}. ${hint}` : label}
      aria-valuemin={0}
      aria-valuemax={DAY - STEP}
      aria-valuenow={value}
      aria-valuetext={formatClock(value)}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? STEP : -STEP)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      pointerEvents="box-only"
      style={[
        styles.handle,
        WEB_HANDLE,
        { left: p.x - HIT / 2, top: p.y - HIT / 2 },
        (active || hovered) && styles.handleActive,
        focused && styles.handleFocused,
      ]}
    >
      {children}
    </View>
  );
}

/** Mond und Sonne als kleine Linien-Glyphen auf den Schlaf-Griffen. */
function Moon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke={color} strokeWidth={2.4} strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function Sun({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4.5} stroke={color} strokeWidth={2.4} fill="none" />
      <Path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const getStyles = themed((colors: Palette) => ({
  root: {
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  hour: {
    position: 'absolute',
    width: 24,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.inkFaint,
    userSelect: 'none',
  },
  hourMain: {
    fontFamily: fonts.semibold,
    color: colors.inkMuted,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    position: 'absolute',
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HIT / 2,
  },
  handleActive: {
    backgroundColor: colors.hover,
  },
  handleFocused: {
    borderWidth: 2,
    borderColor: colors.focus,
  },
  // Offene Mahlzeit: Ring, gegessen (oder beim Einrichten): gefüllt.
  mealDot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.panel,
  },
  mealDotDone: {
    backgroundColor: colors.ink,
  },
  mealNumber: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
    color: colors.ink,
    userSelect: 'none',
  },
  mealNumberDone: {
    color: colors.inverse,
  },
  sleepDot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  trainDot: {
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.accent,
  },
}));
