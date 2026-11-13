# Design-Recherche: Digitaler Kleiderschrank
### Wie die App eigenständig wirkt statt „KI-generiert“: helles Design, klare Design Language, durchgängiges Icon-System

---

## 1. Warum KI-Apps alle gleich aussehen

Eine KI ohne klare Vorgaben baut aus allem, was sie gesehen hat, einen Durchschnitt. Das Ergebnis ist der „Durchschnitt aller Apps“. Laut mehreren Quellen passiert das vor allem dann, wenn man eine UI-Bibliothek (z. B. shadcn/Tailwind) installiert, die Standardwerte übernimmt und die KI einfach „mach es schön“ bauen lässt.

### Typische Merkmale eines KI-Designs (diese aktiv vermeiden)

| Merkmal | Warum es auffällt | Was stattdessen |
|---|---|---|
| **Inter / Roboto / System-Font überall** | Das bekannteste Merkmal überhaupt | Eine eigene Schrift wählen (siehe Kapitel 4) |
| **Lila/blaue Verläufe** | Standard-Trendfarben | Eine eigene, zurückhaltende Palette mit **einer** Akzentfarbe |
| **Tailwind-Blau (#3B82F6) als Primärfarbe** | Sofort zu erkennen | Eine Farbe, die zum Thema Mode/Stoff passt |
| **Karten mit Rahmen + Schatten, Karte in Karte** | Wirkt nach Baukasten | Weniger Rahmen, mehr Weißraum, Bilder tragen das Layout |
| **Icon + Überschrift + 2 Zeilen Text in 3er-Raster** | Das typische Feature-Block-Muster | Inhalte (Kleidungsfotos) in den Mittelpunkt stellen |
| **Überall gleich starke Rundungen (rounded-xl)** | „Bubbly“-Look, beliebig | Einen festen Radius-Wert definieren und überall nutzen |
| **Bounce- und Fade-Animationen überall** | Verspielt ohne Grund | Wenige, ruhige Übergänge mit Zweck |
| **Emojis als Icons** | Wirkt unprofessionell | **Ein** Icon-Set, konsequent |
| **Gemischte Icon-Sets** | Unterschiedliche Strichstärken | Nur ein Set, eine Strichstärke, eine Größe |

**Grundsatz:** Zuerst das Design festlegen (Farben, Schrift, Abstände, Icons, Radius als *Tokens*), dann die KI dagegen bauen lassen. Nicht umgekehrt.

Quellen: [vp0 – Why does my AI app look generic](https://vp0.com/blogs/why-does-my-ai-app-look-generic) · [dev.to – How to fix the AI-generated look](https://dev.to/alanwest/how-to-fix-the-ai-generated-look-in-your-frontend-1ahh) · [MindStudio – Avoid AI slop (Design System Approach)](https://www.mindstudio.ai/blog/claude-design-avoid-ai-slop-design-system) · [Pixso – Prevent AI from making all UIs look the same](https://pixso.net/articles/how-to-prevent-ai-from-making-all-uis-look-the-same/) · [Superdesign – 5 Fixes](https://superdesign.dev/blog/how-to-make-ai-ui-look-less-generic)

> Wichtiger Hinweis aus der Recherche: Nur eine Farbe auszutauschen reicht nicht. Ein terrakottafarbener Button in einem Standard-Layout sieht trotzdem nach KI aus. **Das Layout selbst** muss eigenständig sein.

---

## 2. Vorschlag für eine Design-Richtung: „Atelier / Editorial Light“

Ein Kleiderschrank ist ein **Mode-Produkt**, kein SaaS-Dashboard. Gute Vorbilder sind daher Modemagazine, Lookbooks und Boutiquen, keine Tech-Apps.

### Leitidee
> *„Ruhig wie ein gut sortierter Schrank. Die Kleidung ist der Star, die UI tritt zurück.“*

### Prinzipien
1. **Die Fotos tragen das Design.** Freigestellte Kleidung auf einem warmen, hellen Hintergrund, viel Weißraum. Die UI hat kaum eigene Farbe.
2. **Editorial-Typografie.** Überschriften in einer Serif-Schrift (Magazin-Gefühl), UI-Texte in einer klaren Sans-Schrift.
3. **Warmes Hell statt kaltem Weiß.** Kein reines `#FFFFFF` mit Grau, sondern Papier-, Leinen- oder Kreidetöne.
4. **Eine einzige Akzentfarbe**, sparsam eingesetzt (aktiver Tab, Primär-Button, Favoriten).
5. **Wenig Rahmen, wenig Schatten.** Flächen statt Boxen. Trennung durch Abstand und Hintergrund-Ton.
6. **Ein Raster, ein Abstands-System, ein Radius.** Alles abgeleitet, nichts frei gewählt.

### Beispiel-Palette (Startpunkt, bitte anpassen)

| Token | Wert | Verwendung |
|---|---|---|
| `bg` | `#F7F4EF` | App-Hintergrund (warmes Papier) |
| `surface` | `#FFFDFA` | Flächen, Sheets |
| `surface-muted` | `#EFEAE2` | Bild-Hintergrund für Kleidung, Chips |
| `line` | `#E2DCD2` | Haarlinien (1px, nur wenn nötig) |
| `ink` | `#1E1B18` | Haupttext (fast Schwarz, warm) |
| `ink-muted` | `#6E675F` | Sekundärtext |
| `accent` | `#8A5A44` (Cognac) **oder** `#3E5A4C` (Salbei-Tanne) | Eine Akzentfarbe, nicht beide |
| `danger` | `#B3432F` | Löschen, Fehler |

→ Kontraste prüfen (WCAG AA, mindestens 4.5:1 für Text).

### Form-System
- **Radius:** ein Wert für alles, z. B. `6px` (präzise, hochwertig) **oder** `0px` (sehr editorial). Kein Mix aus 8/12/16/24.
- **Abstände:** 4er-Raster → `4, 8, 12, 16, 24, 32, 48, 64`.
- **Bilder:** feste Seitenverhältnisse, z. B. `3:4` für Kleidungsstücke und `4:5` für Outfits.
- **Schatten:** höchstens einer, sehr weich, nur für schwebende Elemente (Bottom Sheet, FAB).

### Was die App von Konkurrenten abheben kann
- **Outfit-Ansicht als Collage/Lookbook-Seite** statt Karten-Raster.
- **Kategorien als Typografie** (große Serif-Wörter „Tops“, „Hosen“, „Schuhe“) statt Icon-Kacheln.
- **Kleine, eigene Details:** z. B. ein Etikett- oder Waschzettel-Motiv für Item-Details (Marke, Material, Größe). Das ist thematisch passend und nicht austauschbar.

---

## 3. Icons: ein Set, eine Regel

### Empfehlung
| Set | Warum für dich | Link |
|---|---|---|
| **Phosphor** ⭐ | 6 Gewichte (thin, light, regular, bold, fill, duotone). Ideal: *light* für die UI, *fill* für aktive Zustände, alles aus einer Familie | [phosphoricons.com](https://phosphoricons.com) |
| **Iconoir** | Freundlich, ruhig, gut für helle Designs | [iconoir.com](https://iconoir.com) |
| **Lucide** | Sehr konsistent, aber **wird von KI-Tools sehr oft als Standard benutzt**, wirkt daher schnell „KI“ | [lucide.dev](https://lucide.dev) |
| **Tabler** | 5.000+ Icons, eher technisch/Dashboard | [tabler.io/icons](https://tabler.io/icons) |
| **Hugeicons** | Große Auswahl, mehrere Stile | [hugeicons.com](https://hugeicons.com) |
| **Streamline** (teils kostenpflichtig) | Sehr viele Stile, auch Mode-Motive | [streamlinehq.com](https://www.streamlinehq.com) |

### Icon-Regeln (in den Styleguide schreiben)
- **Nur ein Set.** Nie Phosphor und Heroicons mischen.
- **Eine Größe für die UI** (z. B. 22 oder 24 px), eine Größe für kleine Elemente (16 px).
- **Strichstärke passend zur Schrift:** leichte Schrift → *light*-Icons, normale Schrift → *regular*.
- **Inaktiv = Outline, aktiv = Fill** (z. B. in der Tab-Bar).
- **Fehlt ein Icon** (z. B. Kleiderbügel, Socke, Gürtel): selbst zeichnen, auf **demselben 24×24-Raster mit derselben Strichstärke und denselben Linienenden**. Genau diese eigenen Icons machen die App unverwechselbar.
- Icons immer mit Text-Label, wo der Sinn nicht eindeutig ist.

Quellen: [OpenReplay – SVG Icon Libraries](https://blog.openreplay.com/svg-icon-libraries-web-apps/) · [Lucide vs Tabler vs Phosphor](https://sveltekitui.pages.dev/blog/svelte-icon-libraries-compared) · [Muzli – Best Free Icon Libraries 2026](https://muz.li/blog/best-free-icon-libraries-for-ui-design-in-2026/) · [allsvgicons – Vergleich 2026](https://allsvgicons.com/blog/best-free-svg-icon-libraries-2026/)

---

## 4. Typografie: weg von Inter

### Kostenlose Quellen
- **Fontshare** (kostenlos, auch kommerziell): [fontshare.com](https://www.fontshare.com) → Satoshi, General Sans, Switzer, Supreme, Erode, Gambetta, Sentient
- **Google Fonts**: [fonts.google.com](https://fonts.google.com)
- **Velvetyne** (eigenwillige Open-Source-Fonts): [velvetyne.fr](https://velvetyne.fr)
- **Collletttivo** (Open-Source, editorial): [collletttivo.it](https://www.collletttivo.it)
- Paarungen testen: [fontpair.co](https://www.fontpair.co) · [typescale.com](https://typescale.com) (Schriftgrößen-Skala)

### Kombinations-Vorschläge für eine Mode-App
| Überschriften (Serif) | UI/Text (Sans) | Wirkung |
|---|---|---|
| **Instrument Serif** (Google) | **General Sans** (Fontshare) | Modern-editorial, leicht |
| **Gambetta** oder **Erode** (Fontshare) | **Switzer** (Fontshare) | Ruhig, hochwertig, „Boutique“ |
| **Fraunces** (Google, variabel) | **DM Sans** (Google) | Wärmer, freundlicher |
| — nur Sans — **Satoshi** | Satoshi | Clean, aber nicht Inter |

**Regeln:** maximal 2 Schriften · eine feste Größen-Skala (z. B. 12 / 14 / 16 / 20 / 28 / 40) · Serif nur für Überschriften und große Momente, nie für Buttons.

---

## 5. Wo man Design-Systeme und Styleguides findet (zum Lernen und Nachbauen)

### Sammlungen von Design-Systemen
| Quelle | Was es ist | Link |
|---|---|---|
| **The Component Gallery** ⭐ | 60 Komponenten-Typen aus 95 echten Design-Systemen nebeneinander. Super, um z. B. „Chips“ oder „Bottom Sheets“ zu vergleichen | [component.gallery](https://component.gallery) |
| **Design Systems Repo** | Öffentliche Design-Systeme und Styleguides | [designsystemsrepo.com](https://designsystemsrepo.com) |
| **awesome-design-systems** (GitHub) | Große kuratierte Liste | [github.com/alexpate/awesome-design-systems](https://github.com/alexpate/awesome-design-systems) |
| **Adele (UXPin)** | Datenbank öffentlicher Design-Systeme | [adele.uxpin.com](https://adele.uxpin.com) |
| **Storybook Showcase** | Echte Komponentenbibliotheken live ansehen | [storybook.js.org/showcase](https://storybook.js.org/showcase) |
| **Figma Community** | Kostenlose Design-System- und UI-Kits zum Duplizieren | [figma.com/community](https://www.figma.com/community) |

### Offizielle Systeme, die man studieren sollte
- **Apple Human Interface Guidelines**: Pflicht für iOS (Tab-Bar, Navigation, Sheets) → [developer.apple.com/design](https://developer.apple.com/design/human-interface-guidelines)
- **Material Design 3**: Pflicht für Android, gute Erklärungen zu Farb-Rollen und Tokens → [m3.material.io](https://m3.material.io)
- **Shopify Polaris**: sehr gute Doku zu Tonalität und Inhalten → [polaris.shopify.com](https://polaris.shopify.com)
- **IBM Carbon**: Vorbild für strenge Raster- und Icon-Regeln → [carbondesignsystem.com](https://carbondesignsystem.com)
- **Atlassian Design**: gutes Beispiel für Token-Struktur → [atlassian.design](https://atlassian.design)

> Tipp: Nicht die Optik kopieren, sondern **die Struktur der Doku**: Wie definieren die Farben, Abstände und Icon-Regeln? Diese Struktur dann mit den eigenen Werten füllen.

---

## 6. UI-Inspiration aus echten Apps (statt von Dribbble)

Dribbble-Shots sind oft Konzepte, und KI wurde genau darauf trainiert. Besser sind **echte, veröffentlichte Apps**.

| Quelle | Schwerpunkt | Link |
|---|---|---|
| **Mobbin** ⭐ | Riesige Bibliothek echter App-Screens und kompletter User-Flows (Onboarding, Einstellungen, Kauf …), Figma-Plugin | [mobbin.com](https://mobbin.com) |
| **Refero** | Starke visuelle Suche, eher Web | [refero.design](https://refero.design) |
| **Screenlane** | Komplette mobile Flows | [screenlane.com](https://screenlane.com) |
| **Pttrns** | iOS-Muster | [pttrns.com](https://pttrns.com) |
| **Appshots** | App- und Web-Screenshots | [appshots.design](https://appshots.design) |
| **Muzli** | Kuratierter Design-Feed | [muz.li](https://muz.li) |
| **Savee / Are.na / Cosmos** | Moodboards; ideal für Mode-, Editorial- und Print-Referenzen | [savee.it](https://savee.it) · [are.na](https://www.are.na) · [cosmos.so](https://www.cosmos.so) |

### Außerhalb von App-Design suchen (das bringt den Unterschied)
- **Mode-Webshops mit starkem Editorial-Design:** COS, Arket, & Other Stories, SSENSE, Toteme, Jacquemus, Aesop (Ton und Typografie)
- **Lookbooks und Magazine:** Kinfolk, Apartamento, Cereal (Weißraum, Bildführung)
- **Waschzettel, Etiketten, Hangtags:** perfekte Vorlage für eine eigene Detail-Ansicht

---

## 7. Konkurrenz: was andere Kleiderschrank-Apps machen

| App | Bekannt für | Design-Lernpunkt |
|---|---|---|
| **Whering** (UK) | Freistellung beim Upload, automatisches Taggen, „Clueless“-Shuffle für Outfits | Outfit-Builder gilt als einer der besten → genau anschauen |
| **Indyx** | Analysen (Farb- und Kategorie-Verteilung), echte Stylisten, Resale | Ruhiges, „zen“-artiges Erscheinungsbild |
| **Acloset** (Korea) | KI-Vorschläge, Wetter-Funktion, Social Feed | Mehr Feed/Social, weniger ruhig |
| **Stylebook** | Klassiker, funktional | Zeigt: Funktion allein gewinnt keine Design-Preise |
| **Combyne, Pureple, Fits, Cladwell** | Weitere Wettbewerber | Bei Mobbin/App Store Screenshots vergleichen |

**Chance:** Die meisten wirken entweder verspielt-bunt (Social) oder generisch-clean. Eine wirklich **editorial gestaltete**, warme, helle App mit eigener Typografie ist eine Lücke.

Quellen: [Good On You – Wardrobe apps im Test](https://goodonyou.eco/wardrobe-organising-apps/) · [Indyx – Acloset vs. Whering](https://www.myindyx.com/versus/acloset-vs-whering) · [Indyx – Stylebook vs. Whering](https://www.myindyx.com/versus/stylebook-vs-whering) · [futurezone.at – Kleiderschrank-Apps getestet](https://futurezone.at/apps/kleiderschrank-outfit-styling-apps-acloset-indyx-whering-ki-stylist-mode-fashion/403084823) · [Irish Times – Stylistin über Indyx](https://www.irishtimes.com/life-style/fashion/2026/02/09/how-a-fashion-app-changed-the-way-i-dress/)

---

## 8. Werkzeuge für Farben und Tokens

- **Realtime Colors**: Palette direkt an einer Beispielseite testen → [realtimecolors.com](https://www.realtimecolors.com)
- **Radix Colors**: durchdachte 12-Stufen-Skalen für UI (inkl. warmer Grautöne „Sand“, „Mauve“) → [radix-ui.com/colors](https://www.radix-ui.com/colors)
- **Adobe Leonardo**: Paletten auf Kontrast-Basis bauen → [leonardocolor.io](https://leonardocolor.io)
- **Coolors / Huemint**: Paletten-Ideen → [coolors.co](https://coolors.co) · [huemint.com](https://huemint.com)
- **Kontrast prüfen:** [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/)
- **Tokens in Figma verwalten:** Figma Variables oder das Plugin *Tokens Studio*

---

## 9. Vorgehen in 6 Schritten

1. **Moodboard** (Savee/Are.na): 20–30 Bilder aus Mode, Print und Boutiquen. **Keine** App-Screenshots.
2. **Drei Wörter festlegen**, die die App beschreiben (z. B. *ruhig, warm, präzise*). Jede Design-Entscheidung daran messen.
3. **Tokens definieren:** Farben, Schriften, Größen-Skala, Abstände, Radius, Schatten, Icon-Set und -Größe.
4. **5 Kern-Komponenten zuerst gestalten:** Item-Karte, Outfit-Ansicht, Tab-Bar, Filter-Chips, Bottom Sheet.
5. **`DESIGN.md` schreiben** (Vorlage unten) und der KI bei **jedem** Prompt mitgeben.
6. **Review mit der Checkliste** (Kapitel 11) und die KI-Merkmale aktiv entfernen.

---

## 10. Vorlage: `DESIGN.md` für die KI

Diese Datei ins Projekt legen und bei jeder UI-Aufgabe darauf verweisen. Die KI braucht **harte Regeln und Verbote**, nicht „mach es schön“.

```markdown
# DESIGN.md – [App-Name]

## Charakter
Ruhig, warm, präzise. Wie ein Mode-Lookbook, nicht wie eine Tech-App.
Die Kleidung (Fotos) ist der Star. Die UI tritt zurück.

## Farben (nur diese verwenden)
bg #F7F4EF | surface #FFFDFA | surface-muted #EFEAE2 | line #E2DCD2
ink #1E1B18 | ink-muted #6E675F | accent #8A5A44 | danger #B3432F

## Typografie
Headlines: Instrument Serif (nur Überschriften, nie Buttons)
UI/Text: General Sans
Skala: 12 / 14 / 16 / 20 / 28 / 40 – keine anderen Größen

## Layout
Abstände nur: 4, 8, 12, 16, 24, 32, 48, 64
Radius überall: 6px
Bildformate: Item 3:4, Outfit 4:5, Bildhintergrund surface-muted

## Icons
Nur Phosphor. UI = "light", 24px. Aktiv = "fill". Nie andere Sets, nie Emojis.

## VERBOTEN
- Inter, Roboto, System-Fonts
- Verläufe (Gradients) jeglicher Art
- Blau oder Lila als Farbe
- Karten mit Rahmen UND Schatten; Karten in Karten
- Mehr als ein Schatten-Stil
- Icon + Titel + Text im 3er-Raster
- Bounce-, Scale- oder Glow-Animationen
- Abweichende Radien (rounded-lg, rounded-2xl usw.)
```

---

## 11. Checkliste vor dem Release: „Sieht man die KI noch?“

- [ ] Kein Inter/Roboto, keine Systemschrift sichtbar
- [ ] Keine Verläufe, kein Blau/Lila als Standard
- [ ] Nur **ein** Icon-Set, gleiche Größe und Strichstärke überall
- [ ] Nur **ein** Radius-Wert in der ganzen App
- [ ] Alle Abstände aus dem 4er-Raster
- [ ] Höchstens eine Akzentfarbe, sparsam eingesetzt
- [ ] Kaum Rahmen, kaum Schatten; Trennung über Abstand und Farbfläche
- [ ] Mindestens 2–3 **eigene** Elemente (eigene Icons, Etikett-Detail, Lookbook-Layout)
- [ ] Leere Zustände (leerer Schrank, keine Outfits) bewusst gestaltet, nicht nur „No items found“
- [ ] Texte klingen menschlich und nach der Marke (kein „Unlock your style journey ✨“)
- [ ] Kontraste geprüft (WCAG AA)
- [ ] Neben 3 Konkurrenz-Apps gelegt: Ist sie sofort unterscheidbar?

---

*Recherche-Stand: November 2026*
