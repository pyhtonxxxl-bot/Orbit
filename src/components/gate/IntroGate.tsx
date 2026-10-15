import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCanHover } from '../../lib/useLayout';
import { colors, fonts } from '../../theme';
import { SlideToUnlock } from './SlideToUnlock';

type Layer = {
  source: ImageSourcePropType;
  /** Lage im 16:9-Bild in Prozent: jedes Foto liegt als Ausschnitt über dem vorigen. */
  rect: { left: number; top: number; width: number; height: number };
};

// Von der Statue zum echten Auge: jede Ebene ist näher dran und realistischer.
// Die Ausschnitte sitzen so, dass das Auge jeder Ebene ungefähr über dem Statuen-Auge liegt (bei 57 % / 38 %).
const LAYERS: Layer[] = [
  { source: require('../../../assets/intro/1-statue.jpg'), rect: { left: 0, top: 0, width: 100, height: 100 } },
  { source: require('../../../assets/intro/2-statue-auge.jpg'), rect: { left: 32, top: 2, width: 62, height: 66 } },
  { source: require('../../../assets/intro/3-auge.jpg'), rect: { left: 20, top: 0, width: 72, height: 72 } },
  { source: require('../../../assets/intro/4-iris.jpg'), rect: { left: 4, top: 44, width: 46, height: 52 } },
];

// Wie viele Ebenen pro Schritt zu sehen sind, und wie lange: weiß → aufbauen → wieder abbauen.
const STEPS: { visible: number; ms: number }[] = [
  { visible: 0, ms: 500 },
  { visible: 1, ms: 700 },
  { visible: 2, ms: 420 },
  { visible: 3, ms: 420 },
  { visible: 4, ms: 700 },
  { visible: 3, ms: 300 },
  { visible: 2, ms: 300 },
  { visible: 1, ms: 350 },
];

type Props = {
  /** Wird aufgerufen, sobald entsperrt wurde. Die App liegt dann schon darunter. */
  onUnlock: () => void;
  /** Wird aufgerufen, wenn der Sperrbildschirm ausgeblendet ist. */
  onGone: () => void;
  /** Direkt zum Sperrbildschirm, ohne Collage (z. B. nach „Sperren“ in der Seitenleiste). */
  startLocked?: boolean;
};

/** Start der App: Bild-Collage (Statue → Auge), danach Sperrbildschirm mit Wisch-Leiste bzw. Leertaste. */
export function IntroGate({ onUnlock, onGone, startLocked = false }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const canHover = useCanHover();
  const [step, setStep] = useState(startLocked ? STEPS.length - 1 : 0);
  const [locked, setLocked] = useState(startLocked);
  const fadeIn = useState(() => new Animated.Value(startLocked ? 1 : 0))[0]; // Statue blendet beim ersten Erscheinen weich ein
  const chrome = useState(() => new Animated.Value(0))[0]; // Titel und Leiste des Sperrbildschirms
  const leave = useState(() => new Animated.Value(1))[0]; // gesamtes Overlay beim Entsperren

  // Collage abspielen. Mit „Bewegung reduzieren“ geht es direkt zum Sperrbildschirm.
  useEffect(() => {
    if (startLocked) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          setStep(STEPS.length - 1);
          setLocked(true);
          return;
        }
        let i = 0;
        const next = () => {
          if (cancelled) return;
          i += 1;
          if (i >= STEPS.length) return setLocked(true);
          setStep(i);
          timer = setTimeout(next, STEPS[i].ms);
        };
        timer = setTimeout(next, STEPS[0].ms);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [startLocked]);

  useEffect(() => {
    if (STEPS[step].visible > 0) Animated.timing(fadeIn, { toValue: 1, duration: 280, useNativeDriver: false }).start();
  }, [step, fadeIn]);

  useEffect(() => {
    if (locked) Animated.timing(chrome, { toValue: 1, duration: 450, useNativeDriver: false }).start();
  }, [locked, chrome]);

  // Überspringen: Tippen, Klicken oder eine Taste während der Collage.
  const skip = () => {
    if (locked) return;
    setStep(STEPS.length - 1);
    setLocked(true);
  };
  useEffect(() => {
    if (locked || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = () => skip();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const unlock = () => {
    onUnlock();
    Animated.timing(leave, { toValue: 0, duration: 450, useNativeDriver: false }).start(() => onGone());
  };

  // Bühne im 16:9-Format: am Handy randlos, am PC groß und mittig.
  const phone = width < 700;
  // Oben bleibt Platz für den Titel, unten für die Wisch-Leiste.
  const stageW = phone ? width : Math.min(width - 96, 1100, ((height - 380) * 16) / 9);
  const stageH = (stageW * 9) / 16;
  const visible = STEPS[step].visible;
  const lift = chrome.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View style={[styles.overlay, { opacity: leave }]}>
      <Pressable style={styles.fill} onPress={skip} disabled={locked} accessible={false}>
        <View style={[styles.column, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Animated.View
            style={[styles.top, { width: stageW, opacity: chrome, transform: [{ translateY: lift }] }, phone && styles.topPhone]}
            aria-hidden={!locked}
          >
            <Text style={[styles.title, phone && styles.titlePhone]} role="heading">
              ORBIT
            </Text>
            <Text style={styles.tagline}>Dein privater Manager.</Text>
          </Animated.View>

          <Animated.View style={[styles.stage, { width: stageW, height: stageH, opacity: fadeIn }]}>
            {LAYERS.slice(0, visible).map((layer, i) => (
              <Image
                key={i}
                source={layer.source}
                resizeMode="cover"
                style={[
                  styles.layer,
                  {
                    left: `${layer.rect.left}%`,
                    top: `${layer.rect.top}%`,
                    width: `${layer.rect.width}%`,
                    height: `${layer.rect.height}%`,
                  },
                ]}
                accessibilityIgnoresInvertColors
              />
            ))}
          </Animated.View>

          <Animated.View
            style={[styles.bottom, { opacity: chrome, transform: [{ translateY: lift }], pointerEvents: locked ? 'auto' : 'none' }]}
            aria-hidden={!locked}
          >
            {locked && <SlideToUnlock onUnlock={unlock} holdSpace={canHover} />}
            <Text style={styles.hint}>
              {canHover ? 'Leertaste gedrückt halten' : 'Zum Öffnen nach rechts wischen'}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: colors.paper,
  },
  fill: {
    flex: 1,
    cursor: 'auto',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  // Oben und unten gleich viel Raum, damit das Bild beim Wechsel von Intro zu Sperrbildschirm nicht springt.
  top: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 28,
  },
  topPhone: {
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: 1,
    color: colors.ink,
  },
  titlePhone: {
    fontSize: 44,
    lineHeight: 48,
  },
  tagline: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.inkMuted,
  },
  stage: {
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  layer: {
    position: 'absolute',
  },
  bottom: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.inkFaint,
  },
});
