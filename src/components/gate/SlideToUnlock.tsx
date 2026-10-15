import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

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

/** Wisch-Leiste wie ein Hardware-Schalter: Knopf ganz nach rechts ziehen öffnet die App. */
export function SlideToUnlock({ onUnlock, holdSpace }: Props) {
  const progress = useState(() => new Animated.Value(0))[0];
  const [trackWidth, setTrackWidth] = useState(0);
  const maxX = Math.max(1, trackWidth - KNOB - PAD * 2);
  const maxXRef = useRef(maxX);
  const doneRef = useRef(false);
  const holdRef = useRef<Animated.CompositeAnimation | null>(null);
  const valueRef = useRef(0);

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
        if (p > 0.9 || (p > 0.5 && g.vx > 1.2)) finish();
        else springBack();
      },
      onPanResponderTerminate: springBack,
    }),
  );

  // PC: Leertaste halten füllt die Leiste, loslassen lässt sie zurückfedern.
  useEffect(() => {
    if (!holdSpace || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat || doneRef.current || holdRef.current) return;
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
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      if (doneRef.current) return;
      holdRef.current?.stop();
      holdRef.current = null;
      springBack();
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
    // finish/springBack lesen nur Refs und das stabile Animated.Value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdSpace]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, maxX] });
  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [KNOB + PAD, maxX + KNOB + PAD] });
  const hintOpacity = progress.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
      role="button"
      aria-label="Orbit öffnen"
      accessibilityHint={holdSpace ? 'Leertaste gedrückt halten oder Knopf nach rechts ziehen' : 'Knopf nach rechts wischen'}
      accessibilityActions={[{ name: 'activate', label: 'Öffnen' }]}
      onAccessibilityAction={finish}
    >
      {/* Hellere Spur hinter dem Knopf zeigt den Fortschritt. */}
      <Animated.View style={[styles.fill, { width: fillWidth }]} />
      <Animated.View style={[styles.chevrons, { opacity: hintOpacity }]}>
        <Text style={styles.chevronText}>›››</Text>
      </Animated.View>
      <View style={styles.end}>
        <Icon name="arrow" size={22} color={colors.white} />
      </View>
      <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} {...pan.panHandlers}>
        <Text style={styles.knobText}>Start</Text>
      </Animated.View>
    </View>
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
  },
});
