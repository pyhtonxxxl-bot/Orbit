import { Redirect } from 'expo-router';

/** Unbekannte Adressen (z. B. ein Tippfehler in der Browser-URL) führen zur Startseite. */
export default function NotFound() {
  return <Redirect href="/" />;
}
