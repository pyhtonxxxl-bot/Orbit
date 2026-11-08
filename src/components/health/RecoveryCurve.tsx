import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { curveAt } from '../../lib/health';
import { useColors } from '../../lib/theme';
import { fonts, themed } from '../../theme';

type Props = {
  /** Stunden bis zur Erholung und Länge des Fensters darüber. */
  recover: number;
  window: number;
  /** Stunden seit dem Training (Strich „jetzt“), oder nichts für die allgemeine Darstellung. */
  now?: number;
  height?: number;
};

/**
 * Die Kurve der Superkompensation als Modell: nach dem Training erst unter dem alten Niveau (Ermüdung),
 * dann darüber (ein gutes Fenster für das nächste Training, orange hinterlegt), danach zurück.
 */
export function RecoveryCurve({ recover, window, now, height = 120 }: Props) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [width, setWidth] = useState(0);
  const total = recover + window + Math.max(12, window * 0.5);
  const top = 12;
  const plot = height - 34;
  const base = top + plot * 0.42;
  const amp = plot * 0.55;
  const x = (t: number) => 8 + ((width - 16) * t) / total;
  const y = (v: number) => base - (v < 0 ? v * amp : v * (amp / 0.6) * 0.75);

  let d = '';
  if (width > 0) {
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = (total * i) / steps;
      d += `${i === 0 ? 'M' : 'L'} ${x(t).toFixed(1)} ${y(curveAt(t, recover, window)).toFixed(1)} `;
    }
  }
  const shownNow = now !== undefined ? Math.min(total, Math.max(0, now)) : undefined;
  const label = (t: number) => Math.max(0, Math.min(width - 90, x(t) - 45));

  return (
    <View
      style={[styles.root, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      role="img"
      aria-label={`Erholungskurve als Richtwert: etwa ${Math.round(recover)} Stunden erholen, danach etwa ${Math.round(window)} Stunden ein gutes Fenster für das nächste Training.`}
    >
      {width > 0 && (
        <>
          <Svg width={width} height={height} pointerEvents="none">
            <Rect x={x(recover)} y={top - 6} width={x(recover + window) - x(recover)} height={plot + 6} fill={colors.accentSoft} rx={6} />
            <Line x1={x(0)} y1={base} x2={x(total)} y2={base} stroke={colors.inkFaint} strokeWidth={1} strokeDasharray="4 4" />
            <Path d={d} stroke={colors.ink} strokeWidth={2} fill="none" strokeLinejoin="round" />
            <Circle cx={x(0)} cy={base} r={4} fill={colors.ink} />
            {shownNow !== undefined && (
              <>
                <Line x1={x(shownNow)} y1={top - 6} x2={x(shownNow)} y2={top + plot} stroke={colors.accent} strokeWidth={2} />
                <Circle cx={x(shownNow)} cy={y(curveAt(shownNow, recover, window))} r={4.5} fill={colors.accent} />
              </>
            )}
          </Svg>
          <Text style={[styles.label, { left: label(recover / 2), top: top + plot + 6 }]} numberOfLines={1}>
            Erholen
          </Text>
          <Text style={[styles.label, styles.labelAccent, { left: label(recover + window / 2), top: top + plot + 6 }]} numberOfLines={1}>
            Gutes Fenster
          </Text>
          <Text style={[styles.tag, { left: 0, top: base - 20 }]}>Training</Text>
        </>
      )}
    </View>
  );
}

const getStyles = themed((colors) => ({
  root: {
    width: '100%',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    width: 90,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.inkMuted,
  },
  // Auf den grauen Bändern reicht Orange als kleine Schrift nicht für guten Kontrast; das Feld darüber ist ja orange.
  labelAccent: {
    color: colors.ink,
  },
  tag: {
    position: 'absolute',
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.inkFaint,
  },
}));
