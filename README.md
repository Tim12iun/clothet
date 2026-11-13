# Clothet

Dein Kleiderschrank als App: Teile fotografieren, am Avatar anziehen, Outfits würfeln, speichern und planen.

**App öffnen:** https://tim12iun.github.io/clothet/

## Auf dem iPhone installieren

1. Den Link oben in **Safari** öffnen.
2. Auf **Teilen** tippen, dann **Zum Home-Bildschirm**.
3. Clothet ab jetzt über das Icon öffnen. Die App läuft dann im Vollbild und auch ohne Internet.

Leg deine Teile erst nach der Installation an. Safari und die installierte App speichern getrennt, und alle Daten bleiben nur auf diesem Gerät.

## Entwickeln

```
npm install
npm run dev
```

`npm run build` prüft die Typen und baut nach `dist`. `npm test` prüft die App mit Playwright auf sechs Geräteprofilen (einmalig vorher `npx playwright install chromium`). Ein leerer Schrank lässt sich über die Adresse mit `?stress=1000` mit Testteilen füllen. Jeder Push auf `main` veröffentlicht automatisch auf GitHub Pages.
Design-Regeln stehen in [DESIGN.md](DESIGN.md).
Stand und Prüfliste für das echte Gerät stehen in [RELEASE.md](RELEASE.md).
