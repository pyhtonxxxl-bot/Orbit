import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Platform } from 'react-native';

/** Kurze, praktisch eindeutige ID für neue Einträge. */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

type Stored<T> = {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  /** Lesen ist fertig (die UI darf erscheinen). */
  loaded: boolean;
};

/**
 * Zustand, der lokal gespeichert wird: am Handy auf dem Gerät (AsyncStorage), im Browser im localStorage.
 * `parse` liest gespeicherte Daten und wirft, wenn sie unbrauchbar sind. `parse` und `empty` müssen
 * feste Werte sein (außerhalb der Komponente definiert), sonst wird bei jedem Rendern neu gelesen.
 */
export function useStoredState<T>(key: string, parse: (raw: string) => T, empty: T): Stored<T> {
  const [value, setValue] = useState<T>(empty);
  // `canSave`: Lesen hat geklappt, Speichern ist sicher.
  const [loaded, setLoaded] = useState(false);
  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Ein zweiter Versuch, falls das Lesen nur kurz hakt.
      const raw = await AsyncStorage.getItem(key).catch(() => AsyncStorage.getItem(key));
      if (raw) {
        let clean = empty;
        try {
          clean = parse(raw);
        } catch {}
        // Ging beim Einlesen etwas verloren (kaputtes JSON, unbekannte Felder), das Original sichern,
        // bevor es beim nächsten Speichern überschrieben wird. Jede Sicherung bekommt einen eigenen Schlüssel.
        if (JSON.stringify(clean) !== raw) {
          await AsyncStorage.setItem(`${key}.backup.${Date.now()}`, raw).catch(() => {});
        }
        setValue(clean);
      }
      setCanSave(true);
    };
    // Lesen endgültig fehlgeschlagen: nicht speichern, damit nie ein leerer Stand über echte Daten geschrieben wird.
    load()
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [key, parse, empty]);

  useEffect(() => {
    if (!canSave) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value, canSave]);

  // Im Browser: Änderungen aus einem anderen Tab übernehmen, statt sie später zu überschreiben.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key && e.key !== null) return;
      try {
        setValue(e.newValue ? parse(e.newValue) : empty);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, parse, empty]);

  return { value, setValue, loaded };
}
