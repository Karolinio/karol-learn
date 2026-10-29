# karol-learn: Plan (planner, 27.10.2026)

Fünf Artefakte in einer Datei: PRD, Architektur, System-Design, Tech-Doc, Task-Liste.

## 1. PRD

**Problem:** Karol (ADHS, lernt visuell, schreibt keinen Code) braucht einen täglichen, kurzen und belohnenden Lernweg vom Amateur zum Forward Deployed Engineer (FDE) und AI Engineer (AIE). Anki und Quizlet sind ihm zu textlastig, zu generisch und zu hässlich.

**Ziele Phase 1**
- Eine Session aus 10 Karten startet mit einem Knopf und ist in unter 5 Minuten fertig.
- Die Tracks `aie` und `fde` sind streng getrennt, mit eigenem Fortschritt und eigener Roadmap.
- Der Video-Tutor macht aus einem Transkript Kartenvorschläge. Karol nimmt sie per Swipe an oder lehnt sie ab.
- Die App läuft statisch: lokal, als PWA auf dem iPhone und auf statischem Hosting für Kollegen.

**Nicht-Ziele Phase 1:** Login, Sync, Cloud-Backend, Dark Mode, Inhalte von roadmap.sh (nur Links, Lizenz).

**Erfolg**
- ~500 gültige Karten.
- An 5 Tagen hintereinander genutzt.
- Lighthouse PWA und Accessibility ≥ 90.
- Der Tutor liefert pro Video ≥ 10 Vorschläge mit < 20 % Dubletten.

**Bildschirm-Prinzip:** Eine Sache pro Bildschirm. Kein Absatz über 3 Zeilen. Sofortige Rückmeldung durch Kippen, Farbe und Feder-Animation. Eine Session endet nach 10 Karten.

## 2. Architektur

```
karol-learn/
  README.md  AGENTS.md  .env.example  package.json (npm workspaces)
  docs/      plan.md
  inhalt/
    meta.json                      Version, Stand, Legende der Stufen
    rohbestand/*.json              Eingangsdateien {karten:[...]}, Quelle für aufteilen
    karten/aie/<thema-slug>.json   {track, thema, karten:[...]}
    karten/fde/<thema-slug>.json
    roadmap/aie.json  roadmap/fde.json   Knoten, Kanten, themen[], link?
    vorschlaege/<lauf-id>.json     schreibt nur der Tutor
    meldungen/                     gemeldete Karten (über den Server)
  packages/karten-kern/src/
    typen.ts  validierung.ts  slug.ts  wiederholung.ts  auswahl.ts  dubletten.ts  *.test.ts
  apps/web/      Vite + React + TS, PWA (vite-plugin-pwa)
    src/routes/  heute stapel fertig fortschritt roadmap lexikon skizze-loop eingang einstellungen
    src/components/ui/  Button Sheet ProgressRing SwipeCard TabBar
    src/lib/  speicher.ts inhalt.ts server.ts
    src/styles/  tokens.css global.css
    e2e/smoke.spec.ts  playwright.config.ts
  apps/server/   Node (node:http oder Hono), nur 127.0.0.1:8810
  agents/video-tutor/
    agent.json  prompt.md  schema/vorschlag.schema.json  run.ts  laeufe/
  scripts/  aufteilen.ts pruefen.ts index-bauen.ts
```

- Web, Server, Tutor und Scripts importieren alle `@karol-learn/karten-kern`. Untereinander kennen sie sich nicht.
- `scripts/index-bauen.ts` erzeugt beim Build `apps/web/public/inhalt/index.json` mit allen Karten und Roadmaps. Die Web-App liest nur diese Datei und läuft darum statisch.
- Die App findet den Server über `GET /api/status` mit 800 ms Timeout. Ohne Server wird der Eingang ausgeblendet, und Meldungen bleiben lokal.
- Gleiche Themennamen kommen in beiden Tracks vor („Schnittstellen", „Sicherheit"). Maßgeblich für den Track ist der Ordner. Die Validierung prüft, dass Track und Pfad zusammenpassen.
- Dateinamen entstehen über `slug()`: `Wissen & RAG` → `wissen-und-rag`, Umlaute ä→ae usw.

## 3. System-Design

### Datenmodell

```ts
type Track = 'aie' | 'fde'; type Stufe = 1 | 2 | 3;
interface Karte { id; track; thema; stufe; frage; antwort; quelle }
interface ThemenDatei { track; thema; karten: Karte[] }
interface Lernstand { id; box: 0..5; faellig: ISO; richtig; falsch; serie; zuletzt?; gemeldet? }
interface Session { id; track; start; ende?; karten: string[]; antworten: {id, gewusst, ms}[] }
interface Vorschlag extends Karte { vorschlagId; begruendung; dublettVon?; status: 'offen'|'angenommen'|'abgelehnt' }
interface SpeicherExport { version: 1; exportiert; lernstand; sessions; einstellungen }
```

