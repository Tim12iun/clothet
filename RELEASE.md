# Clothet: Stand für die Veröffentlichung

Version 1.0.0. Diese Datei sagt, was geprüft ist, was offen ist und was nur du am echten Gerät prüfen kannst.

## Automatisch geprüft

`npm test` baut die App und prüft sie mit Playwright in Chromium auf sechs Geräteprofilen: iPhone SE, iPhone 13 hoch und quer, Pixel 7, Desktop hell (1440 breit) und Desktop dunkel. Letzter vollständiger Lauf: alle Prüfungen grün.

| Was | Wie geprüft |
| --- | --- |
| Das Dokument scrollt nie, nichts ragt seitlich heraus | jeder Bereich, jedes Sheet und die Avatar-Einrichtung bei 320, 360, 375, 390, 430, 768, 1024 und 1440 Breite und quer bei 568×320, 667×375, 844×390, 932×430 |
| Anprobe | Teil anziehen, würfeln, „Heute getragen“ mit einem Tipp, Rückgängig |
| Planer | Outfit speichern, Tag eintragen, in der Woche bestätigen und zurücknehmen, Monat, Statistik, Outfit löschen und wiederherstellen |
| Schrank | Teil aus Foto anlegen, suchen, sortieren, bearbeiten, löschen mit Rückgängig |
| Avatar | Selfie hinterlegen, Gesicht am großen Avatar ziehen und vergrößern, Körperform und Körpertyp wählen |
| Sitz der Teile | je Teil in „Teil bearbeiten“ per Knopf verschieben |
| Navigation | Adresse je Bereich, Neuladen bleibt im Bereich, Zurück und Escape schließen zuerst das Sheet, Fokus kehrt zurück |
| Tastatur | Hauptablauf ohne Zeiger (Desktop) |
| Barrierefreiheit | axe (WCAG 2.0 bis 2.2, A und AA) ohne Verstoß auf jedem Bereich und in jeder Überlagerung, hell und dunkel |
| Große Bestände | 1000 Teile mit sehr langen Namen, Suche darin |
| 200 Prozent Schrift | kein Überlauf in allen Bereichen |
| Sicherung | speichern, Schrank leeren, wieder laden |
| Offline | Hinweis beim Verlust des Netzes; nach dem ersten Besuch startet die App ohne Netz samt Schrift und Daten |
| Konsole | keine Fehler in allen Abläufen |

## Nicht geprüft oder offen

- **Echtes iPhone und Safari.** Die Prüfungen laufen in Chromium mit Geräteprofilen. Adressleiste, Tastatur, sichere Ränder, Kamera und Gesten verhalten sich in Safari anders. Dafür ist die Liste unten.
- **Lighthouse** wurde nicht gemessen. Gebaut sind 77 KB JavaScript und 7 KB CSS (gzip) plus die Schrift.
- **Echte Fotos.** Freistellen und Farberkennung sind mit einfachen Testbildern geprüft, nicht mit Fotos aus einer Wohnung. Freistellen klappt nur auf ruhigem, einfarbigem Untergrund.
- **Passform.** Oberteile, Jacken und Hosen werden an die Figur angepasst. Geprüft ist das mit den gezeichneten Beispiel-Teilen, nicht mit echten Fotos. Die Punkte werden automatisch aus dem Umriss gelesen und lassen sich noch nicht von Hand korrigieren; sitzt ein Teil schlecht, hilft „Flach aufgelegt“ beim Teil. Kleider und Röcke liegen weiter flach.
- **Gesicht.** Es gibt keine Gesichtserkennung. Das Gesicht wird als Oval aus dem Selfie geschnitten und von Hand zurechtgerückt.
- **Interne Komponenten-Übersicht** (Phase 2 des Auftrags) gibt es nicht als eigene Seite. Die Bausteine sind in `DESIGN.md` beschrieben.
- **Querformat für installierte App auf iOS:** Startbilder gibt es nur für das Hochformat.

## Prüfliste am iPhone

Öffne https://tim12iun.github.io/clothet/ in Safari. Geh die Liste einmal im Safari-Tab und einmal als installierte App durch (Teilen, „Zum Home-Bildschirm“).

Rahmen
- [ ] Die Seite lässt sich nirgends als Ganzes verschieben oder aufziehen, auch nicht am oberen und unteren Rand.
- [ ] Nichts liegt unter der Notch, der Uhrzeit oder dem Strich unten. Die untere Leiste hat Luft zum Strich.
- [ ] Doppeltipp zoomt nirgends. Beim Tippen in ein Textfeld zoomt die Seite nicht.
- [ ] Im Querformat stehen Avatar und Schublade nebeneinander, nichts ist abgeschnitten.
- [ ] Installiert: Beim Start erscheint das Startbild mit dem Symbol, kein weißer Blitz.

Tastatur
- [ ] Schrank, Suchfeld: Das Feld bleibt über der Tastatur sichtbar.
- [ ] Teil hinzufügen, Name: Feld sichtbar, „Speichern“ nach dem Schließen der Tastatur erreichbar.
- [ ] Einstellungen, Farbregeln: Textfeld sichtbar, das Sheet scrollt, die Seite dahinter nicht.

Kamera und Fotos
- [ ] Teil hinzufügen, „Foto aufnehmen“: Safari fragt nach der Kamera, das Bild erscheint mit Umrisslinie.
- [ ] Ein Foto vom Teppich oder Bett: Wie gut klappt das Freistellen? Der Regler hilft.
- [ ] „Aus Fotos wählen“ mit einem normalen iPhone-Foto: Es wird geöffnet und steht richtig herum.
- [ ] Schuhe: zweites Foto von vorne, am Avatar steht ein Paar.

Avatar
- [ ] Einstellungen, „Avatar einrichten“, Selfie aufnehmen: Der Avatar erscheint groß mit deinem Gesicht.
- [ ] Gesicht mit einem Finger ziehen, mit zwei Fingern vergrößern: folgt dem Finger ohne Ruckeln, die Seite bewegt sich nicht mit.
- [ ] Körper: weiblich und männlich, Größe, Körpertyp, Hautton ändern sich sofort.
- [ ] Ein eigenes T-Shirt, einen Pullover und eine Hose fotografieren: Passt das Oberteil in der Größe zu den Schultern der Puppe (auch mit anliegenden Ärmeln), bleibt es unverzerrt, folgen die Hosenbeine den Beinen?
- [ ] „Teil bearbeiten“: Sitz am Avatar mit den vier Knöpfen ändern, gilt nur für dieses Teil.

Bedienung
- [ ] Wischen über eine Körperzone wechselt das Teil, ohne dass Safari zurückblättert.
- [ ] Ein Sheet lässt sich am Griff nach unten wegziehen.
- [ ] Die Wischgeste vom linken Rand (Zurück) schließt ein offenes Sheet und verlässt nicht die App.
- [ ] „Heute getragen“ trägt ein, „Rückgängig“ nimmt es zurück.
- [ ] Gedrückte Knöpfe reagieren sichtbar und bleiben danach nicht eingefärbt hängen.

Daten
- [ ] Flugmodus an, App schließen und neu öffnen: Der Schrank ist da.
- [ ] Sicherung speichern: Die Datei landet in „Dateien“. Sicherung laden bringt alles zurück.
- [ ] Nach einem Tag Pause sind die Teile noch da (Safari räumt selten genutzte Seiten auf, die installierte App ist besser geschützt).
- [ ] Dunkelmodus des iPhones: alles lesbar.
