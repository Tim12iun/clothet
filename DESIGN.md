# Clothet Design-System

Verbindliche Grundlage für jeden Screen, jedes Bild und jeden Text in Clothet. Wer etwas Neues baut, liest zuerst dieses Dokument und nutzt die Tokens aus `src/styles/tokens.css` und die Komponenten aus `src/styles/app.css`. Neue Werte kommen zuerst hier und in die Tokens, erst dann in den Code.

## 1. Leitidee

**Du vor deinem Schrank.** Oben steht dein Avatar auf ruhigem Grund, darunter liegt deine Kleidung in einer weißen Schublade. Ein Tipp, und du hast etwas anderes an. Die Kleidung ist bunt, die App nicht.

Vorbild für die Bedienung sind heutige Handy-Apps mit minimalistischer Oberfläche wie Airbnb: viel Weiß, klare Titel, runde Chips, eine untere Leiste mit drei Bereichen.

Zwei Vorlagen geben die Regeln vor. Aus **Material Design 3** kommen die Bausteine: Schublade (Bottom Sheet) mit Griff, schwebende Hauptaktion (Extended FAB), Umschalter, Filter-Chips, untere Leiste, Antippflächen von 48 px. Aus **Refactoring UI** kommt die Gestaltung: Rangfolge über Schriftgewicht und Farbe statt über Größe, Flächen und Abstände statt Rahmen, Nebentext zurückgenommen, Schatten nur für Schwebendes.

Drei Grundsätze, an denen jede Entscheidung gemessen wird:

1. **Kleidung zuerst.** Fotos bekommen die größte Fläche. Bedienelemente sind klein, ruhig und am Rand.
2. **Ein Schritt, eine Hauptaktion.** Pro Screen gibt es genau einen grünen Button. Alles andere ist neutral.
3. **Ordnung ohne Strenge.** Klare Raster und gleiche Abstände, aber weiche Ecken und ein freundlicher Ton.
4. **Flach statt verschachtelt.** Es gibt drei Bereiche. Darüber öffnet sich höchstens ein Sheet, nie ein Sheet auf einem Sheet und keine Unterseiten.

## 2. Gefühl (Feeling-Language)

| So fühlt sich Clothet an | So nicht |
| --- | --- |
| ruhig, aufgeräumt, hell | laut, verspielt, überladen |
| persönlich, wie der eigene Schrank | wie ein Shop, der etwas verkaufen will |
| leicht und schnell | technisch, einstellungslastig |
| selbstbewusst schlicht | modisch-trendig, Glitzer, Verläufe |

Keine Verläufe, kein Glas-Effekt, keine Emojis in der Oberfläche, keine Werbe-Sprache.

## 3. Farbe

Alle Farben sind Tokens. Hell- und Dunkelmodus sind gleichwertig gestaltet.

| Token | Hell | Dunkel | Einsatz |
| --- | --- | --- | --- |
| `--c-bg` | `#ffffff` | `#101412` | Seitenhintergrund |
| `--c-surface` | `#ffffff` | `#181e1b` | Karten, Sheets, Leisten |
| `--c-tile` | `#f1f3f0` | `#232b27` | Ablage hinter Kleidung und Avatar |
| `--c-line` | `#e1e5e0` | `#2e3833` | Linien, Rahmen |
| `--c-ink` | `#16201c` | `#e8ede9` | Haupttext |
| `--c-muted` | `#5f6b65` | `#9aa8a0` | Nebentext |
| `--c-accent` | `#17694f` | `#57c79f` | Hauptaktion, aktiver Zustand |
| `--c-accent-soft` | `#dcebe4` | `#1d3a30` | aktive Chips, Auswahl |
| `--c-danger` | `#b3372c` | `#ef8076` | Löschen, Fehler |

Regeln:

