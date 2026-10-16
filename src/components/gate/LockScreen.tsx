import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCanHover } from '../../lib/useLayout';
import { colors, fonts } from '../../theme';
import { SlideToUnlock } from './SlideToUnlock';

// Unscharfer Statuenkopf, erzeugt mit scripts/make-lock-image.py (gespiegelt, unten in `colors.lock` auslaufend).
const STATUE = require('../../../assets/lock/statue-blur.jpg');
const IMAGE_ASPECT = 1344 / 752;
// Mitte des Gesichts im Bild, als Anteil von Breite und Höhe.
const FACE_X = 0.3;
const FACE_Y = 0.42;
const LOAD_TIMEOUT_MS = 1500;
// Höhe von Wisch-Leiste, Abstand und Hinweis darunter.
const CONTROL_H = 68 + 14 + 18;

type Props = {
  /** App-Start: blendet aus Weiß ein. Nach „Sperren“: gleitet von oben herein. */
  entrance: 'fade' | 'slide';
  /** Wird aufgerufen, sobald entsperrt wurde. Die App liegt dann schon darunter. */
  onUnlock: () => void;
  /** Wird aufgerufen, wenn der Sperrbildschirm weggeschoben ist. */
  onGone: () => void;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Sperrbildschirm: links der unscharfe Statuenkopf, rechts ORBIT. Entsperren per Wisch-Leiste oder Leertaste. */
export function LockScreen({ entrance, onUnlock, onGone }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const canHover = useCanHover();
  const [appear] = useState(() => new Animated.Value(entrance === 'fade' ? 0 : 1));
  const [slide] = useState(() => new Animated.Value(entrance === 'slide' ? -1 : 0)); // -1 = oben aus dem Bild
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const ready = loaded || timedOut;

  // Erst einblenden, wenn das Bild da ist, damit es nicht nachträglich hineinplatzt.
  // Lädt es nicht (offline, Fehler), geht es nach kurzer Zeit trotzdem weiter.
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [ready]);

  useEffect(() => {
    if (entrance !== 'fade' || !ready) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) appear.setValue(1);
        else Animated.timing(appear, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [entrance, ready, appear]);

  // „Sperren“: der Sperrbildschirm gleitet von oben herein, wie ein Rollo.
  useEffect(() => {
    if (entrance !== 'slide') return;
    Animated.timing(slide, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [entrance, slide]);

  // Entsperren: der Sperrbildschirm gleitet nach oben weg und gibt die App frei.
  const unlock = () => {
    onUnlock();
    Animated.timing(slide, { toValue: -1, duration: 480, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(
      () => onGone(),
    );
  };

  // Querformat (PC): das Bild füllt den Bildschirm, der Kopf steht links, ORBIT und die Leiste rechts daneben.
  // Hochformat (Handy): der Kopf oben, ORBIT rechtsbündig darunter, die Leiste unten in Daumennähe.
  const portrait = height > width;
  let imgW: number;
  let imgH: number;
  let imgTop: number;
  if (portrait) {
    imgH = height * 0.62;
    imgW = imgH * IMAGE_ASPECT;
    imgTop = 0;
  } else {
    // Füllt den Bildschirm, wächst bei fast quadratischen Fenstern (4:3, iPad) aber nicht weiter mit der Höhe,
    // sonst rückt der Kopf an ORBIT heran. Unten läuft das Bild ohnehin in den Hintergrund aus.
    imgH = Math.max(width / IMAGE_ASPECT, Math.min(height, width * 0.7));
    imgW = imgH * IMAGE_ASPECT;
    imgTop = clamp(height * 0.45 - FACE_Y * imgH, height - imgH, 0);
  }
  const imgLeft = clamp(width * (portrait ? 0.42 : 0.28) - FACE_X * imgW, width - imgW, 0);

  // Hochformat: ORBIT steht immer über der Leiste, auch in fast quadratischen Fenstern (z. B. Android-Splitscreen).
  const controlTop = height - insets.bottom - 20 - CONTROL_H;
  const titleSize = portrait
    ? Math.min(clamp(width * 0.22, 56, 132), Math.max(40, (controlTop - height * 0.3) / 1.05))
    : clamp(width * 0.1, 56, Math.min(190, height * 0.24));
  const titleTop = Math.min(imgH * 0.84, height * 0.56, controlTop - titleSize * 1.05 - 16);
  const translateY = slide.interpolate({ inputRange: [-1, 0], outputRange: [-height, 0] });
  const lift = appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const title = (
    <Text
      style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.05, letterSpacing: titleSize * 0.02 }]}
      role="heading"
      maxFontSizeMultiplier={1}
    >
      ORBIT
    </Text>
  );
  const unlockControl = (
    <View style={styles.control}>
      <SlideToUnlock onUnlock={unlock} holdSpace={canHover} />
      <Text style={styles.hint}>{canHover ? 'Leertaste gedrückt halten' : 'Zum Öffnen nach rechts wischen'}</Text>
    </View>
  );

  return (
    <Animated.View
      style={[styles.overlay, { transform: [{ translateY }] }]}
      role="dialog"
      aria-modal
      aria-label="Orbit entsperren"
    >
      <Animated.View style={[styles.scene, { opacity: appear }]}>
        <Image
          source={STATUE}
          resizeMode="cover"
          fadeDuration={0}
          onLoad={() => setLoaded(true)}
          onError={() => setTimedOut(true)}
          style={[styles.image, { left: imgLeft, top: imgTop, width: imgW, height: imgH }]}
          accessibilityIgnoresInvertColors
          aria-hidden
        />

        {portrait ? (
          <>
            <Animated.View
              style={[
                styles.titlePortrait,
                { top: titleTop, transform: [{ translateY: lift }] },
              ]}
            >
              {title}
            </Animated.View>
            <Animated.View
              style={[styles.bottomPortrait, { paddingBottom: insets.bottom + 20, transform: [{ translateY: lift }] }]}
            >
              {unlockControl}
            </Animated.View>
          </>
        ) : (
          <Animated.View
            style={[
              styles.sideLandscape,
              {
                left: width * 0.52,
                right: clamp(width * 0.05, 24, 96) + insets.right,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                gap: clamp(titleSize * 0.28, 16, 44),
                transform: [{ translateY: lift }],
              },
            ]}
          >
            {title}
            {unlockControl}
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Weiß, solange das Bild noch einblendet.
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  scene: {
    flex: 1,
    backgroundColor: colors.lock,
  },
  image: {
    position: 'absolute',
  },
  title: {
    fontFamily: fonts.heavy,
    color: colors.ink,
  },
  titlePortrait: {
    position: 'absolute',
    right: 24,
    left: 24,
    alignItems: 'flex-end',
  },
  bottomPortrait: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    alignItems: 'center',
  },
  sideLandscape: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  control: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.inkMuted,
  },
});
