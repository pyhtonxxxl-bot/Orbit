import { Platform } from 'react-native';

// Kleine Helfer für Dinge, die es nur im Browser gibt. Auf iOS/Android tun sie nichts.

const isWeb = Platform.OS === 'web';

type DomNode = { inert?: boolean; querySelector?: (s: string) => { focus?: () => void } | null };

/** Macht einen Bereich für Tastatur und Screenreader unerreichbar (HTML `inert`), z. B. hinter einem Dialog. */
export function setInert(node: unknown, inert: boolean) {
  if (!isWeb || !node || typeof node !== 'object') return;
  (node as DomNode).inert = inert;
}

/** Setzt den Tastaturfokus auf das erste bedienbare Element in einem Bereich. */
export function focusFirst(node: unknown) {
  if (!isWeb || !node || typeof node !== 'object') return;
  (node as DomNode).querySelector?.('button, [role="button"], [role="link"], [tabindex="0"]')?.focus?.();
}

/** `true`, solange ein Dialog offen ist (Sperrbildschirm, Menü-Schublade): globale Tastenkürzel pausieren dann. */
export function isDialogOpen(): boolean {
  return isWeb && typeof document !== 'undefined' && !!document.querySelector('[aria-modal="true"]');
}

type WebKeyEvent = { key: string; target: unknown; currentTarget: unknown; preventDefault(): void };

/**
 * Enter auf einem fokussierten Link-Element löst `onPress` aus. react-native-web tut das bei role="link"
 * nicht von selbst. Als Spread verwenden: `<Pressable {...enterActivates(go)} />`.
 */
export function enterActivates(onPress?: () => void) {
  if (!isWeb || !onPress) return {};
  return {
    onKeyDown: (e: WebKeyEvent) => {
      if (e.key !== 'Enter' || e.target !== e.currentTarget) return;
      e.preventDefault();
      onPress();
    },
  };
}

/**
 * Leertaste auf einem fokussierten Kästchen (role="checkbox") schaltet um. react-native-web tut das
 * nur bei role="button". Als Spread verwenden: `<Pressable {...spaceToggles(toggle)} />`.
 */
export function spaceToggles(onToggle?: () => void) {
  if (!isWeb || !onToggle) return {};
  return {
    onKeyDown: (e: WebKeyEvent & { repeat?: boolean }) => {
      if (e.key !== ' ' || e.target !== e.currentTarget || e.repeat) return;
      e.preventDefault();
      onToggle();
    },
  };
}
