# Clothet

Kleiderschrank-App: Teile fotografieren, freistellen und taggen. Hauptscreen ist der Avatar, darunter eine Schublade mit den Teilen je Körperzone (Entwurf 4A), ein Tipp zieht ein Teil an. Dazu Filter, Zufalls-Outfits mit Vorgaben, Stil-Wissen für Farbregeln, gespeicherte Outfits und Kalender. Eigenes Produkt mit eigenem Design.

## Pflicht vor jeder UI-Änderung

Lies `DESIGN.md`. Es ist verbindlich für Design, Bildsprache und Tonalität. Nutze nur die Tokens aus `src/styles/tokens.css` und die Komponenten-Klassen aus `src/styles/app.css`. Neue Werte zuerst in `DESIGN.md` und die Tokens aufnehmen.

## Technik

- Vite, React 18, TypeScript. Oberfläche auf Deutsch.
- Daten liegen lokal im Browser (IndexedDB über `idb-keyval`), siehe `src/store.ts`. Kein Backend.
- Bildverarbeitung in `src/lib/image.ts` (Freistellen, Farben erkennen, Outfit-Vorschau), Sitz der Teile auf dem Avatar in `src/lib/avatar.ts`.
- Avatar: gezeichnete Figur aus Selfie und Körperdaten (`figureUrl` in `src/lib/avatar.ts`, Gesicht und Hautton in `src/lib/face.ts`) oder Ganzkörperfoto. Eigene Kamera mit Umrisslinien in `src/views/Camera.tsx` und `src/lib/guides.ts`.
- Outfit-Engine in `src/lib/engine.ts`: Bewertung von Kombinationen, Zufalls-Outfit, Auslesen von Farbregeln aus dem Stil-Wissen.
- `npm run dev` startet lokal, `npm run build` prüft Typen und baut, `npm run build:artifact` baut eine Ein-Datei-Vorschau.

## Offene Ausbaustufen

- Freistellen mit KI-Modell statt der einfachen Hintergrund-Erkennung
- Kategorie, Stil und Jahreszeit per Bildmodell erkennen (bisher nur Farben und eine Vermutung aus der Form)
- Stil-Wissen als freien Text von einem Sprachmodell verstehen lassen (bisher nur Farbregeln)
- Echte virtuelle Anprobe über ein Try-on-Modell (bisher liegen die Teile flach auf dem Avatar)
- Konto und Synchronisierung zwischen Geräten
