# Video-Tutor

Macht aus einem Video Lernkarten und Erklärideen. Er schlägt nur vor; was in die App kommt, entscheidest du im Eingang.

```
npm run tutor -- https://youtu.be/<id> --track aie          # YouTube-Link, Quelle = Videotitel
npm run tutor -- transkript.txt --quelle "Titel" --track fde  # eingefügtes Transkript
```

## Ablauf

```
Link oder Datei
  → eingaben.ts / youtube.ts    Eingang prüfen; bei Links Untertitel über yt-dlp holen (de vor en)
  → bestand.ts                  vorhandene Themen und Fragen anhängen, damit nichts doppelt kommt
  → claude.ts                   `claude -p` mit deinem Abo, ohne Tools, ohne MCP, Antwort nach Schema
  → auswertung.ts               jede Karte gegen das Kartenschema prüfen, Dubletten markieren, Ideen filtern
  → mandat.ts                   schreiben darf er nur nach inhalt/vorschlaege/
  → laeufe/<lauf>.json          Protokoll je Lauf (nicht im Git)
```

## Dateien

| Datei | Aufgabe |
|---|---|
| `agent.json` | Einstellungen: Modell, Zeitlimit, Höchstzahl, erlaubter Schreibpfad |
| `prompt.md` | Auftrag an das Modell: was eine gute Karte ist, keine Trivia, Erklärhilfe, Ideen |
| `schema/vorschlag.schema.json` | Form der Antwort (`vorschlaege` + `ideen`) |
| `run.ts` | Einstieg, verbindet die Schritte |
| `test/` | Tests mit einem nachgemachten `claude`, ohne Abo-Verbrauch |

## Isolation

`claude` läuft in einem frischen, leeren Temp-Ordner (danach gelöscht) mit `--setting-sources project` und `--disable-slash-commands`, also ohne Projekt- und User-Einstellungen, Hooks und Slash-Befehle, und bekommt nur eine Allowlist der Umgebung (PATH, HOME, Locale, `ANTHROPIC_*`, `CLAUDE_*` …).

## Wo er läuft

Auf deinem Mac, über die Claude-Code-CLI und dein Abo. Er braucht kein API-Guthaben und keinen Server.

## yt-dlp einrichten

Für YouTube-Links, einmalig. Nicht über Homebrew: auf macOS 13 baut es LLVM und Rust aus dem Quellcode (Stunden).

```
python3 -m venv ~/.venvs/yt-dlp
~/.venvs/yt-dlp/bin/pip install yt-dlp
ln -s ~/.venvs/yt-dlp/bin/yt-dlp ~/.local/bin/yt-dlp
```

Aktualisieren: `~/.venvs/yt-dlp/bin/pip install -U yt-dlp`. YouTube ändert oft etwas, ein Update behebt die meisten Fehler.
