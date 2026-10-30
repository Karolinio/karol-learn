# Plan: Agent-Labor (planner, 29.10.2026)

## 1. PRD
Ziel: Karol übt Anwenden statt Wiedererkennen: einen geskripteten Agentenlauf beobachten, am Harness Regler drehen und die Folgen sehen, Störfälle über Symptom → Ursache → Reparatur lösen, danach Vergleich vorher/nachher.
Nicht-Ziele: kein echtes LLM, kein Netzwerk, kein Szenario-Editor, kein Dark Mode, keine echten Anbieterpreise (nur benannte BEISPIELPREIS_*-Konstanten, UI sagt „Beispielpreise“), keine Kopplung an Leitner-Boxen, keine roadmap.sh-Texte.
Erfolg: 6 Fälle, je ≤ 3 Minuten lösbar; jeder Regler ändert innerhalb eines Schritts sichtbar Tokens, Kosten oder das Ende; `pruefen` belegt für jeden Fall maschinell, dass die Reparatur wirkt; karten-kern-Coverage ≥ 80 %; pruefen/test/test:e2e grün; Bundle +< 30 KB gzip; kein Überlauf bei 375 px.

## 2. Architektur
Navigation: Tab-Leiste bleibt bei 5 Tabs. Labor hängt am Tab „Skizzen“: in TabBar.tsx `auch: ['/skizze/', '/labor']`. routes/Skizzen.tsx bekommt oben eine Einstiegskarte „Agent-Labor · x/6 gelöst“ (Abschnitt „Anwenden“), darunter die Skizzen („Verstehen“). routes/Heute.tsx zeigt unter dem Kartenknopf eine Zeile „Nächster Störfall“. Label/Überschrift „Skizzen“ bleiben (e2e/skizzen.spec.ts darf nicht brechen).
Neue Dateien:
- packages/karten-kern/src/ (flach, je *.test.ts): labor-typen.ts (zod-Schemas/Typen), labor-kosten.ts (Preise, Cache-Rechnung), labor-sim.ts (simuliere(); bei Bedarf aufteilen in Runde/Gateway/Kontext), labor-trace.ts (Spans), labor-stoerfall.ts (Reducer), labor-pruefung.ts (pruefeSzenario()); Export über index.ts.
- inhalt/labor/<id>.json: ein Szenario pro Datei + aie-grundlauf.json als Sandbox für den Simulator. scripts/struktur.ts: 'labor' in INHALT_ORDNER (+ Fall in struktur.test.ts); docs/STRUKTUR.md: labor/ in der inhalt/-Zeile und „Neuer Störfall: inhalt/labor/<track>-labor-<slug>.json, dann npm run pruefen“.
- scripts/lib.ts liesLabor(); index-lib.ts schreibt `labor: [...]` in index.json und filtert per KL_AUSSCHLIESSEN über `themen`; pruefen.ts ruft pruefeSzenario.
- apps/web/src/routes/: Labor.tsx (Liste), LaborSimulator.tsx, LaborFall.tsx; Routen /labor, /labor/simulator, /labor/fall/:id.
- apps/web/src/labor/: NachrichtenListe.tsx, KontextBalken.tsx, KostenTafel.tsx, TraceLeiste.tsx, ReglerFeld.tsx, WahlKarten.tsx, Vergleich.tsx, useAbspielen.ts (Schritt-Timer, Pause/Weiter; bei Reduced Motion kein Autoplay), labor.css.
- lib/inhalt.ts: `labor` im Inhalt-Typ; lib/zustand.tsx: `labor` + speichereLaborErgebnis; lib/speicher.ts: `labor` im Export-Schema.

