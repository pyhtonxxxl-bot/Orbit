// Pro Schnitt importieren, damit nur die genutzten Fonts im App-Bundle landen.
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { Barlow_800ExtraBold } from '@expo-google-fonts/barlow/800ExtraBold';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { IntroGate } from '../components/gate/IntroGate';
import { Shell } from '../components/shell/Shell';
import { setInert } from '../lib/web';
import { colors } from '../theme';

// Für Tests und Entwicklung im Browser: `?intro=0` überspringt Intro und Sperrbildschirm.
const skipGate =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('intro') === '0';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_800ExtraBold,
  });

  // Beim Öffnen: Intro, dann Sperrbildschirm. „Sperren“ in der Seitenleiste zeigt nur den Sperrbildschirm.
  const [gate, setGate] = useState<'intro' | 'lock' | null>(skipGate ? null : 'intro');
  // Die App wird erst beim ersten Entsperren eingehängt und bleibt danach stehen, auch beim Sperren:
  // so kommst du nach dem Entsperren genau dorthin zurück, wo du warst.
  const [appMounted, setAppMounted] = useState(skipGate);
  const appRef = useRef<View>(null);
  const covered = gate !== null;

  // Solange der Sperrbildschirm darüber liegt, ist die App für Tastatur und Screenreader unerreichbar.
  useEffect(() => {
    setInert(appRef.current, covered);
  }, [covered, appMounted]);

  // Ohne Schrift würde das Layout kurz springen. Schlägt das Laden fehl, geht es mit der Systemschrift weiter.
  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {appMounted && (
        <View
          ref={appRef}
          style={styles.app}
          importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={covered}
        >
          <Shell onLock={() => setGate('lock')}>
            <Slot />
          </Shell>
        </View>
      )}
      {gate && (
        <IntroGate
          key={gate}
          startLocked={gate === 'lock'}
          // Die App liegt schon darunter, während der Sperrbildschirm weggleitet.
          onUnlock={() => setAppMounted(true)}
          onGone={() => setGate(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  app: {
    flex: 1,
  },
});
