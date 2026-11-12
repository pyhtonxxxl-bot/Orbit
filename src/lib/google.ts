import { Platform } from 'react-native';

import { addDays } from './date';
import { WINDOW_DAYS, fromGoogle, type CalendarEvent, type GoogleEvent } from './calendar';

// Google Kalender lesen, nur im Browser: Anmeldung mit Google Identity Services (ein Pop-up von Google),
// danach die Calendar API v3. Orbit bekommt nur Lese-Zugriff und hält den Zugangsschlüssel nur im Speicher,
// er wird nie gespeichert. Ohne eigenen Server, deshalb braucht es eine OAuth-Client-ID (siehe README).

/** Nur lesen: Kalenderliste und Termine. */
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GSI_SRC = 'https://accounts.google.com/gsi/client';
const API = 'https://www.googleapis.com/calendar/v3';

/** Client-ID aus dem Build (Render: Umgebungsvariable), sonst die in Orbit eingetragene. */
export const BUILT_IN_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export const googleSupported = Platform.OS === 'web' && typeof window !== 'undefined';

type TokenResponse = { access_token?: string; expires_in?: number; error?: string; error_description?: string };
type TokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };
type GoogleAccounts = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

let scriptPromise: Promise<GoogleAccounts> | null = null;

/** Lädt das Skript von Google einmal. */
function loadGoogle(): Promise<GoogleAccounts> {
  if (!googleSupported) return Promise.reject(new Error('Google-Anmeldung geht nur im Browser.'));
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google-Anmeldung nicht geladen.')));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google-Anmeldung konnte nicht geladen werden. Bist du online?'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Skript schon beim Öffnen der Seite laden: dann kommt das Pop-up beim Klick sofort, und der Browser sieht es
 * als Folge des Klicks (sonst blockiert er es).
 */
export function preloadGoogle(): void {
  if (googleSupported) loadGoogle().catch(() => {});
}

let token: { value: string; expiresAt: number } | null = null;

/** Gibt es gerade einen gültigen Zugang (ohne neues Pop-up)? */
export function hasToken(): boolean {
  return !!token && token.expiresAt > Date.now() + 60_000;
}

/**
 * Zugang holen. Muss direkt aus einem Klick kommen, sonst blockiert der Browser das Pop-up.
 * Beim ersten Mal fragt Google nach der Erlaubnis, danach geht es meist ohne Nachfrage.
 */
export async function connect(clientId: string): Promise<string> {
  if (hasToken()) return token!.value;
  const google = await loadGoogle();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google hat keinen Zugang gegeben.'));
          return;
        }
        token = { value: response.access_token, expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 };
        resolve(response.access_token);
      },
      error_callback: (error) =>
        reject(new Error(error.type === 'popup_closed' ? 'Anmeldung abgebrochen.' : error.message || 'Anmeldung fehlgeschlagen.')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

/** Zugang wieder abgeben. */
export async function disconnect(): Promise<void> {
  if (!token) return;
  const value = token.value;
  token = null;
  try {
    const google = await loadGoogle();
    google.accounts.oauth2.revoke(value);
  } catch {}
}

async function get<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.status === 401) {
    token = null;
    throw new Error('Der Google-Zugang ist abgelaufen. Bitte neu verbinden.');
  }
  if (!response.ok) throw new Error(`Google Kalender antwortet mit Fehler ${response.status}.`);
  return (await response.json()) as T;
}

type CalendarListEntry = { id: string; summary?: string; summaryOverride?: string; selected?: boolean; primary?: boolean };

/**
 * Termine der nächsten 14 Tage aus allen Kalendern, die in Google eingeblendet sind (ohne Feiertage).
 * Wiederkehrende Termine kommen einzeln, mit gemeinsamer Serien-ID.
 */
export async function fetchEvents(accessToken: string, now = new Date()): Promise<CalendarEvent[]> {
  const list = await get<{ items?: CalendarListEntry[] }>('/users/me/calendarList?minAccessRole=reader&maxResults=50', accessToken);
  const calendars = (list.items ?? []).filter((c) => (c.selected || c.primary) && !c.id.includes('#holiday@'));
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const timeMax = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), WINDOW_DAYS + 1).toISOString();
  const results = await Promise.all(
    calendars.map(async (c) => {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
        fields: 'items(id,status,summary,recurringEventId,start,end)',
      });
      const data = await get<{ items?: GoogleEvent[] }>(`/calendars/${encodeURIComponent(c.id)}/events?${params}`, accessToken);
      return fromGoogle(data.items ?? [], c.summaryOverride || c.summary);
    }),
  );
  return results.flat().sort((a, b) => (a.day + String(a.start ?? -1).padStart(5, '0')).localeCompare(b.day + String(b.start ?? -1).padStart(5, '0')));
}
