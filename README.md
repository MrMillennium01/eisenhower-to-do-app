# Eisenhower To Do App

Eine Web-App für Prioritäten, Tagesplanung und Projektfortschritt, vorbereitet für eine spätere App mit React Native. Aufgaben erscheinen als verschiebbare Bausteine. Jede Aufgabe wird nur einmal gespeichert: Änderungen sind in allen Ansichten sichtbar.

**Stand:** Schritt 1, Entwurf 03: klickbares Bedienkonzept mit bearbeitbarem Projektgraphen und durchgehender, vollbreiter To-do-Liste. Die eigentliche React-App mit Anmeldung und Datenbank folgt erst nach dem Review. Die Weckerfunktion bleibt der späteren nativen App vorbehalten.

### Bedienkonzept ausprobieren

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Anschließend [die lokale Vorschau](http://127.0.0.1:4173) öffnen. Voraussetzung: Node.js ab Version 22 und Corepack. Ohne Paketinstallation lässt sich die Vorschau auch direkt mit `node prototype/server.mjs` starten.

**Zum Review:** Über das Plus bei „Meine Projekte“ oder „Neues Projekt“ ein Projekt mit Namen und eigenem Bild anlegen. Ein To-do einem Projekt zuordnen und im Popup mehrere Vorgänger/Nachfolger auswählen. Im Graphen Knoten ziehen, seitliche Verbindungspunkte ziehen oder nacheinander anklicken, am Knoten-Plus einen Folgeschritt ergänzen und „Autoformatieren“ ausprobieren. Im Arbeitsbereich zwischen Spalten und echten To-do-Zeilen wechseln und in beide Richtungen weiterscrollen. Unter „Entwurf 03“ stehen die Review-Fragen.

Der separate Prototyp unter `prototype/` verwendet HTML, CSS und JavaScript ohne Browser-Laufzeitabhängigkeiten. Er ersetzt nicht die geplante React-/React-Native-Architektur. Alle Inhalte sind Beispieldaten; Änderungen und eigene Projektbilder bleiben nur bis zum Neuladen erhalten. Bilder werden ausschließlich lokal verarbeitet (PNG/JPG/WebP, maximal 5 MB). Anmeldung, dauerhafte Speicherung, Verschieben zwischen Tagen und Outlook-Synchronisierung sind noch nicht umgesetzt.

Prüfung: `corepack pnpm test` für die Modelltests und `corepack pnpm test:ui` für die Browserabläufe. Der folgende Plan beschreibt weiterhin die vollständige spätere App.

## 1. Ansichten und Bedienung

| Ansicht | Geplantes Verhalten |
| --- | --- |
| **Dein Arbeitsbereich / Homepage** | „Ohne Termin“ steht oberhalb der nächsten Tage. **Horizontal:** eine Spalte pro Tag, kontinuierlich in beide Richtungen scrollen, ohne Wochenwechsel. **Vertikal:** eine durchgehende Liste über die gesamte verfügbare Breite, mit dem Datum als Zwischenüberschrift und einer kompakten Zeile je To-do, ohne eingerahmte Tageskarten. Weitere Tage folgen beim Scrollen. Sortieren und Verschieben auf andere Tage folgen in der produktiven App. |
| **Projekte** | Projekte über das Plus in der Sidebar oder in der Projektübersicht mit Namen und eigenem Bild anlegen. Keine Prozentwerte oder Fortschrittsbalken. Ein Projekt öffnet seinen Graphen mit mehreren Startpunkten, Verzweigungen und zusammenlaufenden Pfaden. Knoten sind frei verschiebbar, Pfeile bewegen sich mit. „Autoformatieren“ ändert ausschließlich die Anordnung, fügt keine Verbindungen hinzu und entfernt keine. Noch aktive Zieh-/Zeichengesten werden vorher abgebrochen. |
| **Kalender** | Monatsübersicht mit Fälligkeiten und denselben Aufgabendetails. Fließender Wechsel zur Tagesplanung: ausgewähltes Datum, Terminbezug und Projektfilter bleiben erhalten. |

**Die Eisenhower-Matrix befindet sich im Dialog des einzelnen To-dos.** Der Ablauf:

1. **Erstellen:** „Neues To-do“ öffnet eine Lightbox mit Titel, Beschreibung, Projekt, Terminen und einer Eisenhower-Matrix.
2. **Einordnen:** In der Matrix wird die Markierung dieses To-dos verschoben. X = Dringlichkeit, nach rechts zunehmend; Y = Wichtigkeit, nach oben zunehmend. Beide Werte reichen von 0–100. Die vier Quadranten stehen für sofort erledigen, einplanen, delegieren und zurückstellen.
3. **Später ändern:** Ein Klick auf das To-do in jeder Ansicht öffnet denselben Dialog mit seiner bisherigen Position. Verschieben und Speichern aktualisiert die Priorität überall; Abbrechen verwirft die Änderung.

Die Zuordnung ist auch per Tastatur und Werteingabe möglich. Projektblöcke verwenden für ihre eigene Priorität denselben Editor in den Projektdetails. Auf kleinen Bildschirmen kann der Dialog den ganzen Bildschirm einnehmen.

**Einordnung im Projektgraphen:** Bei der Projektwahl öffnet sich ein Popup mit dem vorhandenen Graphen. Dort lassen sich mehrere Vorgänger und Nachfolger markieren oder ein eigener Startpunkt wählen. Das Plus am Knoten legt direkt einen Folgeschritt mit diesem Vorgänger an. Weitere Pfeile entstehen direkt zwischen den seitlichen Verbindungspunkten, ohne den To-do-Dialog zu öffnen; ausgewählte Verbindungen können wieder entfernt werden. Es gibt keine Beschränkung auf einen Parent oder ein Child. Dialogänderungen einschließlich der Verbindungen werden erst beim Speichern des To-dos übernommen; Abbrechen verwirft den gesamten Entwurf.

**Terminlogik:** Arbeitstag (`plannedDate`) und Fälligkeit (`dueDate`) sind getrennt. Tagesplanung und Kalender starten standardmäßig mit „Geplant“ beziehungsweise „Fällig“; beide erlauben den Wechsel des Terminbezugs. Verschieben ändert ausschließlich den angezeigten Termintyp. Aufgaben ohne Datum bleiben über „Ohne Termin“ erreichbar.

## 2. Technik mit Blick auf React Native

| Baustein | Vorschlag | Warum |
| --- | --- | --- |
| Gemeinsame Basis | **TypeScript und pnpm Workspaces** | Web-App, spätere native App und gemeinsame Pakete in einem Repository. |
| Web-Oberfläche | **React, Vite, HTML/CSS, Tailwind CSS und shadcn/ui** | Interaktive Browseroberfläche mit anpassbaren Dialogen und Formularen. |
| Spätere native App | **React Native, Expo und Expo Router** | Native Oberfläche und Navigation für Android/iOS, angebunden an dieselben Daten und Fachregeln. |
| Gemeinsame Logik | **Zod, date-fns und TanStack Query** | Wiederverwendbare Validierung, Datumslogik und Daten-Hooks für beide Plattformen. |
| Verschieben im Web | **dnd-kit** | Prioritätsmarkierung in der Lightbox und Sortierung in der Tagesplanung. |
| Projektgraph im Web | **React Flow** (`@xyflow/react`) und **Dagre** | Bearbeitbare Knoten und Verbindungen; Dagres Layoutberechnung lässt sich auch nativ nutzen. |
| Kalender im Web | **FullCalendar React** mit freien Monats-/Interaktionsmodulen | Monatsübersicht und Terminbearbeitung. |
| Speicherung und Anmeldung | **Supabase mit PostgreSQL, Auth, Storage und SQL** | Dauerhafte Speicherung; Datenbankregeln (Row Level Security) schützen Aufgaben und Projekte. Eigene Bilder liegen später in privatem Storage mit kontrolliertem Zugriff. |
| Betrieb und Prüfung | **Vercel + Supabase**, **Vitest + Playwright** | Hosting sowie Tests für Fachlogik und zentrale Bedienabläufe. |

Vorgesehen ist ein persönlicher Arbeitsbereich mit Anmeldung, auch für mehrere Geräte. Supabase übernimmt das Backend für Web und Mobile.

React und React Native teilen Komponentenprinzip und Hooks. Browserkomponenten wie shadcn/ui, dnd-kit, React Flow und FullCalendar benötigen jedoch eigene native Gegenstücke. Deshalb bleiben sie in der Web-App gekapselt; Datentypen, Fachregeln, Datenzugriff und geeignete Hooks werden von Anfang an gemeinsam nutzbar.

## 3. Gemeinsames Datenmodell

| Objekt | Wesentliche Angaben |
| --- | --- |
| **Projekt** | ID, Besitzer, Name, Beschreibung, Farbe, optionaler Verweis auf ein eigenes Bild und eigene Wichtigkeit/Dringlichkeit; unabhängig von den Prioritäten seiner Aufgaben. |
| **Aufgabe** | ID, Besitzer, optionales Projekt, Titel, Beschreibung, Status (`offen`, `in Arbeit`, `erledigt`), Wichtigkeit und Dringlichkeit (0–100), `plannedDate`, `dueDate`, Sortierposition, Kennzeichen „optional“ und Position im Projektgraphen. |
| **Abhängigkeit** | Vorgänger → Nachfolger innerhalb eines Projekts; Verbindung als verbindliche Voraussetzung oder Empfehlung. |

Selbstverbindungen, doppelte Pfeile, projektübergreifende Verbindungen und Kreise werden verhindert. Ein Schritt wird verfügbar, sobald seine verbindlichen Voraussetzungen erledigt sind. Verbindungen von optionalen Schritten zu Pflichtaufgaben sind Empfehlungen und blockieren den Pflichtpfad nicht. Der Aufgabenstatus bleibt sichtbar, wird aber nicht zu einem vermeintlichen Projektfortschritt in Prozent zusammengezählt.

Arbeitstage und Fälligkeiten sind zunächst reine Kalenderdaten. Die manuell gesetzte Priorität bleibt unabhängig von diesen Terminen.

## 4. Wie die Komponenten zusammenarbeiten

```text
Tagesplanung / Projektgraph / Kalender
                 ↓ Aufgabe öffnen
Aufgabendialog mit Eisenhower-Matrix
                 ↓ speichern
Gemeinsame Fachlogik → Datenzugriff / TanStack Query → Supabase
```

Geplante Repository-Struktur:

```text
apps/
  web/              React/Vite, Ansichten und Browserkomponenten
  mobile/           später: React Native/Expo, native Ansichten
packages/
  domain/           Datentypen, Validierung, Prioritäts- und Abhängigkeitsregeln
  data/             Supabase-Zugriff und gemeinsame Daten-Hooks
  integrations/     später: Schnittstellen für Kalender- und Mailanbieter
  design-tokens/    Farben, Abstände und weitere Gestaltungswerte
supabase/
  migrations/       Datenmodell und Zugriffsregeln
```

Die gemeinsame Fachlogik hängt weder vom Browser noch von React Native ab. Speicherung von Login-Sitzungen, App-Lebenszyklus und Navigation werden je Plattform angebunden. Verbindliche Datenregeln werden zusätzlich im Backend geprüft.

Die mobile App verwendet später dieselben Aufgaben und Regeln. Ihre Prioritätsmatrix erhält native Gesten, etwa über React Native Gesture Handler; Projektgraph und Kalender erhalten passende native Darstellungen.

## 5. Wecker als spätere native Erweiterung

Für die Web-Version entfallen Wecker, Web Push und serverseitige Alarmjobs vollständig.

In der nativen App werden Erinnerungen pro Aufgabe mit Zeitpunkt, Zeitzone, Ton, Stoppen und Schlummern ergänzt. Die Zeitplanung erfolgt lokal über das Betriebssystem. Erledigen oder Ändern einer Aufgabe muss zugehörige geplante Erinnerungen auf dem Gerät aktualisieren.

[Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) bietet einen Einstieg für lokale Erinnerungen. Ein anhaltender Wecker benötigt je nach Betriebssystem zusätzliche native Alarmfunktionen und Berechtigungen. Dafür werden Expo Development Builds und bei Bedarf eigene native Module eingeplant. Das Verhalten bei gesperrtem Gerät, Energiesparen und Neustarts wird auf echten Geräten geprüft.

## 6. Spätere Outlook-Anbindung

Die Kalenderansicht bleibt von externen Anbietern unabhängig. Geplant ist eine `CalendarProvider`-Schnittstelle zum Lesen von Änderungen sowie zum Anlegen, Aktualisieren und Entfernen ausdrücklich synchronisierter Termine. Ein späterer Microsoft-Graph-Adapter bindet Outlook an; der Prototyp stellt noch keine Verbindung her.

- **Freigabe und Datenschutz:** Microsoft-Anmeldung über OAuth mit PKCE und nur den nötigen delegierten Berechtigungen. Kalender- und Mailzugriff werden getrennt freigegeben. Tokens werden sicher serverseitig verwaltet, nicht im gemeinsamen UI-Code oder in Logs.
- **Synchronisierung:** Aufgaben-/Termin-Zuordnung mit externer Kalender- und Ereignis-ID, Änderungsstand und Sync-Cursor. Delta-Abfragen, erneuerbare Webhooks, Wiederholungsversuche und Konfliktregeln verhindern Doppelanlagen und unbemerkte Überschreibungen. Zeitzonen, ganztägige Fälligkeiten, Serien und Löschungen benötigen eigene Regeln.
- **Outlook-Mail:** Optional später ein ausgewähltes Mail-Element in ein To-do übernehmen. Das ist ein eigener Adapter und kein notwendiger Bestandteil der Kalendersynchronisierung.
- **Vor der Umsetzung festlegen:** Welche Termine synchronisiert werden, ob der Abgleich ein- oder beidseitig läuft und wie Konflikte beziehungsweise Löschungen bestätigt werden. Keine automatischen Änderungen an Outlook ohne aktivierte Verknüpfung.

Technische Grundlage: [Microsoft Graph für Outlook-Änderungen](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview) und [inkrementeller Kalenderabgleich](https://learn.microsoft.com/en-us/graph/delta-query-events).

## 7. Vorgehen in überschaubaren Schritten

1. **Bedienkonzept:** Ansichten und To-do-Lightbox skizzieren; Erstellen, Priorisieren und erneutes Öffnen durchspielen.
2. **Grundlage:** Workspace mit Web-App und gemeinsamen Paketen, Anmeldung und Datenbank aufsetzen; Aufgaben und Projekte anlegen.
3. **Erste nutzbare Version:** Aufgabendialog mit Eisenhower-Matrix und fortlaufendem Arbeitsbereich in beiden Ausrichtungen, inklusive Sortieren und Speichern. „Ohne Termin“ bleibt oben.
4. **Kalender:** Monatsübersicht, Terminbearbeitung und Wechsel zur Tagesplanung.
5. **Projektbäume:** Projekte mit eigenen Bildern, Einordnungsdialog, frei verschiebbare Knoten, viele ein-/ausgehende Verbindungen, Knoten-Plus und Autoformatierung; Voraussetzungen und optionale Schritte ohne Fortschrittsbalken.
6. **Web-Version prüfen und bereitstellen:** Prioritätsänderungen in allen Ansichten, Dialog-Speichern/Abbrechen, Abhängigkeiten, Termine, Zugriffsregeln und Bedienung auf kleinen Bildschirmen testen; anschließend veröffentlichen.
7. **Spätere mobile Erweiterung:** Expo-App an gemeinsame Pakete anbinden, native Ansichten umsetzen und Weckerfunktion mit Betriebssystem-Anbindung entwickeln.
8. **Optionale Outlook-Integration:** Den Anbieter-Adapter nach Festlegung der Sync-Regeln ergänzen; Kalender zuerst, Mail-Übernahme separat.

Nach Schritt 3 steht die erste nutzbare Web-Version; nach Schritt 6 sind die Web-Funktionen vollständig. React Native und Wecker bilden den anschließenden Ausbau.
