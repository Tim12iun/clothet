# Clothet Design-System

Verbindliche Grundlage für jeden Screen, jedes Bild und jeden Text in Clothet. Wer etwas Neues baut, liest zuerst dieses Dokument und nutzt die Tokens aus `src/styles/tokens.css` und die Komponenten aus `src/styles/app.css`. Neue Werte kommen zuerst hier und in die Tokens, erst dann in den Code.

## 1. Leitidee

**Du vor deinem Schrank.** Im Mittelpunkt steht dein Avatar, links und rechts hängt deine Kleidung. Ein Wisch, und du hast etwas anderes an. Die Kleidung ist bunt, die App nicht.

Vorbild für die Bedienung sind heutige Handy-Apps mit minimalistischer Oberfläche wie Airbnb: viel Weiß, große klare Titel, runde Chips, eine untere Leiste mit drei Bereichen.

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
- Bewertungen von Outfits nutzen Worte plus Farbe: „Stimmig“ in Akzentgrün, „Passt“ neutral, „Gewagt“ in Rot.

## 4. Typografie

| Rolle | Schrift | Größe | Gewicht |
| --- | --- | --- | --- |
| Seitentitel | Bricolage Grotesque | `--fs-xl` 28 | 700 |
| Sheet-Titel | Bricolage Grotesque | `--fs-lg` 20 | 700 |
| Text, Eingaben, Buttons | Instrument Sans | `--fs-md` 16 | 400 / 600 |
| Nebentext, Chips | Instrument Sans | `--fs-sm` 14 | 400 / 500 |
| Beschriftung, Tabs | Instrument Sans | `--fs-xs` 12 | 600, Großbuchstaben mit 0.06em Sperrung nur bei Feld-Beschriftungen |

Die Display-Schrift steht nur in Titeln und in Kalenderzahlen. Keine dritte Schrift. Zahlen in Rastern stehen mit `tabular-nums`.

## 5. Abstände, Raster, Form

- **Abstände** im 4er-Raster: `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 24, `--s-6` 32, `--s-7` 48. Zwischen Geschwistern immer `gap`, keine Einzel-Margins.
- **Seitenrand** mindestens 16 px, Inhalt maximal `--maxw` 960 px breit.
- **Kleider-Raster:** Kacheln im Format 3:4, mindestens 150 px breit, Abstand `--s-3`.
- **Radien:** `--r-sm` 8 für Eingaben, `--r-md` 14 für Kacheln, `--r-lg` 22 für Sheets und die Bühne, `--r-pill` für Buttons und Chips.
- **Schatten** nur für Schwebendes: `--sh-1` für die untere Leiste, `--sh-2` für Sheets. Kacheln haben keinen Schatten.
- **Antippflächen** mindestens 44 px (`--tap`).

## 6. Komponenten

Klassen stehen in `src/styles/app.css`. Bestehende Komponenten wiederverwenden, bevor neue entstehen.

| Komponente | Klasse | Regel |
| --- | --- | --- |
| Hauptbutton | `.btn.btn-primary` | einmal pro Screen, grün, Verb als Text ("Speichern") |
| Nebenbutton | `.btn` | neutral mit Rahmen |
| Löschbutton | `.btn.btn-danger` | rot, nur für Unwiderrufliches, immer mit Rückfrage |
| Icon-Button | `.icon-btn` | 44 px, immer mit `aria-label` |
| Chip | `.chip`, aktiv `.chip.is-on` | Filter und Mehrfachauswahl |
| Kachel | `.tile` | Kleidung 3:4 auf `--c-tile`, Name darunter |
| Sheet | `.sheet` | Formulare und Details, von unten, am Desktop mittig |
| Feld | `.field` | Beschriftung über der Eingabe |
| Leerer Zustand | `.empty` | ein Satz, was hier erscheint, plus die eine Aktion |
| Hinweis | `.note` | kurze Rückmeldung in einem Satz |
| Bühne | `.stage` | Avatar-Fläche 3:4, füllt auf der Anprobe die freie Höhe |
| Seitenkarte | `.side` | Nachbar-Teil im Karussell, links und rechts der Bühne, je Körperzone |
| Umschalter | `.segment` | zwei bis drei gleichrangige Ansichten |
| Regler-Leiste | `.panel` | Feineinstellung direkt unter der Bühne, ohne Sheet |
| Toast | `.toast` | kurze Bestätigung über der unteren Leiste, verschwindet von selbst |
| Untere Leiste | `.nav` | drei Bereiche: Anprobe, Schrank, Outfits |

## 6a. Der Hauptscreen (Anprobe)

- Der Avatar steht mittig auf der Bühne. Ohne eigenes Foto ist es eine schlichte graue Figur.
- Je Körperzone (Jacke, Oberteil, Hose, Schuhe) gibt es ein Karussell. Das mittlere Teil ist angezogen, die Nachbarn liegen als Seitenkarten links und rechts auf Höhe der Zone.
- Wechseln per Wisch über die Zone oder Tipp auf eine Seitenkarte. Das neue Teil gleitet aus der Wischrichtung herein.
- Über der Bühne liegt genau eine Chip-Reihe als Filter (Jahreszeit, Stil). Unter der Bühne stehen eine Zeile Bewertung und eine Zeile Aktionen. Mehr kommt auf diesen Screen nicht.
- Der Screen scrollt nicht. Die Bühne nimmt den Platz, der übrig bleibt.

## 7. Icons

- Eigene Linien-Icons aus `src/icons.tsx`, 24er-Raster, Strichstärke 1.75, runde Enden und Ecken, Farbe `currentColor`.
- Keine gefüllten Icons, keine Emojis, keine gemischten Icon-Sets.
- Ein Icon steht nie allein für eine unklare Aktion. Im Zweifel Text dazu.

## 8. Bildsprache

- **Kleidung:** von oben fotografiert, flach liegend, freigestellt, vollständig sichtbar, mit etwas Luft zum Rand. Immer `object-fit: contain`, nie beschnitten.
- **Avatar:** eigenes Ganzkörperfoto, frontal, aufrecht, Arme leicht ab, heller ruhiger Hintergrund, füllt die Bühne im Format 3:4. Sonst die Standard-Figur in neutralem Grau ohne Gesicht.
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
- **Bereiche:** Anprobe, Schrank, Outfits (der Kalender ist eine Ansicht in Outfits)

## 12. Checkliste vor jedem neuen Screen

1. Nur Tokens benutzt, keine festen Farben, Größen oder Abstände?
2. Genau eine grüne Hauptaktion, und höchstens ein Sheet über dem Bereich?
3. Kleidung auf `--c-tile`, vollständig sichtbar?
4. Hell und dunkel geprüft, bei 390 px Breite ohne Querscrollen?
5. Texte in Du-Form, Buttons als Verben, feste Begriffe eingehalten?
6. Alles Antippbare mindestens 44 px, mit sichtbarem Fokus?
