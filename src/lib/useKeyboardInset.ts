import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Höhe der Tastatur auf Android, sonst 0. Seit Edge-to-Edge (SDK 54+) schiebt Android den Inhalt nicht mehr
 * von selbst hoch: als Abstand unten in die ScrollView geben, damit Eingaben über der Tastatur erreichbar bleiben.
 * iOS erledigt das über `automaticallyAdjustKeyboardInsets`.
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
