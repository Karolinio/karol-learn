# karol-learn

Lern-App für Forward Deployed Engineering (`fde`) und AI Engineering (`aie`).
Kurze Sessions mit 10 Karten (neue Karten pro Session wählbar: 5, 10, 20), Swipe statt Tippen, Leitner-Wiederholung mit 6 Boxen.
Läuft statisch (auch als PWA auf dem iPhone). Ein kleiner lokaler Server und der Video-Tutor sind optional.

Der verbindliche Plan liegt in `docs/plan.md`, die Design-Notizen in `docs/design.md`.

## Start

```bash
npm install          # einmal (npm workspaces, kein pnpm)
npm run dev          # Web auf http://127.0.0.1:5180 und Server auf 127.0.0.1:8810
npm run dev:web      # nur die Web-App
```

Statisch: `npm run build` legt alles in `apps/web/dist/`. Jeder statische Webserver reicht, z. B.
`npm run preview -w @karol-learn/web` (http://127.0.0.1:4180). Ohne Server fehlt nur der Eingang.
Für öffentliches Hosting Themen ausblenden: `KL_AUSSCHLIESSEN=wiya npm run build`.

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm test` | Vitest für karten-kern, Server, Tutor und Speicher, mit Coverage-Grenze 80 % für karten-kern |
| `npm run aufteilen` | `inhalt/rohbestand/*.json` → `inhalt/karten/<track>/<thema>.json`. Wiederholbar; im Eingang angenommene Karten bleiben erhalten |
| `npm run pruefen` | Validiert alle Karten und Roadmaps (ids, Track = Ordner, Längen, jedes Roadmap-Thema hat Karten), warnt bei fehlenden Themenbildern und prüft die Repo-Struktur |
| `npm run hooks` | Schaltet den Pre-Commit-Hook ein (`.githooks/pre-commit`: pruefen + test) |
| `npm run handy` | Baut und startet die App im WLAN, druckt die Adresse fürs Handy |
| `npm run build` | pruefen, Index bauen, Web-App bauen |
| `npm run test:e2e` | baut und testet den statischen Build mit Playwright (installiertes Chrome, headless) |
| `npm run tutor` | Video-Tutor, siehe unten |

## Inhalt

- Quelle sind die Dateien in `inhalt/rohbestand/`. Neue Datei hineinlegen, dann `npm run aufteilen && npm run pruefen`.
- Themen werden normalisiert: „Modell" → „Modelle", „Werkzeuge" → „Runtime".
- Bei doppelter id oder fast gleicher Frage im selben Track bleibt die erste Karte; `aufteilen` listet die verworfenen.
- `inhalt/karten.json` ist das alte Original und wird nicht mehr gelesen.
- Lernpfade: `inhalt/roadmap/aie.json` und `fde.json`. Eigene Kurztexte, nur Links zu roadmap.sh.

## Aufs Handy

1. `npm run handy`. Die Ausgabe zeigt z. B. `http://192.168.178.20:4190/`.
2. Handy im gleichen WLAN, die Adresse in Safari öffnen.
3. Teilen → **Zum Home-Bildschirm**. Die App startet dann ohne Browserleiste.

Über `http` im LAN gibt es keinen Service Worker und damit keinen Offline-Modus. Den gibt es erst mit HTTPS-Hosting
(dann sind auch alle Themenbilder offline im Cache). Der Lernstand liegt pro Gerät; zum Umziehen **Mehr → Einstellungen → Export**.

## Skizzen und Bilder

- Skizzen sind durchklickbare SVGs in `apps/web/src/skizzen/` (eine Datei pro Skizze, Liste in `registry.ts`), erreichbar über den Tab **Skizzen** und `/skizze/<id>`.
  Karten mit Feld `skizze` oder passendem Thema zeigen auf der Rückseite „Skizze ansehen“.
- Themenbilder liegen in `inhalt/bilder/themen/` (KI-generiert, Herkunft in `herkunft.json`). `npm run index` kopiert sie nach `apps/web/public/inhalt/bilder/`.

## So nutzt du den Tutor

Der Tutor macht aus einem Video-Transkript Kartenvorschläge. Er läuft über dein Claude-Abo mit
`claude -p` (Modell `sonnet`, ohne Tools) und braucht keinen API-Key.

1. Transkript als Textdatei speichern (kleiner als 400 KB).
2. Tutor starten:

   ```bash
   npm run tutor -- ~/Downloads/transkript.txt --quelle "YouTube: Prompt Caching erklärt" --track aie
   ```

3. Ausgabe z. B. `12 Vorschläge, 3 Dubletten → im Eingang prüfen`.
4. `npm run dev` starten, in der App **Mehr → Eingang** öffnen: rechts wischen = annehmen, links = ablehnen.
   Angenommene Karten landen in `inhalt/karten/`. Danach `npm run pruefen`.

Der Tutor schreibt nur nach `inhalt/vorschlaege/` und loggt jeden Lauf nach `agents/video-tutor/laeufe/`.
Anderes Binary: `KL_CLAUDE_BIN=/pfad/zu/claude`.

## Aufbau

```
packages/karten-kern   Typen, Validierung, Slug, Leitner, Auswahl, Dubletten, Suche (pur, getestet)
apps/web               Vite + React + Framer Motion, PWA, liest nur public/inhalt/index.json
apps/server            node:http auf 127.0.0.1:8810, nur für Eingang und Meldungen
agents/video-tutor     CLI um claude -p, Fake-claude für Tests in test/
scripts                aufteilen, pruefen, index-bauen, struktur-pruefen, handy
```

Was wohin gehört, steht in `docs/STRUKTUR.md`; `npm run pruefen` hält es ein.

Lernstand liegt im Browser (IndexedDB, Ersatz localStorage, zuletzt RAM). Sichern über **Mehr → Einstellungen → Export**.