## 3. System-Design
```ts
type Rolle = 'system'|'user'|'assistant'|'tool_use'|'tool_result';
interface Nachricht { id: string; rolle: Rolle; text: string; tokens: number; tool?: string;
  aufrufId?: string; istFehler?: boolean; istInjektion?: boolean }
interface SkriptRunde { denken: {text: string; tokens: number}; bitte?: {tool: string; args: string; tokens: number};
  ergebnis?: {text: string; tokens: number; fehler?: {status: number; text: string}; injektion?: {zielTool: string}};
  fertig?: boolean }
interface Skript { system: {text: string; tokens: number}; user: {text: string; tokens: number};
  tools: readonly {name: string; beschreibung: string; tokens: number}[];
  runden: readonly SkriptRunde[]; schleife?: SkriptRunde }  // schleife wiederholt sich ohne Stoppbedingung
interface HarnessRegler { toolAnzahl: number /*1–12*/; maxRunden: number|null; kontextLimit: number;
  gateway: boolean; mandat?: {tools: readonly string[]}; caching: boolean;
  ergebnisMaxTokens?: number; kompaktierungAb?: number /*0–1*/; gleicheBitteMax?: number; fehlerDurchreichen: boolean }
interface RundenKosten { input: number; cacheLesen: number; cacheSchreiben: number; output: number; usd: number }
interface Span { id: string; eltern?: string; art: 'lauf'|'runde'|'modell'|'gateway'|'tool';
  startMs: number; dauerMs: number; status: 'ok'|'fehler'|'abgelehnt' }
type Ende = 'fertig'|'max_runden'|'kontext_voll'|'wiederholung'|'not_aus' /*HARTES_LIMIT = 30*/;
interface SimSchritt { runde: number; nachrichten: readonly Nachricht[]; kontextTokens: number;
  kontextAnteil: number; kosten: RundenKosten; kumuliert: RundenKosten; spans: readonly Span[]; ereignis: string }
interface SimLauf { schritte: readonly SimSchritt[]; ende: Ende; injektionAusgefuehrt: boolean; fehlerSichtbar: boolean }
simuliere(skript: Skript, regler: HarnessRegler): SimLauf   // pur, deterministisch, Spandauer aus Tokens abgeleitet
interface Szenario { id: `${Track}-labor-${string}`; track: Track; themen: string[]; titel: string; symptom: string;
  skript: Skript; regler: HarnessRegler; ursachen: [Wahl, Wahl, Wahl];
  reparaturen: [Wahl & Fix, Wahl & Fix, Wahl & Fix]; karten: string[]; skizze?: string;
  beweis: {metrik: 'ende'|'usd'|'kontextMax'|'injektion'|'fehlerSichtbar'; erwartet: string|number} }
interface Wahl { id: string; text: string; richtig: boolean; warum: string }
interface Fix { regler?: Partial<HarnessRegler>; skript?: Skript }   // falsche Fixes werden auch simuliert
interface LaborErgebnis { szenarioId: string; track: Track; geloest: boolean; versuche: number; datum: string }
```
Kostenregeln: Input je Runde = System + Tool-Beschreibungen (toolAnzahl × tokens) + ganzer Verlauf. Mit Caching zählt der Präfix der Vorrunde als cacheLesen × 0,1, neue Tokens als cacheSchreiben × 1,25. Preise als BEISPIELPREIS_* in labor-kosten.ts.
Zustandsmaschine stoerfallSchritt(z, e), pur: symptom (Lauf spielt ab) → ABGESPIELT → ursache. In ursache: WAEHLE_URSACHE(id); falsch: Hinweis mit warum, Versuch +1, Zustand bleibt; richtig: → reparatur. In reparatur: WAEHLE_REPARATUR(id); falsch: dieser Fix wird simuliert, „Symptom bleibt“, Zustand bleibt; richtig: → vergleich. vergleich (beide Läufe nebeneinander: Ende, Tokens, Kosten) → WEITER → fertig, erzeugt LaborErgebnis (geloest = true). NEU setzt auf symptom zurück. Unpassende Ereignisse ändern nichts.
Fortschritt: Speicherschlüssel `labor`; Export-Schema `labor: z.array(laborErgebnisSchema).default([])`, version bleibt 1 (alte Exporte importierbar). /fortschritt/:track bekommt „Anwenden: x/n Störfälle gelöst“, Labor-Liste zeigt je Fall einen Haken.

