# Agenten-README: Eisenhower To Do App

Diese Datei ist die eigenständige Projektübergabe für einen neuen KI-Agenten. Sie fasst den tatsächlichen Stand, die abgestimmten Anforderungen und die noch ausstehende Arbeit zusammen. Die frühere Unterhaltung ist zum Einstieg nicht erforderlich. Die [README](README.md) enthält ergänzend den nutzerorientierten Produkt- und Architekturplan.

## 1. Schnellüberblick und aktueller Auftrag

| Punkt | Stand |
| --- | --- |
| Produkt | Persönliche To-do- und Projektplanung mit mehreren Ansichten auf dieselben Aufgaben; später auch als native App. |
| Arbeitstitel der Oberfläche | `fokus`. Das ist der bisherige Gestaltungsvorschlag, kein festgelegtes Produktbranding. |
| Entwicklungsphase | **Schritt 1, Entwurf 03: interaktiver Prototyp**, keine fertige Produktions-App. |
| Benutzerfeedback | Der Benutzer hat Entwurf 03 positiv bewertet und möchte auf einem anderen PC weiterarbeiten. |
| Repository | `https://github.com/MrMillennium01/eisenhower-to-do-app.git` |
| Arbeitsbranch | `prototype/step-1-review`. Nicht voraussetzen, dass `main` denselben Stand enthält. |
| Referenz für den geprüften App-Stand | `1a71826` – vollbreite Liste und Autoformatierung ohne Änderung der Verbindungen. Dieser Implementierungsstand wurde auf den Reviewbranch gepusht. |
| Speicherung | Nur im Speicher des jeweiligen Browserdokuments. Neuladen setzt Aufgaben, Projekte, Verbindungen, Positionen und eigene Bilder zurück. |
| Backend / Datenbank / Anmeldung | Noch nicht vorhanden. |
| Hosting | Bisher nur ein lokaler Vorschau-Server. Kein produktives Deployment eingerichtet. |
| Freigabe für weitere Umsetzung | **Nicht automatisch aus dieser Roadmap ableiten.** Zuletzt wurden die Übergabedokumentation und der Wechsel auf einen anderen PC gewünscht, keine Hosting- oder Datenbankeinrichtung. |

**Wichtiger offener Punkt:** Der Benutzer hat gefragt, ob sein PC später Webserver und Datenbank betreiben könnte. Das ist grundsätzlich möglich, aber noch keine beschlossene Betriebsarchitektur. Vor Umsetzung klären: eigener PC oder Hosting-Dienst, lokaler oder externer Zugriff, Verfügbarkeit, Absicherung und Backups. Keine Cloudprojekte, Datenbanken oder öffentlichen Portfreigaben ohne neuen Auftrag einrichten.

## 2. Anforderungen und bereits nutzbare Funktionen

Alles in diesem Abschnitt funktioniert im Prototyp, soweit nicht ausdrücklich als später markiert. „Speichern“ bedeutet derzeit ausschließlich Übernahme in den gemeinsamen Browserzustand, nicht Speicherung auf Festplatte oder einem Server.

### 2.1 Gemeinsame To-dos und Eisenhower-Matrix

- Ein To-do wird nur einmal gehalten und erscheint je nach Kontext im Arbeitsbereich, Projektgraphen und Kalender.
- Erstellen und Anklicken öffnen denselben To-do-Dialog mit Titel, Notizen, Projekt, Arbeitstag, Fälligkeit, Status, optionalem Schritt und Priorität.
- **Die Eisenhower-Matrix gehört in die Lightbox des einzelnen To-dos.** Keine globale Matrix mit allen Aufgaben daraus machen.
- X-Achse: Dringlichkeit, nach rechts zunehmend. Y-Achse: Wichtigkeit, nach oben zunehmend. Beide Werte sind ganze Zahlen von 0 bis 100.
- Der Punkt lässt sich anklicken, ziehen, mit Pfeiltasten bewegen oder über Zahlenfelder setzen.
- Quadranten: „Jetzt erledigen“, „Einplanen“, „Delegieren“, „Zurückstellen“; ab 50 gilt die jeweilige Dimension als hoch.
- Speichern aktualisiert alle Ansichten. Erneutes Öffnen zeigt die gespeicherten Werte.
- Abbrechen, Escape oder Schließen über den Hintergrund verwirft den Dialogentwurf. Der Fokus kehrt zum Auslöser zurück; Tab bleibt im offenen Dialog.
- Die Priorität ist manuell und unabhängig von Terminen. Eine überfällige Aufgabe bekommt nicht automatisch neue Matrixwerte.

