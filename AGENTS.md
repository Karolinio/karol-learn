# AGENTS.md: karol-learn

Kurzregeln für Agenten in diesem Repo. Der Plan in `docs/plan.md` ist verbindlich.

## Befehle
- `npm install`, nie pnpm (auf diesem Mac kaputt). Nichts global installieren.
- `npm test` (Vitest, Coverage ≥ 80 % für karten-kern), `npm run pruefen`, `npm run build`, `npm run test:e2e`.
- Playwright nur mit `channel: 'chrome'` und headless.

## Struktur
- Was wohin gehört: `docs/STRUKTUR.md`. Neue Agenten nach `agents/<name>/` mit `agent.json`, `prompt.md`, `README.md`.
- `packages/karten-kern`: pure Logik. Neue Logik zuerst hier, mit Test zuerst.
- `apps/web`, `apps/server`, `agents/video-tutor`, `scripts` importieren nur karten-kern, nie einander.
- Inhalt: `inhalt/rohbestand/` ist die Quelle, `inhalt/karten/` wird von `aufteilen` erzeugt.

## Regeln
- Server nur auf 127.0.0.1, Antworten `{success, data, error}`, zod an jedem Eingang, Pfade nur aus Slugs.
- Der Video-Tutor schreibt nur nach `inhalt/vorschlaege/`. Echte `claude`-Läufe startet nur Karol.
- Farben nur als Tokens in `apps/web/src/styles/tokens.css`. Nur helles Design.
- Animation nur über transform und opacity, `prefers-reduced-motion` beachten, Trefferflächen ≥ 44 px.
- Immutability, Dateien ≤ 400 Zeilen, kein `console.log` im App-Code.
- Keine Texte von roadmap.sh kopieren, nur verlinken.
- Vor dem Abschluss jeder Aufgabe `npm run pruefen` laufen lassen (Inhalt + Struktur) und grün melden.
- Kein Commit, kein Push ohne Karols Freigabe.