**Validierung**
- Die `id` ist eindeutig über alle Dateien und beginnt mit `<track>-`.
- Der `track` der Karte entspricht dem Ordner, das `thema` der Datei.
- `frage` hat höchstens 160 Zeichen, `antwort` höchstens 400.
- Die `quelle` darf nicht leer sein.

### Wiederholung: Leitner mit 6 Boxen

- **Abstände:** Box 1 → 0 Tage, Box 2 → 1, Box 3 → 3, Box 4 → 7, Box 5 → 21.
- **Rechts (gewusst):** eine Box höher, höchstens 5. `faellig` = heute + Abstand.
- **Links (nicht gewusst):** zurück in Box 1. In dieser Session nach 3 weiteren Karten erneut, höchstens zweimal pro Session. `faellig` = morgen.
- **Stufen des Lernstands:** Box ≥ 4 = „kann ich", Box 1–3 = „lerne ich", Box 0 = „offen".
- **Auswahl** (10 Karten, immer nur ein Track): zuerst fällige Karten nach Fälligkeit, dann neue Karten. Neue Karten nach Stufe 1 → 2 → 3, je Thema in Roadmap-Reihenfolge, höchstens 10 neue pro Session (Einstellung: 5, 10 oder 20; bei 20 wächst die Session auf 20).
- Signaturen: `bewerte(stand, gewusst, heute)`, `waehleSession(karten, staende, track, n=10, heute)`, `fortschritt(karten, staende)`. Alle drei sind pur und erzeugen neue Objekte.

### Routen

| Route | Inhalt |
|---|---|
| `/` Heute | Segment für den Track, ein großer Knopf „10 Karten", darunter die Tagesserie |
| `/stapel/:track` | SwipeCard: Tippen dreht, links rot, rechts grün, Tasten ←/→/Leertaste. Dünner Fortschrittsbalken, „Melden" |
| `/fertig` | x von 10 gewusst, nächster Termin |
| `/fortschritt/:track` | Ring für den ganzen Track, dreifarbiger Balken je Thema |
| `/roadmap/:track` | Knoten-Graph aus `roadmap/<track>.json`, Farbe nach Lernstand; Tippen öffnet ein Sheet mit „Diese lernen" |
| `/lexikon` | Suche mit Filter nach Track und Thema, Detail im Sheet |
| `/skizze/agent-loop` | Klick-Diagramm Runtime ⊃ Harness, Schritte mit „Weiter", Gateway-Zweig umschaltbar |
| `/eingang` | nur mit Server: Vorschläge als Swipe-Stapel, rechts annehmen, links ablehnen |
| `/einstellungen` | Export, Import, Zurücksetzen, Server-Status |

Tab-Leiste mit 5 Tabs: Heute, Roadmap, Skizzen, Lexikon, Mehr. Neu: `/thema/:track/:slug` (Themen-Detail mit Bild), `/skizzen`, `/skizze/:id`.

### Server (127.0.0.1:8810, CORS nur für die Vite-Origin)

| Methode | Pfad | Wirkung |
|---|---|---|
| GET | `/api/status` | `{ok, version}` |
| GET | `/api/vorschlaege` | offene Vorschläge |
| POST | `/api/vorschlaege/:vid/annehmen` | validiert die Karte, hängt sie an die Themen-Datei an (atomar: tmp + rename) |
| POST | `/api/vorschlaege/:vid/ablehnen` | setzt den Status, löscht nichts |
| POST | `/api/meldungen` | `{id, grund}` → `inhalt/meldungen/<datum>.jsonl` |

Antworten kommen immer als `{success, data, error}`. Eingaben werden mit zod geprüft. Pfade entstehen nur aus Slugs.

## 4. Tech-Doc

- **Stack:** Node ≥ 20, npm workspaces, Vite, React, TypeScript strict, React Router, Framer Motion, zod, idb-keyval, vite-plugin-pwa, Vitest, Playwright (`channel: 'chrome'`, headless).
- **Speicher:** IndexedDB. Jeder Zugriff steht in try/catch. Ersatz ist localStorage, letzter Ersatz der Speicher im RAM mit einem Hinweis. Export und Import als JSON, der Import prüft das Schema. Dazu `navigator.storage.persist()`.
- **Look:** Apple-nativ und hell.
  - Systemschrift `-apple-system`.
  - Hintergrund `#F2F2F7`, Karten weiß mit Radius 20, große Titel 34 px.
  - Farben semantisch: Grün = gewusst/kann ich, Rot = nicht gewusst, Blau = Aktion, Orange = lerne ich.
  - Animationen nur über transform und opacity. `prefers-reduced-motion` wird beachtet. Safe-Area-Insets.