## 4. Szenarien (6; Karten nur aus dem eigenen Track; ✓ = richtig)
1. aie-labor-endlosschleife (Tool-Schleife; Skizze agent-loop). Symptom: suche_kunde kommt immer wieder, „nichts gefunden“, bis Not-Aus nach Runde 30, Kosten steigen. Ursachen: ✓ kein Rundenlimit, keine Wiederholungserkennung / Kontextfenster zu klein / Modell zu schwach. Reparatur: ✓ maxRunden 8 + gleicheBitteMax 3 / größeres Fenster / längerer System-Prompt. Karten: aie-endlosschleife, aie-endlos-erkennen, aie-stop-max-schritte, aie-stop-arten, aie-limits.
2. aie-labor-kontext-voll (Kontext; Skizze kontextfenster). Symptom: drei Tool-Ergebnisse à 40k Tokens, in Runde 4 kontext_voll. Ursachen: ✓ Tool-Ergebnisse ungekürzt angehängt / zu viele Tools / Nutzerfrage zu lang. Reparatur: ✓ ergebnisMaxTokens + Kompaktierung ab 70 % / Rundenlimit senken / Caching an. Karten: aie-fenster-grenze, aie-compaction, aie-fehler-zu-viel, aie-lost-in-middle, aie-tool-ergebnisse-kosten, aie-kontext-aufraeumen.
3. aie-labor-kosten (Kosten). Symptom: 12 Runden, Input wächst jede Runde, Gesamtkosten ~6× so hoch wie geschätzt. Ursachen: ✓ ganze Historie jede Runde neu gelesen, ohne Cache / Ausgaben zu lang / zu viele Tool-Aufrufe parallel. Reparatur: ✓ Prompt Caching an mit stabilem Präfix (System + Tools vorn) / Ausgabe kürzen / Batch. Karten: aie-verlauf-teurer, aie-prompt-caching, aie-cache-praefix, aie-input-tokens, aie-schleife-kosten, aie-budget-limit.
4. aie-labor-falsches-tool (Tools). Symptom: Agent ruft daten_holen („holt Daten“) statt rechnung_suchen, antwortet falsch. Ursachen: ✓ vage Beschreibung + überlappende Namen / Modell halluziniert / Tool-Ergebnis falsch zugeordnet. Reparatur: ✓ neues Skript mit klaren Namen und Beschreibungen („wann nutzen, wann nicht“) / mehr Tools anbieten / Retry. Karten: aie-beschreibung-gut, aie-tool-name, aie-tool-schema, aie-tool-arten.
5. fde-labor-fehler-verschluckt (Fehler lesen). Symptom: CRM-API des Kunden liefert 401, Harness gibt [] zurück, Agent sagt „Kunde existiert nicht“, Trace grün. Ursachen: ✓ Fehlerstatus nicht durchgereicht, kein Log / Kunde wirklich gelöscht / Modell lügt. Reparatur: ✓ fehlerDurchreichen (tool_result mit Status 401, Span fehler), dann Token erneuern / Retry ×5 / Prompt „sei ehrlich“. Karten: fde-b-token-ablauf, fde-http-codes, fde-b-log-level, fde-log, fde-b-debug-vorgehen, fde-b-stacktrace-lesen.
6. fde-labor-injektion (Sicherheit; Skizze gateway-mandat). Symptom: Tool-Ergebnis (Kunden-PDF) enthält eine Anweisung, Agent ruft sende_mail an eine fremde Adresse. Ursachen: ✓ Text im Tool-Ergebnis wird wie eine Anweisung behandelt und kein Mandat prüft die Ausführung / Mail-Tool hat einen Bug / System-Prompt zu kurz. Reparatur: ✓ Gateway an, Mandat ohne sende_mail (abgelehnt, Quittung im Trace) / strengerer Prompt / anderes Modell. Karten: fde-wiya-gateway, fde-wiya-mandat-wo, fde-k-wiya-pass-mandat, fde-quittung, fde-b-least-privilege, fde-scope. Achtung: wiya-Karten fallen bei KL_AUSSCHLIESSEN=wiya weg; der Fall bleibt über das Thema „Sicherheit“ sichtbar, die UI blendet Links auf fehlende Karten aus. Injektionstext nur als Text rendern.

