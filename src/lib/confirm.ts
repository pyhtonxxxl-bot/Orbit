import { Alert, Platform } from 'react-native';

/** Fragt vor dem Löschen nach, am Handy als System-Dialog, im Browser mit `confirm()`. */
export function confirmDelete(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: onConfirm },
  ]);
}
