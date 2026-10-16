# Roadmap & Skills

## Skills, die du für Orbit brauchst

### 1. Design (das Wichtigste)
| Skill | Wofür | Womit lernen |
| --- | --- | --- |
| **Figma** | Screens entwerfen, bevor sie gebaut werden | Figma-Tutorials, iOS-UI-Kit für Figma |
| **Typografie** | Schriftgrößen und -gewichte für Hierarchie; im Minimalismus trägt fast alles die Schrift | „Practical Typography“ (Butterick) |
| **Farbe & Kontrast** | Graustufen-Paletten mit *einer* Akzentfarbe (hier Orange) | Refactoring UI (Kapitel Farbe) |
| **Spacing & Grids** | Gleichmäßige Abstände (4er/8er-Raster) | Refactoring UI |
| **Mobile Patterns** | Safe Areas, Daumenzonen, Gesten, Tab-Bars | Apple **Human Interface Guidelines** |
| **Motion Design** | Kleine Animationen, die sich „teuer“ anfühlen (Auf- und Zuklappen, Abhaken) | Reanimated-Docs, Rauno Freiberg („Invisible Details“) |
| **Haptik & Microinteractions** | Das Gefühl beim Abhaken | Apple HIG → Playing haptics |
| **Dark Mode** | Zweite Palette, die gleich gut aussieht | Apple HIG → Dark Mode |
| **App-Icon & Branding** | Icon, Splashscreen, Name | Figma, App Icon Template |

### 2. Entwicklung
| Skill | Wofür |
| --- | --- |
| **JavaScript / TypeScript** | Die Sprache der App |
| **React** (Komponenten, State, Hooks) | Grundlage für alles in der UI |
| **React Native + Expo** | Eine Codebasis für iPhone und Android |
| **Expo Router** | Navigation zwischen Planer, Training und Essen |
| **Flexbox-Layout** | So werden alle Screens gebaut |
| **Reanimated + Gesture Handler** | Flüssige Animationen und Swipe-Gesten |
| **Lokale Datenbank** (SQLite / `expo-sqlite`) | Mehr Daten (Workouts, Mahlzeiten) sauber speichern |
| **Datenmodellierung** | Wie Workouts, Übungen, Sätze und Mahlzeiten zusammenhängen |
| **Git & GitHub** | Versionen sichern, Änderungen nachvollziehen |

### 3. Features
| Feature | Was du brauchst |
| --- | --- |
| **Trainingspläne** | Datenmodell (Plan → Tag → Übung → Satz/Wdh./Gewicht), Drag & Drop zum Sortieren, Timer (Pausen), Diagramme für Fortschritt |
| **Food-Tracking** | Lebensmittel-Datenbank (z. B. **Open Food Facts**, kostenlos), Barcode-Scanner (`expo-camera`), Kalorien- und Makro-Rechnung |
| **Life-Tracking / Habits** | Erledigt: Habits mit Wochenraster und Serie. Als Nächstes: Heatmap übers Jahr, Wochenstatistik, Reihenfolge ändern |
| **Diagramme** | `victory-native` oder `react-native-svg`, schlicht im gleichen Graustufen-Stil |
| **Benachrichtigungen** | `expo-notifications` (Erinnerungen fürs Training oder Wasser) |
| **Apple Health** | Schritte und Workouts importieren (braucht einen Development Build) |
| **Sync & Login** (später) | Backend wie Supabase oder Firebase, wenn Daten aufs Zweitgerät sollen |

### 4. Veröffentlichen
| Skill | Wofür |
| --- | --- |
| **EAS Build & Submit** | App in der Cloud bauen, kein Mac nötig |
| **TestFlight** | Auf dem eigenen iPhone testen, wie in deinem Screenshot |
| **Apple Developer Account** (99 €/Jahr) | Pflicht für TestFlight und den App Store |
| **App Store Connect** | Screenshots, Beschreibung, Datenschutzangaben |

## Nächste Schritte

1. **Startseite anpassen** wie in Notion: Bänder ein- und ausblenden, Reihenfolge ändern
2. **Training**: Pläne anlegen, Übungen per Drag & Drop sortieren, im Workout Sätze abhaken (gleiche Checkbox wie im Planer)
3. **Essen**: Mahlzeiten pro Tag, Suche via Open Food Facts, Barcode-Scan, Tagesziel als dünner Balken
4. **Reanimated** (schon installiert) für weichere Animationen und Swipe zwischen Wochen
5. **Dark Mode**: Palette von fast Schwarz zu Dunkelgrau
6. **SQLite** statt AsyncStorage, sobald die Datenmenge wächst
7. **EAS Build → TestFlight** fürs iPhone, **GitHub Pages / Vercel** für eine PC-Version ohne Installation
