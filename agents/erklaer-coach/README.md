# Erklär-Coach

Bewertet, wie gut du einen Begriff in eigenen Worten einer bestimmten Zielperson erklärst (Geschäftsführer, IT-Leiterin, Datenschutz, Entwickler, Informationssicherheit einer Bank). Er gibt eine Rückmeldung nach festem Raster, einen besseren Satz in deinem Ton und eine realistische Nachfrage der Zielperson.

Du startest ihn nicht von Hand. Die App ruft ihn über den lokalen Server, wenn du **„Bewerten lassen“** tippst: ein Lauf je Klick, nie automatisch, nie als Wiederholung ohne Klick.

## Ablauf

```
App  POST /api/erklaeren {karteId, zielperson, text, nachfrage?}
  → Server         prüft mit zod, liest die Karte aus inhalt/karten (nie vom Client), ein Lauf gleichzeitig
  → run.ts         Kindprozess über tsx, ohne Shell; stdin = Karte + Zielperson + Text, stdout = genau eine JSON-Zeile
  → auftrag.ts     prompt.md + Karte + nummerierte Kernpunkte + Zielperson + dein Text hinter <erklaerung>-Markern
  → claude.ts      `claude -p` mit deinem Abo, ohne Tools, ohne MCP, ohne Sitzung, Antwort nach Schema, 60 s
  → vorbereiten    zu lange Texte an der Wortgrenze kürzen, Kernpunkt-Nummern (ab 1) auf ab 0 umrechnen
  → zod            Antwort gegen erklaerBewertungSchema (danach prüfen Server und App noch einmal)
  → laeufe/<lauf>.json   Protokoll ohne Klartext und ohne Hash: Länge deines Textes, Dauer, Art, Punkte (nicht im Git)
```

Die Summe der Punkte (0–12) und die Stufe (kundenreif ≥ 10, fast 7–9, sonst nochmal; mit falscher Aussage höchstens „fast“) rechnet `karten-kern`, nicht das Modell.

## Dateien

| Datei | Aufgabe |
|---|---|
| `agent.json` | Modell (`sonnet`, hier umstellbar), Zeitlimit, Höchstlänge des Textes, Log-Pfad |
| `prompt.md` | Raster mit Ankern je Punktwert, Ton, Regeln für Nachfrage und besseren Satz |
| `schema/bewertung.schema.json` | Form der Antwort (dasselbe wie `erklaerBewertungSchema`) |
| `run.ts` | Einstieg: stdin prüfen, Auftrag bauen, claude rufen, prüfen, loggen, eine Zeile ausgeben |
| `test/` | Tests mit einem nachgemachten `claude`, ohne Abo-Verbrauch |

## Isolation

`claude` läuft in einem frischen, leeren Temp-Ordner (danach gelöscht) mit `--setting-sources project` und `--disable-slash-commands`, also ohne Projekt- und User-Einstellungen, Hooks und Slash-Befehle, und bekommt nur eine Allowlist der Umgebung (PATH, HOME, Locale, `ANTHROPIC_*`, `CLAUDE_*` …). Der Server startet den Coach in eigener Prozessgruppe und beendet bei Abbruch oder Zeitlimit die ganze Gruppe, auch claude.

## Fehlerarten

`eingabe` (stdin ungültig), `claude_fehlt` (nicht installiert), `zeit` (über 60 s), `ausgabe` (kein JSON, schemafremd oder zu groß), `claude_fehler` (Exit-Code oder `is_error`). Der Server macht daraus 400, 503, 504, 502 mit festen Texten; stderr und Pfade gehen nie an die App.

## Datenschutz

Dein Text geht über die Claude-Code-CLI an Anthropic, wie jede andere Claude-Nutzung mit deinem Abo. Im Repo, im Server-Log und im Lauf-Log steht er nie im Klartext. In der App bleibt deine letzte Fassung lokal im Browser gespeichert (Lernverlauf), damit du Fassungen vergleichen kannst.

Auf dem iPhone erreicht die App den Server auf `127.0.0.1` nicht. Dann gibt es den Selbstcheck: Musterantwort, Erklärhilfe und Kernpunkte zum Abhaken.
