# Clothet

Kleiderschrank-App: Teile fotografieren und freistellen, Schrank verwalten, Outfits als Collage bauen, auf dem eigenen Ganzkörperfoto anprobieren, im Kalender planen. Eigenes Produkt mit eigenem Design.

## Pflicht vor jeder UI-Änderung

Lies `DESIGN.md`. Es ist verbindlich für Design, Bildsprache und Tonalität. Nutze nur die Tokens aus `src/styles/tokens.css` und die Komponenten-Klassen aus `src/styles/app.css`. Neue Werte zuerst in `DESIGN.md` und die Tokens aufnehmen.

## Technik

- Vite, React 18, TypeScript. Oberfläche auf Deutsch.
- Daten liegen lokal im Browser (IndexedDB über `idb-keyval`), siehe `src/store.ts`. Kein Backend.
- Bildverarbeitung in `src/lib/image.ts` (Freistellen, Farbe erkennen, Outfit-Vorschau).
- `npm run dev` startet lokal, `npm run build` prüft Typen und baut, `npm run build:artifact` baut eine Ein-Datei-Vorschau.

## Offene Ausbaustufen

- Freistellen mit KI-Modell statt der einfachen Hintergrund-Erkennung
- Kategorie automatisch erkennen
- Echte virtuelle Anprobe über ein Try-on-Modell
- Konto und Synchronisierung zwischen Geräten
