import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { palettes, type Palette, type ThemeName } from '../theme';
import { useStoredState } from './storage';

type Settings = { theme: ThemeName };

const STORAGE_KEY = 'orbit.settings.v1';
const DEFAULTS: Settings = { theme: 'light' };

/** Liest gespeicherte Einstellungen. Unbekanntes wird zum Standard. */
function parseSettings(raw: string): Settings {
  const parsed = JSON.parse(raw) as Partial<Settings> | null;
  if (!parsed || typeof parsed !== 'object') throw new Error('Unerwartetes Format');
  return { theme: parsed.theme === 'dark' ? 'dark' : 'light' };
}

type ThemeContextValue = {
  theme: ThemeName;
  colors: Palette;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  colors: palettes.light,
  setTheme: () => {},
});

/**
 * Hell oder dunkel, gespeichert unter `orbit.settings.v1`. Umschließt die ganze App; bis die Einstellung
 * gelesen ist, bleibt der Bildschirm leer (das dauert nur Millisekunden), damit nichts falsch aufblitzt.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { value, setValue, loaded } = useStoredState(STORAGE_KEY, parseSettings, DEFAULTS);
  const theme = value.theme;
  const ctx = useMemo<ThemeContextValue>(
    () => ({ theme, colors: palettes[theme], setTheme: (next) => setValue((s) => ({ ...s, theme: next })) }),
    [theme, setValue],
  );

  // Browser: Seitengrund und Bildlaufleisten mitziehen (siehe public/index.html, Klasse `dark`).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <ThemeContext.Provider value={ctx}>{loaded ? children : null}</ThemeContext.Provider>;
}

/** Die Farben des aktuellen Designs. */
export function useColors(): Palette {
  return useContext(ThemeContext).colors;
}

/** Design lesen und umschalten (Einstellungen). */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