### 2.2 Homepage: „Dein Arbeitsbereich“

- Diese Ansicht hieß früher „Demnächst“. Der vom Benutzer gewünschte aktuelle Name ist **„Dein Arbeitsbereich“**.
- **„Ohne Termin“ steht oberhalb der datierten Aufgaben**, in beiden Darstellungen.
- **Spalten:** ein Tag pro Spalte, horizontal fortlaufend in beide Richtungen scrollen.
- **Liste:** durchgehend über die gesamte verfügbare Breite. Ein Datum als Zwischenüberschrift, darunter jedes To-do als eine kompakte Zeile, dann das nächste Datum.
- **Keine eingerahmten oder abgerundeten Tageskarten in der Liste.** Auch auf großen Monitoren darf sie nicht auf Spaltenbreite zusammenschrumpfen.
- Weitere Tage werden beim Scrollen ergänzt; es gibt keine erzwungenen Wochenwechsel. Beim Voranstellen älterer Tage bleibt die sichtbare Position erhalten.
- Projektfilter und Terminbezug sind umschaltbar; „Zu heute“ kehrt zum aktuellen Tag zurück.
- Aufgaben können angelegt, geöffnet und abgehakt werden. Erledigte Aufgaben werden innerhalb eines Tages hinter die offenen gestellt.
- Manuelles Sortieren und Drag-and-drop zwischen Tagen sind **noch nicht umgesetzt**.

### 2.3 Zwei getrennte Termintypen

- `plannedDate`: geplanter Arbeitstag.
- `dueDate`: Fälligkeit / feste Frist.
- Beide sind reine Kalenderdaten, keine Uhrzeiten oder Alarmzeitpunkte. Ein fehlendes Datum wird als leerer String dargestellt.
- Der Arbeitsbereich startet mit dem Arbeitstag; der Kalender beim ersten Öffnen mit der Fälligkeit. Der ausgewählte Terminbezug kann geändert werden.
- „Ohne Termin“ bezieht sich auf den gerade angezeigten Termintyp.
- Anlegen über das Plus eines Tages muss das Datum in den gewählten Termintyp übernehmen. Ein Plus in einer Fälligkeitsspalte darf nicht versehentlich nur den Arbeitstag setzen.
- Filter- und Ansichtswechsel verändern die gespeicherten Termine nicht.
- Späteres Verschieben zwischen Tagen soll nur den gewählten Termintyp ändern.

### 2.4 Projekte und eigene Bilder

- Projekte lassen sich über das Plus bei „Meine Projekte“ in der Sidebar sowie über die Projektansicht anlegen.
- Projektdialog: Name, optionale Beschreibung, Farbe und optionales eigenes Bild. Bestehende Projekte lassen sich bearbeiten.
- Bilder werden lokal gewählt; keine externen Bilddienste oder vordefinierten Stockbilder voraussetzen. Ohne eigenes Bild werden Initialen angezeigt.
- Aktuell unterstützt: PNG, JPG und WebP bis 5 MB; Dateisignatur, Dekodierung und Bildgröße werden geprüft. Bilder mit mehr als 32 Millionen Pixeln werden abgelehnt.
- Bilder bleiben als Blob-URLs im Browser. Kein Upload, keine Dateiablage im Repository und keine dauerhafte Bildspeicherung.
- **Keine Projektfortschrittsbalken oder Prozentwerte.** Der Benutzer hält die Anzahl erledigter Aufgaben nicht für eine aussagekräftige Fortschrittsmessung. Aufgabenanzahl und einzelne Aufgabenstatus dürfen angezeigt werden.

### 2.5 Bearbeitbarer Projektgraph

