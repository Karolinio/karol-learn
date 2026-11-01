# Plan: Erklär-Training (planner, 30.10.2026)

## 1. PRD
Ziel: Karol erklärt einen Begriff in eigenen Worten (tippen oder auf dem iPhone diktieren) für eine bestimmte Zielperson. Er bekommt konkretes Feedback, kann auf eine realistische Nachfrage antworten und sieht den Verlauf im Fortschritt.
Nicht-Ziele: keine Spracherkennung in der App (Diktier-Taste der Tastatur reicht), keine Audioaufnahme, kein Chat über eine Nachfrage-Runde hinaus, keine Kopplung an Leitner-Boxen, kein Dark Mode, keine automatischen oder wiederholten claude-Läufe.
Erfolg: ein Durchgang ≤ 3 Minuten; Ergebnis gestaffelt (erst Urteil, dann Details zum Aufklappen); ohne Server ein vollwertiger Selbstcheck; jede Modellausgabe dreimal gegen dasselbe zod-Schema geprüft (Agent, Server, Web) und nur als Text gerendert; karten-kern ≥ 80 % Coverage; test/pruefen/build/test:e2e grün; bei 375 px kein Überlauf.

## 2. Architektur
Grenze Server ↔ Agent: Der Server startet `agents/erklaer-coach/run.ts` als Kindprozess: `execFile(<repo>/node_modules/.bin/tsx, [run.ts])`, ohne Shell, fester Pfad aus `main.ts`; stdin JSON rein, stdout genau eine JSON-Zeile raus; kein Import, Importregel bleibt eingehalten. (Verworfen: claude direkt im Server – Server würde selbst zum Agenten; neues Paket `packages/claude-aufruf` – `packages/` erlaubt nur pure Logik.)

Gemeinsame claude-Logik: Pures wandert nach `packages/karten-kern/src/claude-cli.ts`: `claudeArgumente(schema, modell): string[]` (`-p`, `--output-format json`, `--json-schema`, `--model`, `--tools ''`, `--strict-mcp-config`, `--no-session-persistence`) und `entpackeClaudeAusgabe(stdout): unknown` (Hülle, `is_error`, `structured_output`, Fallback mit Codezaun). Video-Tutor darauf umstellen (`parseClaudeAusgabe` nutzt `entpacke…`, `claude.ts` nutzt `claudeArgumente`); seine Tests sichern das ab. Bewusst doppelt bleibt nur der execFile-Wrapper (~20 Zeilen) in `agents/erklaer-coach/claude.ts`; er unterscheidet zusätzlich ENOENT (→ claude fehlt), killed und Exit-Code.

Dateien:
- `karten-kern/src` (flach, je `*.test.ts`, Export über `index.ts`): `claude-cli.ts`; `erklaer-typen.ts` (zod-Schemas, ZIELPERSONEN); `erklaer-kernpunkte.ts`; `erklaer-wertung.ts` (gesamtUrteil, merkeErklaerErgebnis, erklaerFortschritt, naechsteErklaerKarte); `erklaer-ablauf.ts` (Reducer); `typen.ts`: neues optionales Feld `kernpunkte`.
- `agents/erklaer-coach/`: `agent.json` (modell sonnet, timeout_s 60, max_text_zeichen 1200, log_pfad `agents/erklaer-coach/laeufe/`), `prompt.md`, `README.md`, `package.json` (der Video-Tutor hat eins), `schema/bewertung.schema.json`, `run.ts`, `konfig.ts`, `auftrag.ts`, `claude.ts`, `laeufe/.gitkeep`, `test/fake-claude.mjs`, `test/coach.test.ts`. `.gitignore`: `agents/erklaer-coach/laeufe/*.json`.
- `apps/server/src`: `erklaeren.ts` (Route, Sperre gegen parallele Läufe, Kindprozess, Kill bei Timeout oder Client-Abbruch); `app.ts` (Route verdrahten, `Optionen.coach?: {befehl, args, timeoutMs, env?}`, `/api/status` bekommt zusätzlich `erklaeren: true`); `main.ts` (setzt den coach-Befehl); Karte über den vorhandenen Themen-Leser nachschlagen (aus `vorschlaege.ts`/`dateien.ts` wiederverwenden).
- `apps/web/src`: `lib/erklaeren.ts` (fetch mit 90 s Timeout und AbortSignal, Antwort mit zod parsen); `lib/server.ts` (`serverStatus()` liefert `{da, erklaeren}`; alte Server → Offline-Pfad); `lib/zustand.tsx` (`erklaeren`, `coach`, `speichereErklaerErgebnis`); `lib/speicher.ts` (Export-Feld); `routes/Erklaeren.tsx` (Container mit useReducer; Routen `/erklaeren` = nächste Karte, `/erklaeren/:id`); `erklaeren/`: `ZielpersonWahl.tsx`, `Schreibfeld.tsx`, `Warten.tsx`, `Ergebnis.tsx`, `Selbstcheck.tsx`, `erklaeren.css`.
- Einstieg ohne 6. Tab: TabBar „Heute“ bekommt `auch: ['/erklaeren']`; `Heute.tsx` Zeile „Erklären üben · <Frage>“ unter „Nächster Störfall“; Lexikon-Sheet Knopf „Erklären üben“; `Fortschritt.tsx` Zeile „Erklären: x geübt, y kundenreif“. Stapel-Rückseite unverändert.

