@AGENTS.md

# Orbit: Projektregeln für Claude Code

Orbit ist eine minimalistische Life-Tracking-App, ein privater Manager statt zehn einzelner Apps (Expo SDK 57, Expo Router, TypeScript). Sie läuft auf iPhone, Android und im Browser am PC. Als Nächstes kommen Trainingspläne und Food-Tracking (siehe `docs/ROADMAP.md`).

## Aufbau
- **Start:** `src/components/gate/LockScreen.tsx`: blendet aus Weiß ein, links der unscharfe Statuenkopf (`assets/lock/statue-blur.jpg`, erzeugt mit `scripts/make-lock-image.py`), rechts ORBIT. Keine Animation darüber hinaus. Entsperren: am Handy die Wisch-Leiste (`SlideToUnlock`) nach rechts ziehen, am PC die Leertaste gedrückt halten (oder ziehen). Im Browser überspringt `?intro=0` den Sperrbildschirm (für Tests).
- **Sperren:** „Sperren“ in der Seitenleiste schiebt den Sperrbildschirm wieder herein. Die App bleibt darunter geladen (Seite und Eingaben bleiben erhalten) und ist im Browser solange `inert`.
- **Hülle:** `src/components/shell/`: Seitenleiste ab 1100 px fest links, darunter als Schublade über das Menü-Symbol (`PageHeader`). Browser-Helfer (inert, Fokus, Enter auf Links) liegen in `src/lib/web.ts`.
- **Seiten:** `/` Startseite (Willkommen, heute aufgeteilt in Habits und Todos, kommende Werkzeuge), `/habits` Habits (Wochentage wie bei den Todos, an jedem Tag frische Kästchen für die Habits, die an dem Tag anstehen), `/todos` Wochenplaner (`/woche` leitet dorthin weiter), `/einstellungen` (Habits mit ihren Wochentagen, Tags).
- **Tagesbänder:** `DayBand` ist ein Akkordeon, am Handy wie am PC: immer höchstens ein Tag offen (beim Start heute), ein Klick auf einen anderen Tag klappt den auf und die übrigen zu.
- **Aufgaben:** In der Liste nur Kästchen + Beschreibung (`TaskItem`). Klick auf die Beschreibung öffnet `TaskPanel`: am PC ein kleines Fenster rechts über der Liste (verschiebt nichts, × oder Escape schließt), am Handy ein Blatt von unten. Darin Bis (`DatePicker`), Stunden, Link und Tags als Aufzählung mit Punkten. Neue Aufgabe: „+ Aufgabe hinzufügen“ im offenen Tag, das Plus (PC in der Wochenleiste, Handy schwebend) oder N. Mit „Bis“ steht eine Aufgabe an jedem Tag von ihrem Starttag bis dahin in der Liste (`tasksOn()`), wird pro Tag abgehakt und ist am letzten Tag orange markiert. Nach dem Abhaken fragt die Liste nach den gearbeiteten Stunden (pro Tag in `log`, Summe im Fenster).

## Design ist das Wichtigste
- Look: gestapelte Tagesbänder in Graustufen, von hell (Montag) nach dunkel (Sonntag), dazu genau **eine** Akzentfarbe (Orange `colors.accent`). Schrift: Barlow (ExtraBold für Tage, Regular/Medium für Text).
- Farben, Schriften und Abstände **nur** über `src/theme.ts`, keine Hex-Werte in Komponenten.
- Jede UI-Änderung muss in **beiden** Layouts gut aussehen (`src/lib/useLayout.ts`):
  - **compact** (< 860 px Inhaltsbreite, Handy/Tablet hoch): Tag oben, Inhalt darunter.
  - **wide** (≥ 860 px Inhaltsbreite, PC/Tablet quer): Tag + Datum links, Inhalt rechts; die Woche soll auf einen 1280×720-Bildschirm passen.
  - Inhaltsbreite = Fenster minus Seitenleiste (`useShell().contentWidth`).
- Am PC: Hover-Zustände, Mauszeiger (`cursor: 'pointer'`), Tastatur (Leertaste halten entsperrt, ← → Woche und T heute in Todos und Habits, N neue Aufgabe, Escape schließt das Fenster), kein Browser-Fokusrahmen in Eingabefeldern.
- Icons: eigene Linien-Icons in `src/components/Icon.tsx` (react-native-svg), keine Icon-Fonts.
- UI-Texte auf **Deutsch**.

## Code
- Routen in `src/app/`, alles andere in `src/components/` und `src/lib/`.
- Daten: `src/lib/useTasks.ts` (Todos, Schlüssel `orbit.tasks.v1`, nach Starttag; optional `due`/`link`/`tags`/`log` je Aufgabe), `src/lib/useTags.ts` (Tags, `orbit.tags.v1`) und `src/lib/useHabits.ts` (Habits, `orbit.habits.v1`, optional `days` = Wochentage), alle über `useStoredState` aus `src/lib/storage.ts` (AsyncStorage, im Browser localStorage). Speicherschlüssel nur mit Migration ändern.
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