- Das Projekt ist ein gerichteter Graph, nicht zwingend ein strenger Baum: mehrere Startpunkte, Verzweigungen und zusammenlaufende Pfade.
- Knoten sind To-dos. Es können mehrere Pfeile hinein- und hinausführen, beispielsweise drei Vorgänger und drei Nachfolger.
- Bei der Projektzuordnung eines To-dos öffnet sich ein **Einordnungs-Popup mit dem vorhandenen Graphen**. Dort werden Vorgänger und Nachfolger markiert oder ein eigener Startpunkt gewählt.
- Auch bei bestehenden To-dos kann diese Einordnung geändert werden.
- Das Plus am Knoten erscheint bei Hover oder Fokus, auf Touch-Geräten ohne Hover. Es erstellt direkt einen Folgeschritt mit dem Ausgangsknoten als Vorgänger.
- Weitere Verbindungen lassen sich über seitliche Verbindungspunkte zeichnen oder durch nacheinander Anklicken anlegen, ohne den To-do-Dialog zu öffnen.
- Ausgewählte Pfeile können entfernt werden; die Aufgaben bleiben erhalten.
- Knoten sind frei verschiebbar, Pfeile wandern mit. Der Verschiebegriff unterstützt auch die Pfeiltasten.
- **„Autoformatieren“ verändert ausschließlich die Knotenpositionen und den Verlauf vorhandener Pfeile.** Keine neuen Verbindungen, keine entfernten Verbindungen, keine Änderung von Aufgabeninhalten.
- Keine Selbstverbindungen, doppelten Pfeile, projektübergreifenden Kanten oder Kreise – auch nicht über optionale Verbindungen.
- Verbindliche Voraussetzungen blockieren einen offenen Schritt, solange ein Vorgänger nicht erledigt ist. Empfehlungen blockieren nicht.
- Verbindungen von optionalen Schritten zu Pflichtaufgaben werden als Empfehlungen angelegt, damit der Pflichtpfad nicht blockiert wird.
- Sichtbare Zustände: erledigt, in Arbeit, bereit und blockiert; optionale Schritte und Empfehlungen sind unterscheidbar.
- Die Einordnung im Popup ist zunächst nur ein Entwurf. Erst Speichern des To-dos übernimmt die Verbindungen. Abbrechen darf keinen Knoten und keine Kante hinterlassen.
- Einfügen eines neuen To-dos zwischen Vorgänger und Nachfolger entfernt nicht automatisch einen bereits vorhandenen Direktpfeil zwischen diesen anderen Aufgaben.

### 2.6 Kalender

- Monatsübersicht mit denselben Aufgaben, Monatsnavigation, Projektfilter und wählbarem Terminbezug.
- Ein To-do öffnet den gemeinsamen Dialog.
- Ein Datum beziehungsweise „weitere“ Aufgaben führt zur Listenansicht des Arbeitsbereichs. Datum, Terminbezug und Projektfilter werden dabei beibehalten.
- Keine externe Kalendersynchronisierung und kein Kalender-Drag-and-drop im aktuellen Stand.

## 3. Technischer Ist-Zustand

**Nicht mit der Zielarchitektur verwechseln:** Aktuell gibt es weder React noch TypeScript, Vite, Tailwind, React Flow oder Supabase im ausführbaren Anwendungscode.

- HTML, CSS mit Cascade Layers und JavaScript-ES-Module (`.mjs`), native Dialoge, Pointer Events und SVG für den Graphen.
- Keine Browser-Laufzeitabhängigkeiten und keine externen Laufzeitanfragen.
- Node.js dient nur als kleiner statischer Vorschau-Server. Er ist kein Anwendungs-Backend und hat keine Datenbank- oder Schreib-API.
- Einzige Paketabhängigkeit: `@playwright/test` als Entwicklungsabhängigkeit. Modelltests verwenden das eingebaute `node:test`.
- Kein pnpm-Workspace und noch keine Verzeichnisse `apps/`, `packages/` oder `supabase/`.

### Dateien und Zuständigkeiten