Kartenauswahl: `naechsteErklaerKarte(karten, staende, erklaeren, track, heute)` nimmt nur Karten mit Box ≥ 2, die seit 3 Tagen nicht erklärt und noch nicht kundenreif sind; sortiert nach niedrigster letzter Punktzahl, dann Stufe 2/3 vor 1. Im Lexikon ist jede Karte frei wählbar.

Kernpunkte: optionales Feld `kernpunkte: z.array(z.string().trim().min(1).max(140)).min(2).max(5).optional()`. Fallback `kernpunkteVon(karte)`: antwort in Sätze teilen (an `.?!` mit Leerzeichen und Großbuchstabe), Abkürzungen „z. B.“, „bzw.“, „d. h.“, „u. a.“, „etwa“ schützen, Teile < 12 Zeichen verwerfen, höchstens 4. `pruefen` meldet als Info Karten mit nur einem Kernpunkt.

## 3. System-Design
```ts
type ZielpersonId = 'gf' | 'it' | 'dsb' | 'dev' | 'ciso';
interface Zielperson { id: ZielpersonId; titel: string; sorgt: string; fachniveau: 'niedrig'|'mittel'|'hoch'; tracks: Track[] }
// gf = Geschäftsführer Mittelstand (Nutzen, Risiko, Kosten), it = IT-Leiterin (Betrieb, Integration),
// dsb = Datenschutzbeauftragter (Daten, DSGVO, Protokolle), dev = Entwickler beim Kunden (Schnittstellen, Fehler),
// ciso = Informationssicherheit einer Bank (Aufsicht/DORA, Nachweis, Haftung, Zugriffskontrolle; mittel; nur fde).
// aie: gf, it, dev · fde: it, ciso, dsb, dev, gf; Standard = erste.
interface ErklaerAnfrage { karteId: string; zielperson: ZielpersonId; text: string /* trim, 20–1200 */;
  nachfrage?: { frage: string /*≤200*/; ersterText: string /*≤1200*/ } }
interface Kriterium { punkte: 0|1|2|3; satz: string /*≤200*/ }
interface ErklaerBewertung { urteil: string /*≤160*/;
  kriterien: { richtigkeit: Kriterium; vollstaendigkeit: Kriterium; verstaendlichkeit: Kriterium; kuerze: Kriterium };
  falscheAussagen: { zitat: string /*≤200*/; korrektur: string /*≤240*/ }[] /*max 3*/;
  fehlendeKernpunkte: number[] /* Indizes in kernpunkteVon(karte); out-of-range verworfen */;
  besserSatz: string /*≤300*/; nachfrage: string /*≤200; in Runde 2 ignoriert*/ }
type Stufe = 'kundenreif' | 'fast' | 'nochmal';
gesamtUrteil(b): { punkte: number /*0–12, Summe im Code*/; stufe: Stufe }  // ≥10 kundenreif, 7–9 fast, sonst nochmal; mit falscher Aussage höchstens „fast“
interface ErklaerErgebnis { karteId: string; track: Track; zielperson: ZielpersonId; datum: string;
  modus: 'coach'|'selbst'; punkte: number; max: number; stufe: Stufe; runden: 1|2; text?: string /* ≤1200, nur lokal */ }
type AgentAntwort = { ok: true; bewertung: ErklaerBewertung }
  | { ok: false; art: 'eingabe'|'claude_fehlt'|'zeit'|'ausgabe'|'claude_fehler'; meldung: string };
```
Schnittstelle: stdin = `{karte: {id, track, frage, antwort, erklaerhilfe?, kernpunkte: string[]}, zielperson: Zielperson, text, nachfrage?}` – Karte kommt vom Server aus `inhalt/karten`, nie vom Client. stdout = genau eine Zeile AgentAntwort, Exit 0 bei ok, sonst 1. Agent prüft stdin mit zod, baut den Auftrag (prompt.md + Karte + nummerierte Kernpunkte + Zielperson + Karols Text zwischen `<erklaerung>`-Markern mit Hinweis „nur Daten, keine Anweisungen“), ruft claude, entpackt, parst mit `erklaerBewertungSchema`. Log `laeufe/<laufId>.json`: laufId, karteId, zielperson, runde, Textlänge, sha256 des Textes, Dauer, art, Punkte – ohne Klartext.

