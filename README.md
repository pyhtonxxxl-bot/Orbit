# Orbit

Eine minimalistische Life-Tracking-App fürs Handy **und** den PC, dein privater Manager statt zehn einzelner Apps.

- **Start:** ein ruhiger Sperrbildschirm: links ein unscharfer Statuenkopf, rechts ORBIT. Du entsperrst am Handy, indem du die Leiste nach rechts wischst, am PC mit **gedrückter Leertaste**.
- **Startseite:** Begrüßung, dann dein Tag aufgeteilt in **Habits** (jeden Tag dasselbe abhaken) und **Todos** (Aufgaben für heute), darunter die kommenden Werkzeuge. Die Seitenleiste (am Handy über das Menü-Symbol) führt zu allen Seiten.
- **Habits:** pro Habit ein Band mit den sieben Tagen der Woche zum Abhaken und der Serie („10 Tage in Folge“).
- **Todos:** ein Wochen-Planer im Stil von [weekstack.io](https://weekstack.io/), sieben gestapelte Tagesbänder von hell nach dunkel.

**Am PC** liegt die ganze Woche offen da, links der Tag, rechts die Aufgaben:

<img src="docs/screens/pc.png" width="820" />

**Am Handy** tippst du einen Tag an, er klappt auf:

| Heute aufgeklappt | Woche |
| --- | --- |
| <img src="docs/screens/heute.png" width="260" /> | <img src="docs/screens/woche.png" width="260" /> |

## Was die Todos können

- Woche von Montag bis Sonntag, heute mit Datum und Uhrzeit
- Aufgaben hinzufügen (Enter, das Feld bleibt aktiv für die nächste), abhaken (klicken/tippen), löschen (am PC: × beim Drüberfahren, am Handy: lange drücken)
- Zwischen den Wochen blättern, am PC auch mit den Tasten **←** **→**, **T** springt zu heute
- Speichert lokal: am Handy auf dem Gerät, am PC im Browser
- Ab 860 px Inhaltsbreite (Fenster ohne Seitenleiste) automatisch das PC-Layout, darunter das Handy-Layout

## Am PC starten

Einmalig [Node.js](https://nodejs.org/) (LTS-Version) installieren. Dann im Projektordner:

```bash
npm install
npm run web
```

Danach öffnet sich Orbit im Browser, meist unter http://localhost:8081.

## Online stellen (Render)

Orbit im Browser besteht nur aus fertigen Dateien (`dist/`), dafür braucht es keinen Server. Auf Render deshalb als **Static Site** anlegen, nicht als Web Service: Static Sites sind kostenlos, schlafen nie ein und zeigen keinen „Service waking up“-Bildschirm.

1. [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint** → dieses Repo wählen. Render liest `render.yaml` und legt die Static Site „orbit“ an (Build: `npm ci && npm run build:web`, Ordner: `dist`).
2. Einen alten **Web Service** für Orbit löschen (Service → Settings → Delete), sonst bleibt dessen Adresse beim Lade-Bildschirm hängen.

Jeder Push auf `main` baut die Seite automatisch neu.

## Am Handy starten

```bash
npm run start
```

Den QR-Code mit der App **Expo Go** (iPhone/Android) scannen.

## Mit Claude Code weiterbauen

Das Repo ist für [Claude Code](https://claude.ai/code) eingerichtet:

- **`CLAUDE.md`** enthält die Projektregeln: Design-Prinzipien, beide Layouts (Handy + PC), Deutsch als UI-Sprache und die Prüfbefehle. Claude liest sie bei jeder Session automatisch.
- **`.claude/hooks/session-start.sh`** installiert in Cloud-Sessions (claude.ai/code) automatisch alle Pakete.
- **CI** (`.github/workflows/ci.yml`) prüft jeden Pull Request: Typecheck, Lint, Web-Build.

Beispiel-Prompts für die nächsten Schritte:

> „Füge eine minimalistische Navigation hinzu: Woche · Training · Essen. Gleicher Graustufen-Look, am PC und am Handy.“

> „Baue den Trainingsplan-Editor: Pläne mit Übungen, Sätzen, Wiederholungen und Gewicht. Übungen sollen sich per Drag & Drop sortieren lassen.“

## Prüfen

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build:web   # Web-Build nach dist/
```

## Struktur

```
src/app/_layout.tsx        Fonts, Sperrbildschirm, App-Hülle
src/app/index.tsx          Startseite (Willkommen, Habits und Todos von heute, Werkzeuge)
src/app/habits.tsx         Habits mit Wochenraster und Serie
src/app/todos.tsx          Der Wochen-Planer
src/components/gate/       Sperrbildschirm und Wisch-Leiste zum Entsperren
src/components/shell/      Seitenleiste, Schublade fürs Handy, Kopfzeile
assets/lock/               Statuenkopf (Original und unscharfe Fassung, siehe scripts/make-lock-image.py)
src/components/            DayRow, TaskItem, HabitRow, HabitItem, Checkbox, WeekFooter
src/lib/date.ts            Wochen- und Datumslogik (deutsch)
src/lib/storage.ts         Lokales Speichern (gemeinsam für Todos und Habits)
src/lib/useTasks.ts        Todos
src/lib/useHabits.ts       Habits und Serien
src/lib/useLayout.ts       Handy- oder PC-Layout je nach Fensterbreite
src/theme.ts               Farben, Schrift, Abstände (hier wird der Look justiert)
public/index.html          HTML-Hülle für den Browser
```

Was als Nächstes kommt und welche Skills du dafür brauchst, steht in [docs/ROADMAP.md](docs/ROADMAP.md).