- **Video-Tutor**
  1. Start: `npm run tutor -- <transkript.txt> --quelle "<Titel/URL>" [--track aie|fde]`.
  2. Eingaben prüfen: Die Datei existiert, ist kleiner als 400 KB und ist Text. `--quelle` muss gesetzt sein.
  3. `agent.json` laden: `max_vorschlaege` = 25, erlaubter Schreibpfad `inhalt/vorschlaege/`, Timeout 300 s.
  4. Alle Karten über karten-kern laden und eine Dublettenliste bauen (id + frage, nach Track).
  5. Prompt zusammensetzen: `prompt.md` + Dublettenliste + Transkript.
  6. Modell aufrufen: `claude -p --output-format json --json-schema <schema>` per `execFile`, ohne Shell, Prompt über stdin. Das läuft über Karols Claude-Abo (Weg A: fremder Harness per CLI).
  7. Antwort parsen, gegen zod prüfen, ungültige Vorschläge verwerfen und zählen.
  8. Dubletten lokal markieren: gleiche id oder Jaccard-Ähnlichkeit der Frage ≥ 0,7 → `dublettVon`.
  9. Schreiben nur, wenn der Zielpfad im erlaubten Ordner liegt (Mini-Mandat).
  10. Log nach `laeufe/<lauf-id>.json`: Quelle, Hash, Dauer, Zählungen, Exit-Code, Fehler.
  11. Konsole: „12 Vorschläge, 3 Dubletten → im Eingang prüfen".
- **npm-Skripte:** `dev` (web + server), `dev:web`, `build`, `test`, `test:e2e`, `pruefen`, `aufteilen`, `tutor`.

## 5. Task-Liste

1. **Gerüst:** Workspaces, tsconfig, README, AGENTS.md (≤ 40 Zeilen), `.env.example`, `.gitignore`, `git init`. Fertig, wenn `npm install` und `npm test` laufen.
2. **karten-kern:** Typen, Slug, Validierung (TDD). Fertig, wenn Tests doppelte ids, falschen Track, Überlänge und Umlaut-Slugs abdecken. Coverage ≥ 80 %.
3. **aufteilen + pruefen:** aus `inhalt/rohbestand/*.json` → `karten/<track>/<slug>.json`. Fertig, wenn `pruefen` grün ist.
4. **Wiederholung und Auswahl** (TDD). Fertig, wenn die Box-Grenzen, das Wiederholen in der Session, die Fälligkeit, das Limit von 5 neuen Karten und die Track-Trennung getestet sind.
5. **Web-Gerüst:** Router, Tab-Leiste, Tokens, `index-bauen`.
6. **Speicher** mit Ersatz-Kette, Export und Import, getestet.
7. **Heute und Stapel:** SwipeCard und Fertig-Bildschirm. Fertig, wenn der Lernstand ein Neuladen übersteht und Reduced Motion beachtet wird.
8. **Fortschritt und Roadmap**, mit eigenen Formulierungen und Links zu roadmap.sh.
9. **Lexikon:** Suche über 500 Karten in unter 50 ms.
10. **Skizze Agent-Loop:** Tastatur und Touch, jeder Schritt verlinkt auf eine Lexikon-Karte.
11. **Server:** Integrationstests in einem Temp-Ordner, `../` wird abgelehnt.
12. **Video-Tutor:** testbar mit einem Fake-`claude` im PATH; Schreibversuche außerhalb des erlaubten Ordners scheitern.
13. **Eingang und Melden** in der Web-App.
14. **PWA und Politur:** Screenshots bei 375, 768 und 1440 px.
15. **Inhalt ~500 Karten.** Fertig, wenn `pruefen` grün ist und jedes Roadmap-Thema Karten hat.
16. **Playwright-Smoke** gegen den statischen Build.

## Risiken

- **Die Ausgabe von `claude -p` ändert sich.** Gegenmaßnahme: Parser an einer Stelle, Fake-Binary im Test.
- **iOS löscht Speicher nicht installierter Seiten.** Gegenmaßnahme: PWA, `persist()`, Erinnerung an den Export.
- **Kartenqualität.** Gegenmaßnahme: Swipe-Gate, Ähnlichkeitsprüfung, Melden.
- **Lizenz von roadmap.sh.** Gegenmaßnahme: nur eigene Texte und Links.
- **8 GB RAM.** Gegenmaßnahme: kein lokales Modell, kein Electron.
- **Bundle < 300 KB gzip.** Gegenmaßnahme: Roadmap-Graph als SVG ohne Graph-Bibliothek.
- **wiya-Karten auf öffentlichem Hosting.** Gegenmaßnahme: `KL_AUSSCHLIESSEN` beim Build.
