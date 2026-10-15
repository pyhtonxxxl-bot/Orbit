@AGENTS.md

# Orbit: Projektregeln für Claude Code

Orbit ist eine minimalistische Life-Tracking-App, ein privater Manager statt zehn einzelner Apps (Expo SDK 57, Expo Router, TypeScript). Sie läuft auf iPhone, Android und im Browser am PC. Als Nächstes kommen Trainingspläne und Food-Tracking (siehe `docs/ROADMAP.md`).

## Aufbau
- **Start:** `src/components/gate/IntroGate.tsx`: weißer Screen, dann eine Foto-Collage (Statue → Statuen-Auge → echtes Auge → Iris, Bilder in `assets/intro/`) hin und zurück. Danach der Sperrbildschirm: am Handy die Wisch-Leiste (`SlideToUnlock`) nach rechts ziehen, am PC die Leertaste gedrückt halten (oder ziehen). Im Browser überspringt `?intro=0` beides (für Tests).
- **Hülle:** `src/components/shell/`: Seitenleiste ab 1100 px fest links, darunter als Schublade über das Menü-Symbol (`PageHeader`).
- **Seiten:** `/` Startseite (Willkommen, heute, Werkzeuge als Bänder), `/woche` Wochenplaner.

## Design ist das Wichtigste
- Look: gestapelte Tagesbänder in Graustufen, von hell (Montag) nach dunkel (Sonntag), dazu genau **eine** Akzentfarbe (Orange `colors.accent`). Schrift: Barlow (ExtraBold für Tage, Regular/Medium für Text).
- Farben, Schriften und Abstände **nur** über `src/theme.ts`, keine Hex-Werte in Komponenten.
- Jede UI-Änderung muss in **beiden** Layouts gut aussehen (`src/lib/useLayout.ts`):
  - **compact** (< 860 px Inhaltsbreite, Handy/Tablet hoch): Akkordeon, ein Tag offen.
  - **wide** (≥ 860 px Inhaltsbreite, PC/Tablet quer): alle Tage offen, Tag + Datum links, Aufgaben rechts; die Woche soll auf einen 1280×720-Bildschirm passen.
  - Inhaltsbreite = Fenster minus Seitenleiste (`useShell().contentWidth`).
- Am PC: Hover-Zustände, Mauszeiger (`cursor: 'pointer'`), Tastatur (Leertaste halten entsperrt, ← → Woche, T heute, Enter fügt hinzu), kein Browser-Fokusrahmen in Eingabefeldern.
- Icons: eigene Linien-Icons in `src/components/Icon.tsx` (react-native-svg), keine Icon-Fonts.
- UI-Texte auf **Deutsch**.

## Code
- Routen in `src/app/`, alles andere in `src/components/` und `src/lib/`.
- Daten: `src/lib/useTasks.ts` (AsyncStorage, im Browser localStorage). Den Speicherschlüssel `orbit.tasks.v1` nur mit Migration ändern.
- Neue Pakete immer mit `npx expo install <paket>`.

## Vor jedem Commit prüfen
```bash
npm run typecheck
npm run lint
npm run build:web   # Web-Build muss durchlaufen
```
Bei UI-Änderungen: `npx expo start --web` (oder den Build aus `dist/` ausliefern) und Screenshots bei 390×844, 820×1180, 1280×720 und 1440×900 ansehen.

## Cloud-Sessions
Der SessionStart-Hook (`.claude/hooks/session-start.sh`) installiert die Abhängigkeiten und setzt `EXPO_OFFLINE=1`, weil die Expo-API dort oft gesperrt ist. Ohne diese Variable schlägt `npx expo install` mit „HTTP Proxy Network Error: Forbidden“ fehl. Im Offline-Modus nimmt es die SDK-passenden Versionen aus `expo/bundledNativeModules.json`.
