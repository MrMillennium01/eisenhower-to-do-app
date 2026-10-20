# Eisenhower To Do App

Eine Web-App für Prioritäten, Tagesplanung und Projektfortschritt. Aufgaben erscheinen als verschiebbare Bausteine. Jede Aufgabe wird nur einmal gespeichert: Änderungen sind in allen Ansichten sichtbar.

**Stand:** Konzept zur Abstimmung; die App ist noch nicht implementiert.

## 1. Die Ansichten

| Ansicht | Geplantes Verhalten |
| --- | --- |
| **Eisenhower-Matrix** | X-Achse = Dringlichkeit, Y-Achse = Wichtigkeit. Verschiebbare Karten in vier Quadranten: sofort erledigen, einplanen, delegieren oder zurückstellen. Umschalten zwischen Aufgaben und Projektblöcken; ein Projektblock öffnet seine Aufgaben und seinen Progressionsbaum. |
| **Demnächst / Nächste Schritte** | Aufgaben nach Arbeitstag mit Wochentag und Datum, etwa „Mittwoch, 21.10.“. **Horizontal:** eine Spalte pro Tag, seitwärts scrollen. **Vertikal:** ein Abschnitt pro Tag, eine Zeile pro Aufgabe, nach unten scrollen. Aufgaben innerhalb eines Tages sortieren oder auf andere Tage ziehen. |
| **Projekte** | Bearbeitbarer Progressionsbaum wie in einem Spiel: mehrere Startpunkte, Verzweigungen und zusammenlaufende Pfade. Aufgaben sind Knoten, Abhängigkeiten sind Verbindungen. Erledigte, verfügbare, blockierte und optionale Schritte sind erkennbar. |
| **Kalender** | Monatsübersicht mit Fälligkeiten und denselben Aufgabendetails. Fließender Wechsel zur Tagesplanung: ausgewähltes Datum, Terminbezug und Projektfilter bleiben erhalten. |

Alle Ansichten verwenden einen gemeinsamen Aufgabendialog. Die Oberfläche wird responsiv; auf kleinen Bildschirmen steht die vertikale Tagesplanung im Vordergrund.

**Terminlogik:** Arbeitstag (`plannedDate`), Fälligkeit (`dueDate`) und Alarmzeitpunkt (`remindAt`) sind getrennt. Tagesplanung und Kalender starten standardmäßig mit „Geplant“ beziehungsweise „Fällig“; beide erlauben den Wechsel des Terminbezugs. Verschieben ändert ausschließlich den angezeigten Termintyp. Aufgaben ohne Datum bleiben über „Ohne Termin“ erreichbar.

## 2. Empfohlene Technik

| Baustein | Vorschlag | Warum |
| --- | --- | --- |
| Sprache und Web-App | **TypeScript, React und Vite** | Interaktive Oberfläche, schlankes Grundgerüst; TypeScript auch für Serverfunktionen. |
| Gestaltung | **HTML/CSS, Tailwind CSS und shadcn/ui** | Einheitliche, anpassbare Dialoge und Formulare. |
| Verschieben und Sortieren | **dnd-kit** | Drag & Drop für Matrix und Tagesplanung; zusätzlich Tastatur- und Formularbedienung. |
| Projektgraph | **React Flow** (`@xyflow/react`) und **Dagre** | Knoten und Verbindungen bearbeiten, bei Bedarf automatisch anordnen. |
| Kalender und Datum | **FullCalendar React** mit freien Monats-/Interaktionsmodulen; **date-fns** | Monatsansicht, deutsche Datumsformatierung und Datumsberechnungen. |
| Speicherung und Anmeldung | **Supabase mit PostgreSQL, Auth und SQL** | Dauerhafte Speicherung; Datenbankregeln (Row Level Security) schützen die eigenen Daten. |
| Datenabgleich | **TanStack Query** | Gemeinsamer Daten-Cache und Aktualisierung aller Ansichten. |
| Erinnerungen | **Web Audio, Web Push, Service Worker, Supabase Cron und Edge Functions** | Ton in der aktiven App; serverseitig geplante Push-Benachrichtigungen. |
| Betrieb und Prüfung | **Vercel + Supabase**, **Vitest + Playwright** | Hosting sowie Tests für Fachlogik und zentrale Bedienabläufe. |

Vorgesehen ist ein persönlicher Arbeitsbereich mit Anmeldung, auch für mehrere Geräte. Supabase übernimmt das Backend; ein zusätzlicher API-Server ist zunächst nicht erforderlich.

## 3. Gemeinsames Datenmodell

| Objekt | Wesentliche Angaben |
| --- | --- |
| **Projekt** | ID, Besitzer, Name, Beschreibung, Farbe und eigene Wichtigkeit/Dringlichkeit; unabhängig von den Prioritäten seiner Aufgaben. |
| **Aufgabe** | ID, Besitzer, optionales Projekt, Titel, Beschreibung, Status (`offen`, `in Arbeit`, `erledigt`), Wichtigkeit und Dringlichkeit (0–100), `plannedDate`, `dueDate`, Sortierposition, Kennzeichen „optional“ und Position im Projektgraphen. |
| **Abhängigkeit** | Vorgänger → Nachfolger innerhalb eines Projekts; Verbindung als verbindliche Voraussetzung oder Empfehlung. |
| **Erinnerung** | Aufgabe, Zeitpunkt, Zeitzone, Ton, Lautstärke, Zustand und Schlummerzeit; mehrere Erinnerungen pro Aufgabe möglich. |
| **Push-Abonnement** | Benutzer, Browser/Gerät und Zustellinformationen. |

