# Clothet

Kleiderschrank-App: Teile fotografieren, freistellen und taggen. Hauptscreen ist der Avatar, darunter eine Schublade mit den Teilen je Körperzone (Entwurf 4A), ein Tipp zieht ein Teil an. Dazu Filter, Zufalls-Outfits mit Vorgaben, Stil-Wissen für Farbregeln, gespeicherte Outfits, Planer (Woche, Monat, „getragen“ bestätigen) und Statistik. Eigenes Produkt mit eigenem Design.

## Pflicht vor jeder UI-Änderung

Lies `DESIGN.md`. Es ist verbindlich für Design, Bildsprache und Tonalität. Nutze nur die Tokens aus `src/styles/tokens.css` und die Komponenten-Klassen aus `src/styles/app.css`. Neue Werte zuerst in `DESIGN.md` und die Tokens aufnehmen.

## Technik

- Vite, React 18, TypeScript. Oberfläche auf Deutsch.
- Daten liegen lokal im Browser (IndexedDB über `idb-keyval`), siehe `src/store.ts`. Kein Backend.
- Bildverarbeitung in `src/lib/image.ts` (Freistellen, Farben erkennen, Outfit-Vorschau), Sitz der Teile auf dem Avatar in `src/lib/avatar.ts`.
- App-Rahmen in `src/main.tsx`: drei Bereiche mit eigener Adresse (`#/anprobe`, `#/schrank`, `#/outfits`), alle bleiben eingehängt. Das Dokument scrollt nie. Überlagerungen (Sheet, Kamera, Avatar einrichten) laufen über `src/lib/overlay.ts` (Zurück-Taste, Escape, Fokus).
- Avatar: Körpermodell aus Selfie und Körperdaten, weiblich oder männlich (`figureSvg` in `src/lib/avatar.ts`, Gesicht und Hautton in `src/lib/face.ts`), eingerichtet im Vollbild in `src/views/AvatarEditor.tsx`, oder Ganzkörperfoto. Eigene Kamera mit Umrisslinien in `src/views/Camera.tsx` und `src/lib/guides.ts`.
- Passform in `src/lib/fitting.ts`: liest Ankerpunkte aus dem Umriss (Schulter, Achsel, Ärmelende, Bund, Schritt) und zieht Oberteile, Jacken und Hosen auf die Körperpunkte aus `bodyTargets` (`src/lib/avatar.ts`). Ohne KI, alles im Gerät. Ergebnis ist ein Bild in Bühnengröße, die Feineinstellung des Sitzes läuft per transform.
- Outfit-Engine in `src/lib/engine.ts`: Bewertung von Kombinationen, Zufalls-Outfit, Auslesen von Farbregeln aus dem Stil-Wissen.
- Planer und „getragen“: `calendar` und `worn` im Store, Hilfen in `src/lib/outfits.ts`. Sicherung: `exportAll` und `importAll` im Store.
- Service Worker: Vorlage `scripts/sw.js`, der Build setzt die Dateiliste ein (`vite.config.ts`). Updates melden sich als Hinweis, geladen wird auf Wunsch.
- `npm run dev` startet lokal, `npm run build` prüft Typen und baut, `npm run build:artifact` baut eine Ein-Datei-Vorschau.
- `npm test` baut und prüft mit Playwright auf sechs Geräteprofilen (Abläufe, Überlauf, axe, 1000 Teile, offline). Nach jeder Änderung an der Oberfläche ausführen. Härtetest von Hand: Adresse mit `?stress=1000` bei leerem Schrank.
- Vor einer Veröffentlichung `RELEASE.md` durchgehen.

## Offene Ausbaustufen

- Freistellen mit KI-Modell statt der einfachen Hintergrund-Erkennung
- Kategorie, Stil und Jahreszeit per Bildmodell erkennen (bisher nur Farben und eine Vermutung aus der Form)
- Stil-Wissen als freien Text von einem Sprachmodell verstehen lassen (bisher nur Farbregeln)
- Passform verfeinern: Ankerpunkte von Hand korrigieren, Kleider und Röcke anpassen, Falten und Faltenwurf (bisher feste Pose, Ärmel als starres Stück)
- Konto und Synchronisierung zwischen Geräten
