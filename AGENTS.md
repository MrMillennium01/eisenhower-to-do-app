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
- Reine Datums-, Prioritäts- und Fortschrittsfunktionen liegen in `prototype/model.mjs` und werden mit `node:test` geprüft.
- Projektverbindungen und Layoutpositionen sind im Prototyp vorgegeben. Die Produktarchitektur bleibt in der README dokumentiert.