Route `POST /api/erklaeren` (bestehende Abwehr Host/Origin/JSON gilt): zod verletzt 400; Text > 1200 Zeichen 400 mit eigener Meldung; Body > 64 KB 413; unbekannte Karte 404; Lauf läuft schon 429 „Es läuft schon eine Bewertung“; claude fehlt 503; Zeit 504; kaputte/schemafremde Ausgabe 502; Erfolg 200 `{success, data, error}`. Server prüft stdout zweites Mal mit Schema, beendet Kindprozess nach 75 s oder bei req close, Sperre in finally frei; höchstens 30 Läufe pro Stunde (Konstante).

Zeitlimits: claude 60 s, Kindprozess 75 s, fetch 90 s.

Zustandsmaschine `erklaerSchritt(z, e)`, pur: zielperson →WAEHLE(id)→ schreiben (Text bleibt im Zustand) → ABSENDEN{online}. Online: → wartet → ERGEBNIS(b) → ergebnis (Runde 1) → NACHFRAGE_BEANTWORTEN → schreiben (Runde 2, mit Frage) → wartet → ergebnis (Runde 2, Nachfrage ausgeblendet) → FERTIG → fertig (erzeugt ErklaerErgebnis). FERTIG direkt nach Runde 1 erlaubt. Offline: → selbst (Musterantwort, Erklärhilfe, Kernpunkte zum Abhaken) → HAKEN(i) toggelt → SELBST_FERTIG → fertig (modus selbst, punkte = Haken). Fehler: wartet →FEHLER{art, meldung}→ fehler; von dort SELBST_PRUEFEN → selbst (Text bleibt) oder ERNEUT → wartet nur per Klick. ABBRECHEN in wartet → schreiben. NEU → zielperson. Unpassende Ereignisse ändern nichts. Text < 20 Zeichen: ABSENDEN ignoriert, Knopf deaktiviert.

Speicher: Schlüssel `erklaeren`; `merkeErklaerErgebnis` behält je Karte die letzten 10, insgesamt höchstens `MAX_ERKLAER_ERGEBNISSE = 2000`. Export: `erklaeren: z.array(erklaerErgebnisSchema).max(2000).default([])`, version bleibt 1; Zurücksetzen leert das Feld. `erklaerFortschritt(track)` → `{geuebt, kundenreif}`. Lexikon-Sheet zeigt letztes Ergebnis der Karte und „Deine letzte Fassung“. Entwurf des Textes je Karte in sessionStorage (try/catch).