| Datei | Aufgabe |
| --- | --- |
| [prototype/index.html](prototype/index.html) | Grundgerüst sowie To-do-, Einordnungs-, Projekt- und Review-Dialog. |
| [prototype/app.mjs](prototype/app.mjs) | Gemeinsamer In-Memory-Zustand, Rendern der Ansichten, Formulare, Scrollfenster, Matrix- und Graphinteraktionen, lokale Bilder. |
| [prototype/model.mjs](prototype/model.mjs) | Reine Prioritäts-, Datums-, Abhängigkeits- und Layoutfunktionen sowie `createDemo`. |
| [prototype/styles.css](prototype/styles.css) | Gestaltung, Liste/Spalten, Graph, Dialoge und responsive Regeln. |
| [prototype/server.mjs](prototype/server.mjs) | Statischer Server mit expliziter Asset-Freigabeliste; nur GET und HEAD. |
| [prototype/playwright.config.mjs](prototype/playwright.config.mjs) | Browserwahl, lokaler Testserver, Ansichtsgröße und Testartefakte. |
| [prototype/tests/model.test.mjs](prototype/tests/model.test.mjs) | Fachlogik, Datumsgrenzen, Prioritäten, Verbindungen und nebenwirkungsfreies Layout. |
| [prototype/tests/review.spec.mjs](prototype/tests/review.spec.mjs) | Ursprüngliche Review-Abläufe, Dialoge, Matrix, gemeinsame Daten, Servergrenzen und Touch-Ansicht. |
| [prototype/tests/iteration.spec.mjs](prototype/tests/iteration.spec.mjs) | Projektbilder, Graphbearbeitung, fortlaufende Liste, volle Breite und abgebrochene Gesten. |
| [package.json](package.json), [pnpm-lock.yaml](pnpm-lock.yaml) | Ausführbare Skripte, Node-Anforderung und festgelegte Paketversionen. |

### Aktuelle Datenobjekte

| Objekt | Tatsächliche Felder im Prototyp |
| --- | --- |
| Projekt | `id`, `name`, `description`, `tone`, `imageUrl`. |
| To-do | `id`, `title`, `description`, `projectId`, `plannedDate`, `dueDate`, `urgency`, `importance`, `status`, `optional`, optional `graph: { x, y }`. |
| Verbindung | `from`, `to`, `required`. |

`status` ist `open`, `progress` oder `done`. „Blockiert“ ist ein berechneter Anzeigezustand, kein zusätzlich gespeicherter Status. Projektzuordnung und Termine können leer sein.

`createDemo(today)` liefert unabhängige Beispieldaten relativ zum aktuellen lokalen Datum. Es gibt keine Benutzerkonten, Besitzer-IDs, Server-IDs, Sync-Metadaten oder Persistenz. Eigene Projektprioritäten und Sortierpositionen stehen im Produktplan, sind aber noch keine implementierten Projekt-/Formularfelder.

Alle Ansichten greifen auf denselben `state` in `app.mjs` zu. To-do- und Projektformulare bearbeiten Entwürfe; direkte Graphaktionen und Abhaken ändern den gemeinsamen Zustand unmittelbar. Keine zusätzliche unabhängige Aufgabenliste pro Ansicht einführen.

## 4. Start auf einem neuen PC und Prüfungen

Voraussetzungen: Git, **Node.js 22 oder neuer**, für Paketinstallation und Browserprüfungen zusätzlich Corepack. `packageManager` legt **pnpm 10.20.0** fest; kein global installiertes pnpm voraussetzen.

