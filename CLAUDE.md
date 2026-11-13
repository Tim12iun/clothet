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
- Anlegen in `src/views/AddItems.tsx`: zwei Wege (Kamera oder Galerie, auch viele Bilder), danach je Bild eine Zeile mit erkannter Art (`guessCategory`) und Farbe. Keine Pflichtschritte, nur korrigieren und speichern.
- Sitz am Avatar in `src/lib/fitting.ts`: Jede Art hat eine feste Zone an der Figur (`zoneBox`, Körperpunkte aus `bodyTargets` in `src/lib/avatar.ts`). Standard ist `place`: Das freigestellte Bild wird über seinen Umriss unverformt in die Zone gelegt (oben angelegt, mittig, proportional). Das muss für jedes Teil zuverlässig klappen und hat Vorrang vor jeder Verformung. Zusatz je Teil (`item.sleeves`): Ärmel fallen zu den Armen hin (`warpTop`), nur wenn beide Ärmel sicher erkannt sind. Ohne KI, alles im Gerät. Die Feineinstellung gehört zum Teil (`item.fit`, in „Teil bearbeiten“) und läuft per transform; `src/views/Wear.tsx` zeichnet ein Teil auf der Bühne. Ändert sich die Art eines Teils, wird neu gerechnet.
- Freistellen: `removeBackground` in `src/lib/image.ts`, lose Bildreste fallen weg (`specks`). Trifft es das Teil nicht, markiert man es per Rahmen (`src/views/MarkArea.tsx`, `cutArea`). Regler immer über `src/views/Range.tsx`.
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
- Sitz verfeinern: Kleider und Röcke bekommen eine eigene Zone wie Oberteil und Hose, Ankerpunkte von Hand korrigieren
- Konto und Synchronisierung zwischen Geräten
