import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
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

type Rect = { left: number; top: number; width: number; height: number };

// Von der Statue zum echten Auge: jede Ebene ist näher dran und realistischer.
const SOURCES: ImageSourcePropType[] = [
  require('../../../assets/intro/1-statue.jpg'),
  require('../../../assets/intro/2-statue-auge.jpg'),
  require('../../../assets/intro/3-auge.jpg'),
  require('../../../assets/intro/4-iris.jpg'),
];

// Querformat (PC, Handy quer): Ausschnitte in Prozent der 16:9-Bühne. Jedes Auge liegt ungefähr
// über dem Statuen-Auge (57 % / 38 %); Ebene 2 liegt ganz unter Ebene 3, damit kein Rand hervorblitzt.
const RECTS_LANDSCAPE: Rect[] = [
  { left: 0, top: 0, width: 100, height: 100 },
  { left: 29, top: 2, width: 62, height: 66 },
  { left: 20, top: 0, width: 72, height: 72 },
  { left: 4, top: 44, width: 46, height: 52 },
];

// Hochformat (Handy): die Ausschnitte stapeln sich als Streifen über der Statue.
const RECTS_PORTRAIT: Rect[] = [
  { left: 0, top: 0, width: 100, height: 100 },
  { left: 10, top: 12, width: 90, height: 34 },
  { left: 0, top: 28, width: 86, height: 34 },
  { left: 18, top: 55, width: 82, height: 30 },
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
const LAST = STEPS.length - 1;
const PRELOAD_TIMEOUT_MS = 2500;
const PILL_AREA = 150; // Wisch-Leiste + Hinweis + Abstände

type Props = {
  /** Wird aufgerufen, sobald entsperrt wurde. Die App liegt dann schon darunter. */
  onUnlock: () => void;
  /** Wird aufgerufen, wenn der Sperrbildschirm weggeschoben ist. */
  onGone: () => void;
  /** Direkt zum Sperrbildschirm, ohne Collage (z. B. nach „Sperren“ in der Seitenleiste). */
  startLocked?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Start der App: Bild-Collage (Statue → Auge), danach Sperrbildschirm mit Wisch-Leiste bzw. Leertaste. */
export function IntroGate({ onUnlock, onGone, startLocked = false }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const canHover = useCanHover();
  const [step, setStep] = useState(startLocked ? LAST : 0);
  const [locked, setLocked] = useState(startLocked);
  const [loadedCount, setLoadedCount] = useState(0);
  const [preloadTimedOut, setPreloadTimedOut] = useState(false);
  const ready = startLocked || loadedCount >= SOURCES.length || preloadTimedOut;
  const [chrome] = useState(() => new Animated.Value(startLocked ? 1 : 0)); // Titel und Leiste
  const [slide] = useState(() => new Animated.Value(startLocked ? -1 : 0)); // -1 = oben aus dem Bild

  // Erst wenn alle Bilder geladen sind, beginnt die Collage. So sitzt jeder Schnitt sofort.
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setPreloadTimedOut(true), PRELOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [ready]);

  // Collage abspielen. Überspringen (locked) beendet die Zeitkette sofort.
  // Mit „Bewegung reduzieren“ geht es direkt zum Sperrbildschirm.
  useEffect(() => {
    if (startLocked || locked || !ready) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          setStep(LAST);
          setLocked(true);
          return;
        }
        let i = 0;
        const next = () => {
          if (cancelled) return;
          i += 1;
          if (i > LAST) return setLocked(true);
          setStep(i);
          timer = setTimeout(next, STEPS[i].ms);
        };
        timer = setTimeout(next, STEPS[0].ms);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [startLocked, locked, ready]);

  useEffect(() => {
    if (locked) Animated.timing(chrome, { toValue: 1, duration: 450, useNativeDriver: false }).start();
  }, [locked, chrome]);

  // „Sperren“: der Sperrbildschirm gleitet von oben herein, wie ein Rollo.
  useEffect(() => {
    if (!startLocked) return;
    Animated.timing(slide, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [startLocked, slide]);

  // Überspringen: Tippen, Klicken oder eine Taste während der Collage.
  const skip = () => {
    setStep(LAST);
    setLocked(true);
  };
  useEffect(() => {
    if (locked || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = () => {
      setStep(LAST);
      setLocked(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [locked]);

  // Entsperren: der Sperrbildschirm gleitet nach oben weg und gibt die App frei.
  const unlock = () => {
    onUnlock();
    Animated.timing(slide, {
      toValue: -1,
      duration: 480,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(() => onGone());
  };

  // Bühne: im Hochformat ein hohes Bild unter dem Titel, im Querformat ein großes 16:9-Bild mit dem Titel darauf.
  const portrait = height > width * 1.05;
  let stageW: number;
  let stageH: number;
  let stageTop: number;
  if (portrait) {
    stageTop = insets.top + clamp(height * 0.17, 110, 190);
    stageW = width;
    stageH = Math.max(160, height - stageTop - insets.bottom - PILL_AREA - 24);
  } else {
    stageTop = insets.top + clamp(height * 0.06, 16, 48);
    stageH = Math.max(120, Math.min(height - stageTop - insets.bottom - PILL_AREA, ((width - 96) * 9) / 16, 720));
    stageW = (stageH * 16) / 9;
  }
  // Im Hochformat wird das Statuenfoto größer gezeichnet und so verschoben, dass der Kopf (bei ~70 %) mittig sitzt.
  const frameW = portrait ? (stageH * 16) / 9 : stageW;
  const frameLeft = portrait ? Math.min(0, Math.max(stageW - frameW, stageW / 2 - frameW * 0.7)) : 0;
  const rects = portrait ? RECTS_PORTRAIT : RECTS_LANDSCAPE;

  const visible = ready ? STEPS[step].visible : 0;
  const lift = chrome.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const translateY = slide.interpolate({ inputRange: [-1, 0], outputRange: [-height, 0] });

  const titleSize = portrait ? 44 : clamp(stageW * 0.06, 26, 76);
  const taglineSize = portrait ? 18 : clamp(stageW * 0.017, 13, 20);

  const title = (
    <Animated.View
      style={[
        portrait ? [styles.titlePortrait, { top: insets.top, height: stageTop - insets.top }] : styles.titleLandscape,
        { opacity: chrome, transform: [{ translateY: lift }] },
      ]}
      aria-hidden={!locked}
    >
      <Text
        style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.08 }]}
        role="heading"
        maxFontSizeMultiplier={1.2}
      >
        ORBIT
      </Text>
      <Text style={[styles.tagline, { fontSize: taglineSize }]} maxFontSizeMultiplier={1.3}>
        Dein privater Manager.
      </Text>
    </Animated.View>
  );

  return (
    <Animated.View
      style={[styles.overlay, { transform: [{ translateY }] }]}
      role="dialog"
      aria-modal
      aria-label="Orbit entsperren"
    >
      {portrait && title}

      <View style={[styles.stage, { top: stageTop, width: stageW, height: stageH, left: (width - stageW) / 2 }]}>
        {/* Alle Ebenen sind von Anfang an da (unsichtbar), damit jeder Schnitt sofort sitzt. */}
        {SOURCES.map((source, i) => {
          const rect = rects[i];
          return (
            <Image
              key={i}
              source={source}
              resizeMode="cover"
              fadeDuration={0}
              onLoad={() => setLoadedCount((n) => n + 1)}
              style={[
                styles.layer,
                i === 0
                  ? { left: frameLeft, top: 0, width: frameW, height: stageH }
                  : {
                      left: `${rect.left}%`,
                      top: `${rect.top}%`,
                      width: `${rect.width}%`,
                      height: `${rect.height}%`,
                    },
                { opacity: i < visible ? 1 : 0 },
              ]}
              accessibilityIgnoresInvertColors
              aria-hidden
            />
          );
        })}
        {!portrait && title}
      </View>

      <Animated.View
        style={[
          styles.bottom,
          {
            top: stageTop + stageH,
            paddingBottom: insets.bottom,
            opacity: chrome,
            transform: [{ translateY: lift }],
            pointerEvents: locked ? 'auto' : 'none',
          },
        ]}
        aria-hidden={!locked}
      >
        {locked && <SlideToUnlock onUnlock={unlock} holdSpace={canHover} />}
        <Text style={styles.hint}>{canHover ? 'Leertaste gedrückt halten' : 'Zum Öffnen nach rechts wischen'}</Text>
      </Animated.View>

      {/* Während der Collage liegt eine unsichtbare Fläche obenauf: Tippen oder Klicken überspringt.
          Danach ist sie weg, damit nichts die Wisch-Leiste als „deaktiviert“ erscheinen lässt. */}
      {!locked && <Pressable style={styles.skip} onPress={skip} accessible={false} tabIndex={-1} />}
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
  skip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    cursor: 'auto',
  },
  // Hochformat: Titel über dem Bild, unten bündig.
  titlePortrait: {
    position: 'absolute',
    left: 24,
    right: 24,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  // Querformat: Titel liegt auf dem leeren, hellen Teil des Statuenfotos.
  titleLandscape: {
    position: 'absolute',
    left: '5%',
    top: '9%',
    maxWidth: '40%',
  },
  title: {
    fontFamily: fonts.heavy,
    letterSpacing: 1,
    color: colors.ink,
  },
  tagline: {
    marginTop: 6,
    fontFamily: fonts.regular,
    color: colors.inkMuted,
  },
  stage: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  layer: {
    position: 'absolute',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.inkMuted,
  },
});