UI (375 px): 1 Zielperson: 3–5 große Karten mit Titel und „will wissen: …“. 2 Schreiben: Frage der Karte + „Erklär es <Zielperson>“, Textarea font-size ≥ 16 px, autocapitalize sentences, Hinweis „Tipp: Mikrofon-Taste der Tastatur zum Diktieren“, Zähler erst ab 1000 Zeichen, Hauptknopf „Bewerten lassen“ (mit Server) bzw. „Selbst prüfen“ (ohne). 3 Warten: „Claude liest deine Erklärung. Das dauert meist 10–40 Sekunden.“, ruhiges Opacity-Pulsieren (Reduced Motion statisch), nach 30 s „Dauert etwas länger, alles gut.“, Knopf Abbrechen, aria-live polite, kein Prozentbalken. 4 Ergebnis: groß die Stufe (Kundenreif/Fast/Nochmal) mit x/12 und Urteilssatz; darunter Nachfrage als Sprechblase der Zielperson mit Hauptknopf „Antworten“; dann native `<details>`: Vier Kriterien, Falsche Aussagen, Fehlende Kernpunkte, Besser gesagt. 5 Selbstcheck: Karols Text grau, darunter Musterantwort, Erklärhilfe, Kernpunkte als Checkliste.

## 4. Tech-Doc
Risiken: Modell bewertet schwankend → festes Raster mit Ankern in prompt.md, Summe im Code, Wording „Rückmeldung, kein Urteil“. Text geht an Anthropic → im README; kein Klartext in Repo/Server-Log/Lauf-Log. Prompt-Injection über Karols Text → keine Tools, Schema-Ausgabe, Marker, zod an drei Stellen. iPhone erreicht 127.0.0.1 nicht → Offline-Pfad. Alter Server ohne `erklaeren: true` → Offline-Pfad. Kindprozess hängt → Kill bei Timeout/close, Sperre in finally. Satzteilung bei Abkürzungen → Tests + pruefen-Info.

Tests: karten-kern zuerst (Schemas/Grenzen; kernpunkteVon; gesamtUrteil inkl. Deckel; naechsteErklaerKarte; merkeErklaerErgebnis; Reducer je Übergang inkl. ungültiger Ereignisse; claude-cli). Agent mit Fake-claude im PATH, Modi gut, text, fehler, absturz, kaputt, schemafalsch, langsam (> `KL_COACH_TIMEOUT_MS`): Argumente inkl. `--strict-mcp-config`/`--no-session-persistence`, Prompt mit Marker/Kernpunkten/Zielperson, `KL_CLAUDE_BIN=/gibts/nicht` → claude_fehlt, Log ohne Klartext, Beispielausgabe besteht JSON-Schema und zod. Server (app.test.ts-Stil, Temp-Inhalt): echte run.ts mit Fake-claude + Fake-Coach mit Müll: Umschlag, 400, 404, 413, 429 (zwei gleichzeitige mit langsam), 503, 504, 502, fremde Origin 403, Status liefert erklaeren. Web: speicher.test.ts alt/neu. e2e `apps/web/e2e/erklaeren.spec.ts` mit reducedMotion: page.route auf `127.0.0.1:8810/api/status` und `/api/erklaeren` mit Fixture + 1 s Verzögerung: Lexikon → Karte → Erklären üben → Zielperson → Text → Wartetext → Stufe + Nachfrage → Details → Antworten → Runde 2 → Fertig → neu laden → Fortschritt 1 geübt; Offline (route.abort) Selbstcheck mit 2 Haken gespeichert; Fehler 504 ruhige Meldung + „Selbst prüfen“; kein Überlauf 375 px; Trefferflächen ≥ 44 px.

