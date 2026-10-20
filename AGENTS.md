# Projektinformationen

- Das Repository enthält derzeit Schritt 1: ein isoliertes, klickbares Bedienkonzept in `prototype/`. Die produktive React-/TypeScript-App und das Workspace-Layout aus der README sind noch nicht umgesetzt.
- Der Benutzer möchte diesen Schritt prüfen und Feedback geben, bevor die weiteren Umsetzungsschritte beginnen.
- Die Eisenhower-Matrix ist Bestandteil des einzelnen To-do-Dialogs, keine globale Ansicht zum Verschieben aller Aufgaben.
- Keine Weckerfunktion in der Web-Version. Die spätere React-Native-/Expo-App soll Fachlogik und Datenzugriff teilen; ihre Oberfläche bleibt plattformspezifisch.

## Ausführen und prüfen

- Node.js 22 oder neuer. pnpm ist über `packageManager` festgelegt; auf diesem Windows-Rechner steht es über `corepack pnpm` zur Verfügung.
- Abhängigkeiten installieren: `corepack pnpm install --frozen-lockfile`.
- Vorschau: `corepack pnpm dev` oder ohne Paketinstallation `node prototype/server.mjs`.
- Der lokale Server bindet standardmäßig an `127.0.0.1:4173` und stellt ausschließlich freigegebene Prototyp-Dateien bereit.
- Modelltests: `corepack pnpm test`.
- Browserprüfungen: `corepack pnpm test:ui`. Unter Windows wird das installierte Microsoft Edge verwendet. `PLAYWRIGHT_CHANNEL=chrome` wählt alternativ ein installiertes Chrome.
- Auf anderen Plattformen verwendet Playwright sein Chromium; falls es fehlt, zuerst `corepack pnpm exec playwright install chromium` ausführen.
- Review-Screenshots entstehen unter `.artifacts/review/`; Browser-Testartefakte unter `.artifacts/test-results/`. Beide sind von Git ausgeschlossen.

## Prototyp-Konventionen

- Keine Anmeldung, externen Laufzeitanfragen oder dauerhafte Speicherung. Beispieldaten werden beim Neuladen zurückgesetzt.
- Alle Ansichten bearbeiten denselben In-Memory-Aufgabenbestand. Dialogänderungen werden erst beim Speichern übernommen.
- Nutzereingaben vor dem Einsetzen in HTML maskieren; Formularwerte über DOM-Eigenschaften setzen.
- Reine Datums-, Prioritäts- und Graphfunktionen liegen in `prototype/model.mjs` und werden mit `node:test` geprüft.
- Der Graph ist im Prototyp bearbeitbar: mehrere ein-/ausgehende Verbindungen, frei verschiebbare Knoten, Autoformatierung und Folgeschritt-Plus. Selbstverbindungen, Duplikate, Projektgrenzen und Kreise werden geprüft.
- Autoformatieren darf ausschließlich Knotenpositionen und den Verlauf vorhandener Pfeile aktualisieren. Aktive Gesten vorher vollständig abbrechen (auch bei Escape); ein späteres Pointer-Up darf keine neue Verbindung erzeugen. Layout-Updates verändern bestehende SVG-Pfade, statt Verbindungen neu aufzubauen.
- Die Einordnung eines To-dos wird in einem separaten Popup vorbereitet und erst zusammen mit dem To-do gespeichert. Abbrechen darf keine Aufgaben oder Verbindungen hinterlassen.
- Keine Projekt-Prozentwerte oder Fortschrittsbalken: Der Benutzer möchte keine aus Aufgabenanzahlen abgeleitete Fortschrittsmetrik.
- Die Homepage heißt „Dein Arbeitsbereich“. „Ohne Termin“ steht oben. Die Listenansicht ist durchgehend und vollbreit: Datum als Zwischenüberschrift, eine Zeile je To-do, keine gerahmten oder abgerundeten Tageskarten. Listentage haben eigene Klassen und dürfen keine responsive Spaltenbreite übernehmen.
- Tage werden beim Scrollen in beide Richtungen ergänzt; beim Voranstellen muss die sichtbare Position erhalten bleiben.
- Eigene Projektbilder werden nur lokal als kurzlebige Blob-URLs verarbeitet. PNG/JPG/WebP, maximal 5 MB, Dateisignatur und Dekodierung prüfen; verworfene URLs freigeben.
- Outlook ist ausschließlich eine spätere Anbieter-Schnittstelle im Architekturplan, noch keine echte Kalender- oder Mailverbindung.
- Zusätzliche Browserfälle für Entwurf 02/03 liegen in `prototype/tests/iteration.spec.mjs`, einschließlich Listenbreite von 390 bis 1920 px und unterbrochener Graph-Gesten. Die Produktarchitektur bleibt in der README dokumentiert.
