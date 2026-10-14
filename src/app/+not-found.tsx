import { Redirect } from 'expo-router';

/** Unbekannte Adressen (z. B. ein Tippfehler in der Browser-URL) führen zurück zum Planer. */
export default function NotFound() {
  return <Redirect href="/" />;
}