- Die Grautöne haben einen leichten Grünstich, passend zum Akzent. Kein reines Grau.
- Tannengrün ist die einzige Schmuckfarbe und markiert nur die Hauptaktion und den aktiven Zustand.
- Rot bedeutet ausschließlich Löschen oder Fehler.
- Der Seitenhintergrund ist reines Weiß. Kleidung und Avatar liegen auf `--c-tile`.
- Die Anprobe bewertet Outfits nicht sichtbar („Stimmig“ gibt es nicht mehr). Farbregeln wirken nur im Zufall.

Zusätzlich gibt es `--c-guide` (Tannengrün, in beiden Farbmodi gleich) für Hilfslinien beim Ausrichten am Avatar: das Oval um das Gesicht.

## 4. Typografie

| Rolle | Schrift | Größe | Gewicht |
| --- | --- | --- | --- |
| Seitentitel | Inter | `--fs-xl` 22 | 700 |
| Sheet-Titel | Inter | `--fs-lg` 20 | 700 |
| Text, Eingaben, Buttons | Inter | `--fs-md` 16 | 400 / 600 |
| Nebentext, Chips | Inter | `--fs-sm` 14 | 400 / 500 |
| Beschriftung, Tabs | Inter | `--fs-xs` 12 | 600, Großbuchstaben mit 0.06em Sperrung nur bei Feld-Beschriftungen |

Es gibt nur eine Schrift, Inter. Sie liegt als Variable Font in der App selbst (`@font-face` in `tokens.css`), nichts wird von fremden Servern geladen, damit die App offline gleich aussieht. Rangfolge entsteht über Gewicht (400, 500, 600, 700) und Farbe (`--c-ink`, `--c-muted`). Zahlen in Rastern stehen mit `tabular-nums`.

## 5. Abstände, Raster, Form

