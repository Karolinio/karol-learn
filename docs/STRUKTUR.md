# Repo-Struktur

Das Repo bleibt von oben nach unten sauber. `npm run pruefen` prüft das mit `scripts/struktur-pruefen.ts`
(Positivliste in `scripts/struktur.ts`) und scheitert mit einer klaren Meldung. Der Pre-Commit-Hook
(`npm run hooks`, einmal pro Klon) lässt vor jedem Commit `npm run pruefen` und `npm test` laufen.
Geprüft wird, was git versionieren würde; alles aus `.gitignore` zählt nicht.

## Wurzel

Nur diese Dateien: `README.md`, `AGENTS.md`, `package.json`, `package-lock.json`, `tsconfig.base.json`,
`tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`. Keine Notizen, keine Exporte, keine Bilder.

| Ordner | Was hinein darf | Was nicht |
|---|---|---|
| `apps/<name>/` | Programme, die laufen (`web`, `server`). Jede App hat `package.json`. | geteilte Logik, Inhalte |
| `packages/<name>/` | geteilte, pure Logik mit Tests (`karten-kern`). Braucht `package.json` und `src/index.ts`. | UI, Dateizugriffe |
| `agents/<name>/` | ein Agent pro Ordner. Pflicht: `agent.json`, `prompt.md`, `README.md`. Code, Tests, `laeufe/` daneben. | Agenten-Ausgaben außerhalb des eigenen Schreibpfads |
| `inhalt/` | nur Daten: `rohbestand/` (Quelle), `karten/aie|fde/` (erzeugt), `roadmap/aie.json|fde.json`, `bilder/`, `vorschlaege/`, `meldungen/` | Code, lose Dateien außer `meta.json` |
| `scripts/` | flache Werkzeuge `<name>.ts` und `<name>.test.ts`, gestartet über `npm run` | Unterordner |
| `docs/` | `.md`-Dateien und `screenshots/<name>.png` | andere Formate |
| `.githooks/` | Git-Hooks (`pre-commit`) | |

## Wohin gehört was

- **Neuer Agent:** `agents/<name>/` mit `agent.json`, `prompt.md`, `README.md`. Er schreibt nur in seinen erlaubten Pfad.
- **Neue App:** `apps/<name>/` mit eigenem `package.json`. Apps importieren nur `karten-kern`, nie einander.
- **Neue Karten:** in `inhalt/rohbestand/*.json`, dann `npm run aufteilen && npm run pruefen`.
  Im Eingang angenommene Karten schreibt der Server nach `inhalt/rohbestand/eingang.json`.
- **Neue Skizze:** eine Datei `apps/web/src/skizzen/<id>.tsx`, Eintrag in `skizzen/registry.ts`.
  `registry.test.ts` prüft ids, Themen und verlinkte Karten.
- **Neues Themenbild:** `inhalt/bilder/themen/<track>-<slug(thema)>.webp` (4:3, weißer Grund),
  Motiv in `motive.json`, Herkunft in `herkunft.json`. Fehlt ein Bild, warnt `pruefen` nur.
- **Neue Doku:** `docs/<NAME>.md`. Screenshots nach `docs/screenshots/`.

## Namensregeln

- Ordner und Dateien klein, `a–z`, `0–9`, `-` (Ausnahmen: `README.md`, `AGENTS.md`, `docs/*.md`, React-Komponenten in `apps/web/src`).
- Themen-Dateien heißen wie `slug(thema)`: „Wissen & RAG" → `wissen-und-rag.json`.
- Karten-ids beginnen mit `<track>-`.