## 5. Tech-Doc
Risiken: erfundene Zahlen lehren Falsches → „Beispielpreise“ kennzeichnen, Verhältnisse betonen. Skript wirkt künstlich → echte Nachrichtentexte und Tool-Namen. Zu viel pro Bildschirm (ADHS, 375 px) → Kontextbalken + Kostenzahl sticky oben, darunter Nachrichten, Trace und Regler als Sheet, eine Entscheidung pro Bildschirm. Dateigröße → labor-sim aufteilen. Off-by-one beim Kontextlimit → eigener Test. Alter Export ohne labor → .default([]).
Tests karten-kern (zuerst): gleiche Eingabe → exakt gleiches Ergebnis, eingefrorene Eingaben unverändert; toolAnzahl +1 erhöht Input jeder Runde um genau die Beschreibungs-Tokens; maxRunden → max_runden, kontextLimit → kontext_voll, Kompaktierung verhindert das; Not-Aus bei 30; mit Caching sinken die Kosten, ab Runde 2 cacheLesen > 0; Gateway lehnt Tool ohne Mandat ab (Span abgelehnt, injektionAusgefuehrt false); fehlerDurchreichen setzt istFehler und Span-Status; Span-ids eindeutig, Eltern gültig; Reducer: ein Test pro Übergang inkl. ungültiger Ereignisse; pruefeSzenario: genau 3 Ursachen/3 Reparaturen, je genau 1 richtig, Karten existieren und gehören zum Track, id beginnt mit Track, kaputter Lauf verfehlt beweis, reparierter erfüllt ihn, jeder falsche Fix verfehlt ihn. Web: speicher.test.ts (alter Export ohne labor importierbar), registry.test.ts (skizze-Feld eines Szenarios verweist auf existierende Skizze).
E2E apps/web/e2e/labor.spec.ts mit reducedMotion 'reduce': Skizzen → Agent-Labor → Endlosschleife → abspielen → falsche Ursache zeigt Hinweis → richtige Ursache → richtige Reparatur → Vergleich sichtbar → nach Neuladen steht der Haken, Fortschritt zeigt 1/4 für aie. Simulator: Caching umschalten ändert den Gesamtkosten-Text. Regler per Tastatur bedienbar, Trefferflächen ≥ 44 px. Kein horizontaler Überlauf bei 375 px.

## 6. Task-Liste
1. Struktur: labor in Positivliste + STRUKTUR.md (Test: inhalt/labor/x.json erlaubt, inhalt/labor/a/b.json abgelehnt).
2. labor-typen.ts (Test: gültig/ungültig, id mit Track-Präfix).
3. labor-kosten.ts (Test: Cache-Rechnung von Hand nachgerechnet).
4. labor-sim.ts + labor-trace.ts (Test: alle Sim-Fälle aus §5).
5. labor-stoerfall.ts (Test: jeder Übergang inkl. Simulation eines falschen Fixes).
6. labor-pruefung.ts (Test: fehlende Karte, falscher Track, zwei richtige Wahlen, wirkungslose Reparatur).
7. Inhalt: inhalt/labor/ mit 6 Fällen + Grundlauf; liesLabor, index-lib (inkl. Ausschluss), pruefen verdrahten (Test: index-lib.test.ts filtert ausgeschlossene Themen; pruefen grün).
8. Web-Daten: inhalt.ts, zustand.tsx, speicher.ts (Test: speicher.test.ts alt/neu).
9. Bausteine apps/web/src/labor/ + useAbspielen; fehlende Rollenfarben als neue Tokens in tokens.css.
10. Routen + TabBar auch + Einstiegskarte Skizzen.tsx + Zeile Heute.tsx + Zeile Fortschritt.tsx (skizzen.spec.ts bleibt grün).
11. E2E labor.spec.ts + Screenshots.
12. Abschluss: test, pruefen, build (Bundle-Delta).