- **Abstände** im 4er-Raster: `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 24, `--s-6` 32, `--s-7` 48. Zwischen Geschwistern immer `gap`, keine Einzel-Margins.
- **Seitenrand** mindestens 16 px, Inhalt maximal `--maxw` 960 px breit.
- **Kleider-Raster:** Kacheln im Format 3:4, mindestens 150 px breit, Abstand `--s-3`.
- **Radien:** `--r-sm` 8 für Eingaben, `--r-md` 16 für Kacheln und den Zufallsknopf, `--r-lg` 24 für Sheets und die Schublade, `--r-pill` für Buttons und Chips.
- **Schatten** nur für Schwebendes: `--sh-1` für kleine Karten und den aktiven Umschalter, `--sh-2` für Sheets, `--sh-drawer` für die Schublade, `--sh-fab` für den Zufallsknopf. Kacheln haben keinen Schatten.
- **Antippflächen** mindestens 48 px (`--tap`).

## 6. Komponenten

Klassen stehen in `src/styles/app.css`. Bestehende Komponenten wiederverwenden, bevor neue entstehen.

| Komponente | Klasse | Regel |
| --- | --- | --- |
| Hauptbutton | `.btn.btn-primary` | einmal pro Screen, grün, Verb als Text ("Speichern") |
| Nebenbutton | `.btn` | neutral mit Rahmen |
| Löschbutton | `.btn.btn-danger` | rot, nur für Unwiderrufliches, immer mit Rückfrage |
| Icon-Button | `.icon-btn` | 48 px, immer mit `aria-label` |
| Chip | `.chip`, aktiv `.chip.is-on` | Filter und Mehrfachauswahl, 44 px hoch |
| Regler | `.range` (Komponente `Range`) | Dicke Spur (12 px), Griff 36 px, links und rechts Tasten für einzelne Stufen, darunter die Enden in Worten oder der Wert |
| Kachel | `.tile` | Kleidung 3:4 auf `--c-tile`, Name darunter |
| Sheet | `.sheet` | Formulare und Details, von unten, am Desktop mittig |
| Feld | `.field` | Beschriftung über der Eingabe |
| Leerer Zustand | `.empty` | ein Satz, was hier erscheint, plus die eine Aktion |
| Hinweis | `.note` | kurze Rückmeldung in einem Satz |
| Bühne | `.stage` | Avatar-Fläche 3:4 ohne eigene Kachel, steht auf `--c-stage` und füllt die freie Höhe |
| Art des Zufalls | `.roll-mode` | kleiner Umschalter oben links auf der Bühne: „Normal“ (klassische Kombinationen) oder „Speziell“ (ungewöhnliche, die auf den zweiten Blick passen). Gilt für den Zufallsknopf |
| Teil bearbeiten | `.item-edit` | alles auf einer Seite: oben Vorschau am Avatar, Name und Sitz, darunter je Gruppe (Kategorie, Farbe, Jahreszeit, Stil) eine Zeile zum seitlichen Wischen |
| Wege zum Bild | `.add-ways` | drei gleich große Knöpfe: Kamera, Aus Galerie, Einfügen (übernimmt ein kopiertes, schon freigestelltes Motiv) |
| Markierrahmen | `.mark-box` | Rahmen mit vier runden Griffen an den Ecken. Ecken ziehen, Rahmen verschieben oder daneben neu aufziehen |
| Schublade | `.drawer` | weiße Fläche unter der Bühne mit Griff, Umschalter und Auswahl-Raster. Zwei Größen (klein ist Standard), Griff antippen oder wischen. Sie gibt nach, bevor die Bühne zu klein wird, ragt nie über die untere Leiste und ist nach einem Bereichswechsel wieder klein |
| Auswahl-Kachel | `.pick-tile` | ein Teil im Raster der Schublade, angezogen mit grünem Rahmen und Haken (`.check`) |
| Zufallsknopf | `.fab` | die eine schwebende Hauptaktion der Anprobe, rechts unten auf der Bühne |
| Bewertung | `.match` | kleine Karte links oben auf der Bühne: Urteil fett, Grund darunter |
| Umschalter | `.segment` | zwei bis vier gleichrangige Ansichten, in der Schublade die Körperzonen |
| Kamera | `.camera` | Vollbild mit Umrisslinie, einem Satz Anleitung und Auslöser. Ersetzt während der Aufnahme das Sheet, liegt also nicht darüber. Immer dunkel (`--c-camera`) |
| Toast | `.toast` | kurze Bestätigung über der unteren Leiste, verschwindet von selbst |
| Untere Leiste | `.nav` | drei Bereiche: Anprobe, Schrank, Outfits |

## 6a. Der Hauptscreen (Anprobe)

Grundlage ist Entwurf 4A „Klar“ mit dem Zufallsknopf aus 4C.

- **Oben die Bühne** auf `--c-stage`: Titel „Anprobe“, rechts „Heute getragen“ (ein Tipp speichert das Outfit, falls nötig, und trägt es für heute ein), Speichern als Lesezeichen und Einstellungen als Zahnrad. Auf schmalen Telefonen und im Querformat zeigt „Heute getragen“ nur den Haken. Der Avatar steht mittig, die Bühne ist immer 3:4. Ohne eigenes Selfie ist es das neutrale graue Körpermodell.
- **Links oben auf der Bühne** steht die Bewertung des Outfits als kleine Karte.
- **Rechts unten auf der Bühne** schwebt der Zufallsknopf („Zufall“ mit Würfel). Er ist die einzige grüne Fläche des Screens. Ist eine Hauptfarbe vorgegeben, zeigt er sie als Punkt.
- **Unten die Schublade:** Griff, Umschalter für Jacke, Oberteil, Hose, Schuhe und daneben der Filter-Knopf. Darunter das Raster der Teile dieser Zone, drei pro Reihe. Ein Tipp zieht das Teil an. Bei der Jacke steht zuerst „Ohne“, am Ende des Rasters immer „Neues Teil“.
- Ein Tipp auf den Griff vergrößert oder verkleinert die Schublade. Nur das Raster scrollt, der Screen selbst nicht.
- Ein Tipp auf eine Körperzone des Avatars zeigt diese Zone in der Schublade, ein Wisch darüber wechselt direkt zum nächsten Teil.
- Der Filter-Knopf öffnet das eine Sheet „Filter und Zufall“: Jahreszeit, Stil, Hauptfarbe und was beim Würfeln bleibt. Ist etwas gesetzt, trägt der Knopf einen grünen Punkt.
- **Sitz am Avatar** (in „Teil bearbeiten“, ganz oben): kleine Bühne mit dem Avatar und dem Teil, daneben vier Knöpfe (höher, tiefer, kleiner, größer). Die Einstellung gilt nur für dieses Teil. Oberteile werden nie verzerrt, nur skaliert. Einen eigenen Modus dafür gibt es nicht.
- Im Querformat am Telefon stehen Bühne und Schublade nebeneinander, die Bereiche wandern als schmale Leiste an die linke Seite.

## 6b. Regeln für Abläufe

- **Nichts verstecken, nichts verschachteln.** Jede Funktion hat genau einen sichtbaren Ort mit Beschriftung. Es gibt keine eigenen Modi und keine Menüs hinter Menüs: Von jedem der drei Bereiche führt höchstens ein Sheet weg, nur Kamera, Zuschneiden und Avatar einrichten liegen als Vollbild darüber. Was zu einem Teil gehört (Art, Farbe, Sitz am Avatar), steht in „Teil bearbeiten“.
- **Am Objekt arbeiten, nicht am Regler.** Was eine Position oder Größe hat (Gesicht am Avatar, Sitz der Teile), wird dort angefasst, wo es zu sehen ist, und groß gezeigt. Regler bleiben für Werte ohne Ort (Körpergröße, Helligkeit des Hauttons).
- **Jede Geste hat sichtbare Knöpfe** mit derselben Wirkung (`.pad`), und die Pfeiltasten funktionieren.
- **Rückgängig statt Nachfrage.** Löschen und Eintragen wirken sofort, der Toast bietet sechs Sekunden lang „Rückgängig“. Eine Nachfrage gibt es nur, wenn alles ersetzt wird (Sicherung laden).
- **Ein Tipp für das Häufige.** „Heute getragen“ auf der Anprobe, „Getragen“ auf der Heute-Karte, der Haken in der Wochenliste.
- **Überlagerungen** (Sheet, Kamera, Avatar einrichten) schließen mit Knopf, Escape und der Zurück-Taste, der Fokus kehrt zum Auslöser zurück (`src/lib/overlay.ts`).
- **Zustände:** leer immer mit nächster Handlung, Laden als Platzhalter in der Form des Inhalts (`.skeleton`) oder als Kreisel im Knopf (`.btn.is-busy`), Fehler in einem Satz mit Ausweg.
- **Das Dokument scrollt nie.** Es scrollen nur `.view`, `.sheet-body`, `.drawer-body` und `.editor-panel`. Sichere Ränder kommen aus `--safe-*`.

## 6c. Weitere Bausteine

| Baustein | Klasse | Einsatz |
| --- | --- | --- |
| Avatar einrichten | `.editor` | Vollbild: oben der große Avatar, unten das Feld mit „Gesicht“ und „Körper“ |
| Steuerkreuz | `.pad` | Knöpfe als Ersatz für Gesten |
| Sitz am Avatar | `.fit-row`, `.stage.is-mini`, `.fit-side` | Kleine Bühne und Steuerkreuz in „Teil bearbeiten“ |
| Heute-Karte | `.today` | oben in Outfits: was heute geplant oder getragen ist, mit der einen Aktion |
| Wochenliste | `.days`, `.day-row`, `.day-check` | sieben Tage, rechts der Haken für „getragen“ |
| Kennzahlen, Karte, Balken | `.facts`, `.card`, `.bars` | Statistik |
| Hinzufügen | `.add-ways`, `.import-row`, `.import-kinds` | Sheet „Kleidung hinzufügen“: zwei große Buttons „Kamera“ und „Aus Galerie“ (auch mehrere Bilder). In der Kamera wählt man unten die Art (`.camera-kinds`), die Umrisslinie wechselt mit; bei Schuhen folgt direkt das Foto von vorne mit eigener Umrisslinie. Danach je Bild eine Zeile: ausgeschnitten, Farbe und Art erkannt, Art per Chip korrigierbar (Oberteil, Hose, Schuhe, Rest hinter „Mehr“), speichern |
| Teil markieren | `.mark-frame`, `.mark-photo`, `.mark-box` | Vollbild im Stil der Kamera: Rahmen mit dem Finger um das Teil ziehen, freigestellt wird nur im Rahmen |
| Sortieren | `.sort` | Auswahl über dem Raster im Schrank |
| Schritte | `.steps` | nummerierte Anleitung, z. B. Installation |

## 7. Icons

- Eigene Linien-Icons aus `src/icons.tsx`, 24er-Raster, Strichstärke 1.75, runde Enden und Ecken, Farbe `currentColor`.
- Keine gefüllten Icons, keine Emojis, keine gemischten Icon-Sets.
- Ein Icon steht nie allein für eine unklare Aktion. Im Zweifel Text dazu.

## 8. Bildsprache

- **Kleidung:** von oben fotografiert, flach liegend, freigestellt, vollständig sichtbar, mit etwas Luft zum Rand. Immer `object-fit: contain`, nie beschnitten.
- **Schuhe** sind die Ausnahme und brauchen zwei Fotos von einem Schuh: von der Seite (Spitze nach rechts) für Schrank und Schublade, und von vorne, leicht von oben (etwa 20 bis 30 Grad), für den Avatar. Am Avatar steht dieses Bild unter dem einen Bein und gespiegelt unter dem anderen, die Hose liegt darüber. Fehlt das zweite Foto, wird das Schrankbild verwendet.
- **Umrisslinien:** Für jede Kategorie gibt es eine gestrichelte Umrisslinie (`src/lib/guides.ts`). Sie liegt in der Kamera über dem Bild und zeigt, wie das Teil ungefähr liegen soll.
- **Avatar:** zwei Wege. Standard ist die **Figur aus dem Selfie**: eine gezeichnete, frontale Puppe ohne Arme (Kopf, Oberkörper, Beine), weiblich oder männlich, mit weichen Körperformen, Schattierung, Körperlinien und Füßen, in schlichter heller Wäsche. Die Arme fehlen mit Absicht: Ärmel hängen so, wie sie fotografiert wurden, und ein Oberteil muss nur in der Größe passen (Schultern des Teils auf die Schultern der Puppe). Der Kopf ist das ausgeschnittene Gesicht aus dem Selfie, der Körper trägt den Hautton aus dem Foto. Körperform, Größe und Körpertyp ändern die Proportionen, die Kleidung wird im selben Maß breiter. Angezogen sollen nur Gesicht und Hals zu sehen sein, damit die Zeichnung kaum auffällt. Alternative ist ein eigenes **Ganzkörperfoto**: frontal, aufrecht, barfuß, Arme leicht ab, heller ruhiger Hintergrund, füllt die Bühne im Format 3:4. Ohne beides steht die neutrale graue Figur ohne Gesicht.
- **Selfie:** auf Augenhöhe, das Gesicht füllt das Oval der Kamera vom Kinn bis zum Haaransatz. Erst das Selfie, daraus entsteht sofort die Figur. Danach wird im Vollbild angepasst: das Gesicht mit dem Finger direkt am großen Avatar, dann Körperform, Körpertyp, Größe und Hautton.
- **Passform:** Oberteile, Jacken und Hosen liegen nicht flach auf, sondern werden an das Körpermodell angepasst (`src/lib/fitting.ts`): Der Rumpf folgt der Körperlinie, Ärmel liegen entlang der Arme, Hände bleiben frei, jedes Hosenbein folgt einem Bein. Es wird nur verschoben, gedreht und höchstens leicht gestreckt, dazu ein leichter Schatten zu den Rändern. Farbe und Muster bleiben. Je Teil lässt sich „Flach aufgelegt“ wählen. Kleider, Röcke und Schuhe liegen weiter flach, ebenso alles auf einem Ganzkörperfoto.
- **Outfit-Vorschau:** immer aus der Bühne erzeugt, gleiches Format 3:4, gleiche Ablagefarbe.
- **Beispiel-Teile** sind schlichte Zeichnungen und klar als "Beispiel" markiert.
- Keine Stockfotos, keine Models, keine Deko-Illustrationen.

## 9. Bewegung

- Kurz und ruhig: `--t-fast` 120 ms für Zustände, `--t-base` 220 ms für Sheets, immer mit `--ease`.
- Bewegung erklärt, woher etwas kommt (Sheet von unten). Kein Hüpfen, kein Dauer-Animieren.
- `prefers-reduced-motion` schaltet Bewegung ab.

## 10. Sprache (Tonalität)

- **Du-Form**, kurz, freundlich, konkret. So wie eine Freundin mit gutem Ordnungssinn spricht.
- Buttons sind Verben und sagen genau, was passiert: "Teil hinzufügen", "Outfit speichern", "Löschen".
- Dinge heißen so, wie man sie zu Hause nennt: **Teil**, **Schrank**, **Outfit**, **Anprobe**, **Avatar**, **Stil-Wissen**, **Zufalls-Outfit**. Nicht "Item", "Asset", "Look-Generator".
- Keine Ausrufezeichen, keine Werbe-Wörter ("smart", "magisch", "KI-powered"), keine Entschuldigungen.
- Fehler sagen, was passiert ist und was hilft: "Das Foto ließ sich nicht öffnen. Versuch es mit einem JPG oder PNG."
- Leere Zustände laden ein: "Hier hängen bald deine Outfits."

## 11. Feste Begriffe und Listen

- **Kategorien:** Oberteile, Hosen, Röcke, Kleider, Jacken, Schuhe, Accessoires
- **Körperzonen:** Jacke, Oberteil, Hose, Schuhe
- **Stile:** Lässig, Business, Sport, Elegant
- **Jahreszeiten:** Frühling, Sommer, Herbst, Winter
- **Farben:** Schwarz, Weiß, Grau, Beige, Braun, Rot, Orange, Gelb, Grün, Türkis, Blau, Marine, Lila, Rosa
- **Bereiche:** Anprobe, Schrank, Outfits. Outfits hat die Ansichten Liste, Woche, Monat und Statistik. Avatar, Stil-Wissen, Sicherung und Installation liegen in den Einstellungen (Zahnrad), es gibt keinen vierten Bereich.
- **Getragen und geplant:** Für heute und frühere Tage heißt ein gewähltes Outfit „getragen“, für kommende Tage „geplant“.

## 12. Checkliste vor jedem neuen Screen

1. Nur Tokens benutzt, keine festen Farben, Größen oder Abstände?
2. Genau eine grüne Hauptaktion, und höchstens ein Sheet über dem Bereich?
3. Kleidung auf `--c-tile`, vollständig sichtbar?
4. Hell und dunkel geprüft, bei 390 px Breite ohne Querscrollen?
5. Texte in Du-Form, Buttons als Verben, feste Begriffe eingehalten?
6. Alles Antippbare mindestens 48 px, mit sichtbarem Fokus?

## Bewegung an der Figur

Ein Teil wechselt ohne Bewegung, die Puppe steht nie kurz ohne Kleidung da. Nur beim Wischen an der Figur gleitet das gewischte Teil kurz herein, alle anderen Teile bleiben stehen.