Kreisförmige Abhängigkeiten werden verhindert. Ein Schritt wird verfügbar, sobald seine verbindlichen Voraussetzungen erledigt sind. Optionale Schritte blockieren keine Pflichtaufgabe. Der Fortschritt berechnet sich als erledigte Pflichtaufgaben / alle Pflichtaufgaben.

Arbeitstage und Fälligkeiten sind zunächst reine Kalenderdaten. Alarmzeitpunkte werden in UTC mit zugehöriger Zeitzone gespeichert.

## 4. Wie die Komponenten zusammenarbeiten

```text
React-Oberfläche
├── Eisenhower-Matrix
├── Tagesplanung: Spalten oder Liste
├── Projektgraph
└── Monatskalender
          │
          ▼
Gemeinsame Aufgabenkarten und Aufgabendialog
          │
          ▼
Fachlogik + TanStack Query
          │
          ▼
Supabase: Anmeldung, Datenzugriff, PostgreSQL
          │
          └── Cron → Edge Function → Web Push → Service Worker → Benachrichtigung

Aktive Web-App: Erinnerungsdienst → Web Audio → Alarmdialog mit Stoppen/Schlummern
```

Die Ansichten bearbeiten dieselben Daten über gemeinsame Funktionen. Fachregeln liegen zentral; verbindliche Datenregeln werden zusätzlich im Backend geprüft.

Geplante Aufteilung: `src/features/` für Ansichten, `src/components/` für gemeinsame Bedienelemente, `src/domain/` für Fachregeln, `src/services/` für Datenzugriff und Erinnerungsdienst, `supabase/` für Migrationen und Serverfunktionen.

## 5. Erinnerungen und die Grenze eines Web-Weckers

Pro Aufgabe Datum, Uhrzeit und Ton wählen, testen und aktivieren. Die aktive App zeigt zur Erinnerungszeit einen Alarmdialog und spielt den Ton bis zum Stoppen oder Schlummern ab. Erledigen deaktiviert offene Erinnerungen.

**Ein lauter, pünktlicher Wecker ist als reine Web-App nicht unter allen Bedingungen garantierbar.** Ton benötigt zunächst eine Nutzerinteraktion. Browser können Hintergrund-Tabs anhalten; Geräteschlaf, Stummschaltung und Systemlautstärke begrenzen die Wiedergabe.

Ein Serverjob prüft beispielsweise jede Minute fällige Erinnerungen und sendet nach Einwilligung Web Push. Zustellstatus, Deduplizierung und Wiederholungsversuche behandeln Zustellfehler. Push kann verspätet eintreffen; ein eigener lauter Ton bei geschlossenem Browser oder gesperrtem Gerät ist nicht zuverlässig steuerbar. Auch eine installierte Progressive Web App (PWA) hebt diese Grenzen nicht auf.

Das wird früh auf den Zielgeräten erprobt. Ist ein Wecker bei geschlossener App zwingend, braucht es zusätzlich eine native App mit Betriebssystem-Alarmfunktionen.

Technische Grundlagen: [Audio-Freigabe im Browser](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

## 6. Vorgehen in überschaubaren Schritten

1. **Konzept und Alarm-Prototyp:** Ansichten skizzieren; Tonfreigabe, Hintergrundverhalten und Push auf den Zielgeräten erproben.
2. **Grundlage:** React-Projekt, Anmeldung und Datenbank aufsetzen; Aufgaben, Projekte und gemeinsamen Aufgabendialog bauen.
3. **Erste nutzbare Version:** Matrix und Tagesplanung in beiden Ausrichtungen, inklusive Verschieben, Sortieren und Speichern.
4. **Kalender:** Monatsübersicht, Terminbearbeitung und Wechsel zur Tagesplanung.
5. **Projektbäume:** Bearbeitbare Knoten/Verbindungen, Voraussetzungen, optionale Schritte und Fortschritt.
6. **Erinnerungen:** Tonwahl, Stoppen, Schlummern, Push-Zustellung und Umgang mit verpassten Erinnerungen integrieren.
7. **Prüfen und bereitstellen:** Ansichtenübergreifende Änderungen, Abhängigkeiten, Zeitzonen, Zugriffsregeln und mobile Bedienung testen; anschließend veröffentlichen.

Nach Schritt 3 steht die erste nutzbare Version; bis Schritt 7 folgen alle beschriebenen Kernfunktionen.

**Für die Abstimmung:** Passt die Trennung zwischen Projekten und Aufgaben? Sollen Prioritäten zunächst manuell gesetzt werden? Auf welchen Geräten soll der Wecker funktionieren, und reicht dort die beschriebene Web-Lösung?
