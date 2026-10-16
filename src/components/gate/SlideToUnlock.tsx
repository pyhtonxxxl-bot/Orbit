import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { colors, fonts } from '../../theme';
import { Icon } from '../Icon';

type Props = {
  onUnlock: () => void;
  /** PC: Leertaste gedrückt halten schiebt den Knopf von selbst nach rechts. */
  holdSpace: boolean;
};

const HEIGHT = 68;
const KNOB = 56;
const PAD = (HEIGHT - KNOB) / 2;
const HOLD_MS = 900; // so lange muss die Leertaste gehalten werden
// Breite der Spur und Position des Knopfs hängen am selben Wert: das geht nur ohne Native Driver.
const native = false;
const isWeb = Platform.OS === 'web';

/** Im Browser: der Knopf gehört ganz der Wisch-Geste (kein Scrollen, kein „Zurück“ per Wischen). */
function noBrowserGestures(node: unknown) {
  if (isWeb && node && typeof node === 'object' && 'style' in node) {
    (node as { style: { touchAction: string } }).style.touchAction = 'none';
  }
}

/** Wisch-Leiste wie ein Hardware-Schalter: Knopf ganz nach rechts ziehen öffnet die App. */
export function SlideToUnlock({ onUnlock, holdSpace }: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  const [trackWidth, setTrackWidth] = useState(0);
  const maxX = Math.max(1, trackWidth - KNOB - PAD * 2);
  const maxXRef = useRef(maxX);
  const doneRef = useRef(false);
  const holdRef = useRef<Animated.CompositeAnimation | null>(null);
  const valueRef = useRef(0);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    maxXRef.current = maxX;
  }, [maxX]);

  useEffect(() => {
    const id = progress.addListener(({ value }) => (valueRef.current = value));
    return () => progress.removeListener(id);
  }, [progress]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.timing(progress, { toValue: 1, duration: 120, useNativeDriver: native }).start(() => onUnlock());
  };

  const springBack = () => {
    Animated.spring(progress, { toValue: 0, useNativeDriver: native, bounciness: 6 }).start();
  };

  // Die Handler lesen die Refs erst beim Ziehen, nicht beim Rendern.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder: () => !doneRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        progress.stopAnimation();
        Haptics.selectionAsync().catch(() => {});
      },
      onPanResponderMove: (_, g) => {
        progress.setValue(Math.min(1, Math.max(0, g.dx / maxXRef.current)));
      },
      onPanResponderRelease: (_, g) => {
        const p = g.dx / maxXRef.current;
        // Fast ganz rechts oder mit Schwung nach rechts losgelassen: öffnen.
        if (p > 0.9 || (p > 0.35 && g.vx > 1)) finish();
        else springBack();
      },
      onPanResponderTerminate: springBack,
    }),
  );

  // PC: Leertaste halten füllt die Leiste, loslassen lässt sie zurückfedern.
  // Auch gehaltene Tasten (repeat) starten das Füllen, z. B. wenn die Leertaste schon beim Einblenden gedrückt war.
  useEffect(() => {
    if (!holdSpace || !isWeb || typeof document === 'undefined') return;
    const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' ';
    const release = () => {
      if (doneRef.current || !holdRef.current) return;
      holdRef.current.stop();
      holdRef.current = null;
      springBack();
    };
    const down = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      if (doneRef.current || holdRef.current) return;
      const remaining = 1 - valueRef.current;
      holdRef.current = Animated.timing(progress, {
        toValue: 1,
        duration: HOLD_MS * remaining,
        useNativeDriver: false,
      });
      holdRef.current.start(({ finished }) => {
        holdRef.current = null;
        if (finished) finish();
      });
    };
    const up = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      release();
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    // Fenster verliert den Fokus (keyup geht verloren): nicht weiterfüllen.
    window.addEventListener('blur', release);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
    };
    // finish/springBack lesen nur Refs und das stabile Animated.Value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdSpace]);

  // Klick, Enter oder Screenreader öffnen ebenfalls. Nur ein Finger-Tippen nicht: dort ist das Wischen
  // die Geste, ein versehentliches Antippen soll nicht entsperren. react-native-web meldet auch Tippen als
  // „click“, deshalb merken wir uns die letzte Berührung (Screenreader lösen keine Berührung aus).
  const onPress = () => {
    if (Date.now() - lastTouchRef.current < 1000) return;
    finish();
  };

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, maxX] });
  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [KNOB + PAD * 2, maxX + KNOB + PAD * 2] });
  const fillOpacity = progress.interpolate({ inputRange: [0, 0.04], outputRange: [0, 1], extrapolate: 'clamp' });
  const hintOpacity = progress.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Pressable
      ref={noBrowserGestures}
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
      // Am Handy (nativ) öffnet nur das Wischen oder die Screenreader-Aktion, kein Tippen.
      onPress={isWeb ? onPress : undefined}
      onTouchStart={() => {
        lastTouchRef.current = Date.now();
      }}
      role="button"
      aria-label="Orbit öffnen"
      accessibilityHint={holdSpace ? 'Leertaste gedrückt halten oder Knopf nach rechts ziehen' : 'Knopf nach rechts wischen'}
      accessibilityActions={[{ name: 'activate', label: 'Öffnen' }]}
      onAccessibilityAction={finish}
    >
      {/* Hellere Spur hinter dem Knopf zeigt den Fortschritt. */}
      <Animated.View style={[styles.fill, { width: fillWidth, opacity: fillOpacity }]} />
      <Animated.View style={[styles.chevrons, { opacity: hintOpacity }]}>
        <Text style={styles.chevronText} selectable={false}>
          ›››
        </Text>
      </Animated.View>
      <View style={styles.end}>
        <Icon name="arrow" size={22} color={colors.white} />
      </View>
      <Animated.View ref={noBrowserGestures} style={[styles.knob, { transform: [{ translateX }] }]} {...pan.panHandlers}>
        <Text style={styles.knobText} selectable={false} maxFontSizeMultiplier={1.2}>
          Start
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    maxWidth: 360,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: colors.pill,
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
    cursor: 'pointer',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: HEIGHT / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  chevrons: {
    position: 'absolute',
    left: KNOB + PAD * 2 + 16,
  },
  chevronText: {
    fontFamily: fonts.medium,
    fontSize: 22,
    letterSpacing: 2,
    color: colors.pillTrack,
    userSelect: 'none',
  },
  end: {
    position: 'absolute',
    right: 24,
  },
  knob: {
    position: 'absolute',
    left: PAD,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  knobText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: 0.3,
    color: colors.ink,
    userSelect: 'none',
  },
});