```sh
git clone --branch prototype/step-1-review https://github.com/MrMillennium01/eisenhower-to-do-app.git
cd eisenhower-to-do-app
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Vorschau: **http://127.0.0.1:4173**. Wenn das Repository schon vorhanden ist, zunächst Branch und ungespeicherte Änderungen prüfen, statt blind erneut zu klonen oder den Branch zu wechseln.

Nur die Vorschau benötigt keine Paketinstallation:

```sh
node prototype/server.mjs
```

Prüfungen aus dem Repository-Root:

```sh
corepack pnpm test
corepack pnpm test:ui
```

- Zuletzt erfolgreich am App-Stand `1a71826`: **15 Modelltests und 38 Browserprüfungen**. Nach Änderungen erneut prüfen; diese Zahlen sind eine Referenz, kein Ersatz für einen Testlauf.
- Unter Windows nutzt Playwright standardmäßig installiertes Microsoft Edge. `PLAYWRIGHT_CHANNEL=chrome` kann ein installiertes Chrome auswählen.
- Auf anderen Plattformen verwendet es Playwrights Chromium. Falls dieses fehlt: `corepack pnpm exec playwright install chromium`.
- Die Browserprüfungen erwarten Port 4173 und können den lokalen Server selbst starten. Ein bereits laufender Server wird außerhalb von CI wiederverwendet.
- Review-Screenshots entstehen unter `.artifacts/review/`, Testartefakte unter `.artifacts/test-results/`. Diese werden erzeugt, nicht aus Git bereitgestellt.
- Es gibt derzeit **keine** Skripte für Build, Lint oder Typecheck.
- Der Vorschau-Server bindet standardmäßig nur an `127.0.0.1`. Er stellt ausschließlich die freigegebenen Prototyp-Assets bereit, nicht `.git`, `.env` oder beliebige Repository-Dateien.
- Kein automatisches Browser-Neuladen/HMR. Nach Dateiänderungen die Seite neu laden; dadurch werden auch alle Demoänderungen zurückgesetzt.

Die bisherige Prüfung schließt Desktop und emulierte schmale Touch-Ansichten ein. Sie ist kein Nachweis für native Gerätefunktionen oder einen vollständigen Cross-Browser-/Accessibility-Audit.

## 5. Grenzen und ausdrücklich nicht implementierte Teile

- Dauerhafte Speicherung, Datenbank, Anmeldung, Rechteprüfung und produktives Backend.
- Serverbetrieb auf dem Benutzer-PC, öffentliches Hosting, Deployment und Backups.
- Produktions-App mit React/TypeScript und gemeinsame Web-/Mobile-Pakete.
- Native App für Android/iOS.
- Manuelles Sortieren der Aufgaben und Drag-and-drop zwischen Tagen.
- Vollständige Produkt-CRUD-Abläufe, etwa Löschen von To-dos oder Projekten; aktuell lassen sich Verbindungen entfernen.
- Dauerhafte Bildablage; Blob-URLs sind keine transportierbaren Speicherverweise.
- Outlook-Synchronisierung und Mail-Übernahme.
- Wecker, Web Push, Hintergrund-Alarmjobs und Service-Worker-Erinnerungen.

**Browser-Demodaten werden nicht durch einen Git-Push übertragen.** Ein zweiter PC erhält den Code und dieselben Ausgangsbeispiele, nicht die im ersten Browser erstellten Aufgaben oder Projektbilder.

## 6. Abgestimmte Zielarchitektur – erst später umsetzen

Die technische Richtung wurde mit dem Benutzer abgestimmt. Die konkrete Betriebsform ist nach seiner Frage zum eigenen PC erneut zu klären; nicht heimlich einen anderen Datenstack einsetzen.

| Baustein | Geplanter Ansatz |
| --- | --- |
| Web | TypeScript, React, Vite, Tailwind CSS, shadcn/ui. |
| Gemeinsame Basis | pnpm Workspaces; wiederverwendbare Typen, Validierung, Prioritäts-/Abhängigkeitsregeln und Datumslogik. |
| Daten und Validierung | Zod, date-fns, TanStack Query; Datenzugriff über gemeinsame Pakete. |
| Backend | Supabase mit PostgreSQL, Auth, RLS und privatem Storage für Bilder; Betrieb/Hosting noch offen. |
| Graph im Web | React Flow (`@xyflow/react`) und Dagre. |
| Tagesplanung im Web | dnd-kit für Sortierung und Terminverschiebung. |
| Kalender im Web | FullCalendar React mit passenden freien Modulen. |
| Mobile | React Native, Expo und Expo Router. |
| Produktprüfung | Vitest für Fachlogik, Playwright für Web-Abläufe; native Funktionen auf echten Geräten. |

Geplante Aufteilung:

- `apps/web`: Browseroberfläche.
- `apps/mobile`: spätere native Oberfläche.
- `packages/domain`: plattformunabhängige Typen, Validierung und Regeln.
- `packages/data`: Datenzugriff und geeignete gemeinsame Hooks.
- `packages/design-tokens`: gemeinsame Gestaltungswerte.
- `packages/integrations`: spätere Kalender-/Mailanbieter-Schnittstellen.
- `supabase/migrations`: Datenmodell und serverseitige Zugriffsregeln, falls dieser Backend-Ansatz beibehalten wird.

Browser-UI ist **nicht** automatisch React-Native-kompatibel. Dialoge, Kalender, Graph und Gesten bleiben plattformspezifisch; Fachlogik und Datenzugriff sollen geteilt werden. Das aktuelle DOM-/SVG-Prototyping nicht als bereits fertige gemeinsame Architektur behandeln.

Die produktiven Daten ergänzen unter anderem Besitzer, persistente IDs, Sortierreihenfolgen und Bildreferenzen. Verbindliche Regeln und Zugriffsschutz gehören zusätzlich ins Backend, nicht nur in UI-Validierung.

### Spätere Outlook-Integration

- Gewünscht ist eine offene Anbindung an Outlook-Kalender und gegebenenfalls Outlook-Mails.
- Vorgesehen: anbieterunabhängige `CalendarProvider`-Schnittstelle plus Microsoft-Graph-Adapter. Diese Schnittstelle ist bisher nur geplant, nicht programmiert.
- Kalenderereignisse gezielt mit Aufgaben verknüpfen; externe Kalender-/Ereignis-IDs, Änderungsstände und Sync-Cursor vorsehen.
- OAuth mit PKCE, minimale delegierte Berechtigungen, sichere serverseitige Token-Verwaltung; Kalender- und Mailzugriff getrennt freigeben.
- Delta-Abfragen, erneuerbare Webhooks, Zeitzonen, ganztägige Termine, Serien, Wiederholungsversuche und Konflikte berücksichtigen.
- Optional eine ausgewählte Mail in ein To-do übernehmen; kein pauschaler Mailbox-Sync als Voraussetzung für die Kalenderfunktion.
- Vor Umsetzung mit dem Benutzer festlegen: ein- oder beidseitiger Abgleich, welche Aufgaben/Termine teilnehmen und wie Konflikte beziehungsweise Löschungen behandelt werden.

### Spätere native Weckerfunktion

- **Keine Weckerfunktion in der Web-App.** Der Benutzer hat sie bewusst aus dem Web-Umfang entfernt.
- Erst mit React Native/Expo: lokale Erinnerungen mit Zeitpunkt, Zeitzone, Ton, Stoppen und Schlummern.
- Expo Notifications ist ein möglicher Einstieg; ein echter anhaltender Wecker kann native Module und Development Builds benötigen.
- Sperrbildschirm, Energiesparen, Neustarts und OS-Berechtigungen, insbesondere Android Exact Alarms, auf echten Geräten prüfen. Keine zuverlässigen lauten Browseralarme versprechen.

## 7. Nächste Schritte nach einem neuen Auftrag

1. **Übergabe prüfen und Betrieb klären:** aktuellen Git-Stand lesen, Prototyp starten, Anforderungen verstehen. PC-Hosting gegenüber gehostetem Dienst mit dem Benutzer entscheiden. Bis dahin keine Infrastruktur einrichten.
2. **Produktionsgrundlage:** nach Freigabe React-/TypeScript-Web-App, Workspace und plattformunabhängige Domain-Pakete aufsetzen; Datenbank, Auth, Zugriffsschutz und persistente Aufgaben/Projekte anbinden. Den Prototyp als UX-Referenz erhalten.
3. **Erste nutzbare Version:** gemeinsamer To-do-Dialog mit Matrix und fortlaufender Arbeitsbereich in beiden Darstellungen, echte Speicherung, Sortierung und Terminverschiebung.
4. **Produktiver Kalender:** Monatsansicht und Terminbearbeitung an denselben Datenbestand anbinden, Kontext beim Wechsel zum Arbeitsbereich erhalten.
5. **Produktiver Projektgraph:** Projekte/Bilder, Einordnung, viele Verbindungen, Knoten-Plus, freie Positionen, reine Autoformatierung und serverseitig geprüfte Abhängigkeiten übernehmen.
6. **Web stabilisieren und bereitstellen:** Zugriffsregeln, Fehlerfälle, Persistenz, Backups, Responsivität und Bedienbarkeit prüfen; erst mit entschiedenem Hosting veröffentlichen.
7. **Spätere Erweiterungen:** native App samt Wecker und optionale Outlook-Anbindung. Deren Reihenfolge erneut mit dem Benutzer priorisieren.

Diese Schritte beschreiben den Ausbau der produktiven App. Dass Kalender und Graph bereits im Prototyp bedienbar sind, ersetzt nicht deren spätere persistente Implementierung.

## 8. Arbeitsregeln und wichtige Regressionen

- Zuerst die reale Implementierung und `package.json` prüfen. Geplante Bibliotheken nicht als installiert voraussetzen.
- Ohne entsprechenden Auftrag keine dauerhafte Speicherung oder externen Laufzeitanfragen in den isolierten Prototyp einbauen.
- Nutzereingaben vor Einsetzen in HTML maskieren (`escapeHtml`); Formularwerte über DOM-Eigenschaften setzen. Keine unkontrollierten Bild-URLs oder ausführbaren Nutzereingaben.
- Projektbilder weiter lokal validieren; verworfene Blob-URLs freigeben und asynchrone Bildladevorgänge beim Abbrechen sauber verwerfen.
- **Dialogtransaktion:** Einordnungs-Popup und To-do-Formular dürfen vor Speichern weder Aufgaben noch Verbindungen anlegen. Projektwechsel und Abbrechen dürfen keine verwaisten Kanten hinterlassen.
- **Autoformatier-Regression:** Eine noch aktive Zeichengeste konnte nach dem Formatieren beim Loslassen einen zusätzlichen Pfeil erzeugen. `cancelGraphGesture` muss Gestenzustand und Pointer-Capture aufräumen; Escape hat dieselbe Abbruchgarantie.
- `paintGraph` aktualisiert nur Geometrie bestehender SVG-Pfade. Autoformatieren darf den Verbindungsbestand nicht neu aufbauen. Tests müssen genaue Vorgänger/Nachfolger und Verbindungsarten vergleichen, nicht nur die Anzahl.
- **Listenbreiten-Regression:** Geteilte Spaltenklassen begrenzten Listentage bei breiten Viewports auf 280 px. Listentage verwenden `.agenda-day`, Spalten `.day-column`; gemeinsame Scrolllogik identifiziert Tage über `[data-timeline-day]`.
- Keine Tageskarten, Projekt-Prozentwerte, globale Eisenhower-Matrix oder Wochen-Paginierung gegen die abgestimmten Anforderungen wieder einführen.
- Weitere abgesicherte Fälle: Fokus im Dialog, Escape/Hintergrund-Abbruch, richtige Datumsart bei Tages-Plus, Monats-/Jahres-/DST-Grenzen, Kreise, optionale Voraussetzungen, Touch-Ansichten und Server-Assetgrenzen.
- Bei Fehlerkorrekturen nach Möglichkeit zuerst einen fehlschlagenden Regressionstest schreiben. Passende Modell- und Browserprüfungen ausführen; bei Layoutänderungen Desktop und schmale Ansicht visuell kontrollieren.
- Geheimnisse, `.env`, `node_modules` und erzeugte Testartefakte nicht committen. Keine Zugangsdaten aus einer anderen Maschine erwarten.
- Den Reviewbranch nicht ungefragt in `main` mergen oder veröffentlichen. Ein vorhandener Roadmap-Eintrag ersetzt keinen konkreten Nutzerauftrag.
- Diese Agenten-README bei relevanten Änderungen aktualisieren: Was funktioniert wirklich, welche Entscheidung ist offen und welche Prüfungen wurden durchgeführt?

**Einstieg für den nächsten Agenten:** Diese Datei lesen, `git status` und den Branch prüfen, den Prototyp starten, die Tests nachvollziehen und dann den aktuellen Benutzerauftrag umsetzen. Bei „Wie geht es weiter?“ zuerst das noch offene Hosting-/Datenbankmodell abstimmen, statt direkt mit Infrastruktur oder Schritt 2 zu beginnen.