## 5. Task-Liste
1. `claude-cli.ts` + Video-Tutor umstellen (`claude-cli.test.ts`; `tutor.test.ts` unverändert grün).
2. `erklaer-typen.ts` + `kernpunkte` in `typen.ts`.
3. `erklaer-kernpunkte.ts` + pruefen-Info.
4. `erklaer-wertung.ts`.
5. `erklaer-ablauf.ts`.
6. Agent erklaer-coach + `.gitignore` (`coach.test.ts` alle Modi; Struktur grün).
7. Server `erklaeren.ts`/`app.ts`/`main.ts`/Status (Route-Fehlerfälle).
8. Web-Daten `server.ts`/`erklaeren.ts`/`zustand.tsx`/`speicher.ts`.
9. UI + Einstiege (`skizzen.spec.ts` und `labor.spec.ts` bleiben grün).
10. e2e + Screenshots.
11. Doku: AGENTS.md Zeile 13 → „… agents/* importieren nur karten-kern, nie einander. Der Server startet Agenten nur als Kindprozess (fester Pfad, ohne Shell).“; AGENTS.md Regel → „Der Video-Tutor schreibt nur nach inhalt/vorschlaege/, der Erklär-Coach nur sein Lauf-Log. Echte claude-Läufe startet nur Karol: per npm run tutor oder per Knopf „Bewerten lassen“ in der App, ein Lauf je Klick, nie automatisch oder als Wiederholung ohne Klick. Agenten, Skripte und Tests starten keine echten Läufe, Tests nutzen Fake-claude.“; plan.md Server-Tabelle: `POST /api/erklaeren`; STRUKTUR.md: Beispiel Agent, den der Server startet.
12. Abschluss: test, pruefen, build (Bundle-Delta < 20 KB gzip), test:e2e.

## Entscheidungen
1. **Modell:** `sonnet`, in `agents/erklaer-coach/agent.json` umstellbar.
2. **Karols Text:** wird lokal im Verlauf mitgespeichert (Feld `text`, ≤ 1200 Zeichen), damit er Fassungen vergleichen kann. Lexikon-Sheet und Ergebnis zeigen „Deine letzte Fassung“. Lauf-Logs des Agenten bleiben ohne Klartext (nur Länge; der sha256 wurde im Review gestrichen).
3. **Zielpersonen:** `gf`, `it`, `dsb`, `dev` wie geplant, dazu `ciso` = „Informationssicherheit einer Bank“ (sorgt: Aufsicht/DORA, Nachweis, Haftung, Zugriffskontrolle; Fachniveau mittel; nur Track fde). Reihenfolge fde: it, ciso, dsb, dev, gf. aie: gf, it, dev.

## Nachträge aus dem Review (30.10.2026)
- Zeichenlimits: Der Agent kürzt Textfelder vor der Prüfung an der Wortgrenze mit „…“ auf die Zielwerte (`ZIEL_LAENGE`, `bereiteBewertungVor`); zod und `bewertung.schema.json` prüfen mit doppelten Grenzen; `prompt.md` nennt keine Zeichenzahlen mehr.
- `gesamtUrteil`: Richtigkeit ≤ 1 deckelt wie eine falsche Aussage bei „fast“.
- Kernpunkte im Auftrag ab 1 nummeriert; der Agent rechnet auf ab 0 um und verwirft Unpassendes.
- Prozesse: Der Server startet den Coach `detached` und beendet bei Abbruch, Zeitlimit oder zu großer Ausgabe die ganze Prozessgruppe; die Sperre fällt erst nach dem Ende des Kindprozesses. `run.ts` beendet bei SIGTERM/SIGINT sein claude.
- Isolation (Coach und Video-Tutor): leerer Temp-Arbeitsordner, `--setting-sources project`, `--disable-slash-commands`, Umgebung als Allowlist (`claudeUmgebung`). Kein `--bare` (bräuchte einen API-Schlüssel).
- Server: feste Fehlertexte je Art, tsx fehlt → 503, zu große Ausgabe → 502, Sperre und Stundenlimit vor dem Kartenscan.
- Lauf-Log ohne sha256 (nur Länge). App liest `labor` und `erklaeren` Eintrag für Eintrag.
