# Clothet

Kleiderschrank-App: Teile fotografieren, freistellen, Art und Farbe festlegen. Hauptscreen ist der Avatar, darunter eine Schublade mit den Teilen je Körperzone (Entwurf 4A), ein Tipp zieht ein Teil an. Dazu Zufalls-Outfits mit Vorgaben (eigenes Sheet „Zufall“), eigene Farbregeln, gespeicherte Outfits, Planer (Woche, Monat, „getragen“ bestätigen) und Statistik. Eigenes Produkt mit eigenem Design.

## Pflicht vor jeder UI-Änderung

Lies `DESIGN.md`. Es ist verbindlich für Design, Bildsprache und Tonalität. Nutze nur die Tokens aus `src/styles/tokens.css` und die Komponenten-Klassen aus `src/styles/app.css`. Neue Werte zuerst in `DESIGN.md` und die Tokens aufnehmen.

## Technik

- Vite, React 18, TypeScript. Oberfläche auf Deutsch.
- Daten liegen lokal im Browser (IndexedDB über `idb-keyval`), siehe `src/store.ts`. Kein Backend.
- Bildverarbeitung in `src/lib/image.ts` (Freistellen, Farben erkennen, Outfit-Vorschau), Sitz der Teile auf dem Avatar in `src/lib/avatar.ts`.
- App-Rahmen in `src/main.tsx`: drei Bereiche mit eigener Adresse (`#/anprobe`, `#/schrank`, `#/outfits`), alle bleiben eingehängt. Das Dokument scrollt nie. Überlagerungen (Sheet, Kamera, Avatar einrichten) laufen über `src/lib/overlay.ts` (Zurück-Taste, Escape, Fokus).
- Avatar: Puppe ohne Arme aus Selfie und Körperdaten, weiblich oder männlich (`figureSvg` in `src/lib/avatar.ts`, Gesicht und Hautton in `src/lib/face.ts`), eingerichtet im Vollbild in `src/views/AvatarEditor.tsx`, oder Ganzkörperfoto. Eigene Kamera mit Umrisslinien in `src/views/Camera.tsx` und `src/lib/guides.ts`.
- Anlegen in `src/views/AddItems.tsx`: drei Wege (Kamera, Galerie mit vielen Bildern, Einfügen aus der Zwischenablage; schon freigestellte Bilder bleiben unverändert, `isCutOut`), danach je Bild eine Zeile mit erkannter Art (`guessCategory`) und Farbe. Keine Pflichtschritte, nur korrigieren und speichern.
- Sitz am Avatar in `src/lib/fitting.ts`: Die Figur ist eine Puppe ohne Arme, darum wird kein Oberteil verzerrt. `placeTop` skaliert das freigestellte Bild nur als Ganzes und legt es mittig an die Schultern: sicherer Weg über die Länge (Kragen bis Saum wird zur Länge des Oberkörpers), genauer über die Schulterbreite (`readTop`: schmalste Stelle des Rumpfs zwischen Schulter und Saum, das gilt auch, wenn die Ärmel am Rumpf anliegen). `placeBottom`: Größe über die Bundbreite, Länge bis zum Knöchel, Beine unterhalb des Schritts nur seitlich verschoben, nie gestaucht, sicherer Weg `simpleScale`. Jede Erkennung wird gegen den sicheren Weg geprüft: Weicht sie stark ab oder schlägt fehl, gilt der sichere Weg. Diese Regel hat Vorrang vor jeder Verfeinerung. Ohne KI, alles im Gerät. Die Feineinstellung gehört zum Teil (`item.fit`, in „Teil bearbeiten“) und läuft per transform; `src/views/Wear.tsx` zeichnet ein Teil auf der Bühne. Ändert sich die Art eines Teils, wird neu gerechnet.
- Freistellen: `removeBackground` in `src/lib/image.ts`. Die Grenze zwischen Hintergrund und Teil wird aus dem Bild gelesen (Tal in der Verteilung der Farbabstände), bleiben nur Fetzen, gilt die strengste Grenze. Lose Bildreste fallen weg (`specks`). Trifft es das Teil nicht, markiert man es per Rahmen (`src/views/MarkArea.tsx`, `cutArea`). Regler immer über `src/views/Range.tsx`.
- Outfit-Engine in `src/lib/engine.ts`: Zufalls-Outfit in zwei Arten (`rate`: Normal mit neutralen Farben und höchstens einer kräftigen, Speziell mit genau einem spannenden Paar nach dem Farbkreis), Auslesen der Farbregeln aus den Einstellungen. Ein Teil hat nur Art und Farbe, Stil und Jahreszeit gibt es nicht mehr. Welche Kategorien angeboten werden, steht in den Einstellungen (`categories` im Store, `useCategories`, Vorgabe `defaultCategories` nach dem Geschlecht der Figur). Eine sichtbare Bewertung gibt es nicht mehr.
- Cloud-Speicher in `src/lib/cloud.ts` (Supabase ohne Zusatzbibliothek, Einrichtung `supabase/setup.sql`, Zugang in `src/cloud.config.ts`; leer heißt aus). Der Browser-Speicher bleibt die Quelle für die Oberfläche, jede Änderung wird je Eintrag abgeglichen, der jüngere Stand gilt.
- Planer und „getragen“: `calendar` und `worn` im Store, Hilfen in `src/lib/outfits.ts`. Sicherung: `exportAll` und `importAll` im Store.
- Service Worker: Vorlage `scripts/sw.js`, der Build setzt die Dateiliste ein (`vite.config.ts`). Updates melden sich als Hinweis, geladen wird auf Wunsch.
- `npm run dev` startet lokal, `npm run build` prüft Typen und baut, `npm run build:artifact` baut eine Ein-Datei-Vorschau.
- `npm test` baut und prüft mit Playwright auf sechs Geräteprofilen (Abläufe, Überlauf, axe, 1000 Teile, offline). Nach jeder Änderung an der Oberfläche ausführen. Härtetest von Hand: Adresse mit `?stress=1000` bei leerem Schrank.
- Vor einer Veröffentlichung `RELEASE.md` durchgehen.

## Offene Ausbaustufen

- Freistellen mit KI-Modell statt der einfachen Hintergrund-Erkennung
- Kategorie per Bildmodell erkennen (bisher nur Farben und eine Vermutung aus der Form)
- Farbregeln als freien Text von einem Sprachmodell verstehen lassen (bisher nur feste Satzmuster)
- Sitz verfeinern: Kleider und Röcke bekommen eine eigene Zone wie Oberteil und Hose, Ankerpunkte von Hand korrigieren
- Konto und Synchronisierung zwischen Geräten
