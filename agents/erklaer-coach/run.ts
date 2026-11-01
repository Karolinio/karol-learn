import { randomBytes } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import {
  agentAntwortSchema, bereiteBewertungVor, coachEingabeSchema, entpackeClaudeAusgabe, erklaerBewertungSchema, gesamtUrteil,
  type AgentAntwort, type CoachEingabe,
} from '@karol-learn/karten-kern';
import { baueAuftrag } from './auftrag';
import { rufeClaude } from './claude';
import { ladeUmgebung, type Umgebung } from './konfig';

const MAX_STDIN = 64 * 1024;

async function liesStdin(): Promise<string> {
  const teile: Buffer[] = [];
  let groesse = 0;
  for await (const teil of process.stdin) {
    groesse += (teil as Buffer).length;
    if (groesse > MAX_STDIN) throw new Error('Eingabe zu groß');
    teile.push(teil as Buffer);
  }
  return Buffer.concat(teile).toString('utf8');
}

const fehler = (art: Exclude<AgentAntwort, { ok: true }>['art'], meldung: string): AgentAntwort => ({ ok: false, art, meldung: meldung.slice(0, 500) });

function parseEingabe(roh: string, maxText: number): CoachEingabe | AgentAntwort {
  let json: unknown;
  try { json = JSON.parse(roh); } catch { return fehler('eingabe', 'Eingabe ist kein JSON'); }
  const r = coachEingabeSchema.safeParse(json);
  if (!r.success) return fehler('eingabe', `Eingabe ungültig: ${r.error.issues[0]?.path.join('.')} ${r.error.issues[0]?.message}`);
  if (r.data.text.length > maxText) return fehler('eingabe', `Text ist länger als ${maxText} Zeichen`);
  return r.data;
}

async function bewerte(umg: Umgebung, e: CoachEingabe, signal: AbortSignal): Promise<AgentAntwort> {
  const lauf = await rufeClaude(umg.claudeBin, baueAuftrag(umg.prompt, e), umg.schema, umg.konfig.modell, umg.timeoutMs, signal);
  if (lauf.art !== 'ok') return fehler(lauf.art, lauf.meldung);
  let nutzlast: unknown;
  try {
    nutzlast = entpackeClaudeAusgabe(lauf.stdout);
  } catch (err) {
    const m = (err as Error).message;
    return m.startsWith('claude meldet Fehler') ? fehler('claude_fehler', m) : fehler('ausgabe', 'Antwort von claude ist kein JSON');
  }
  // Zu lange Texte kürzen und Kernpunkt-Nummern (ab 1) umrechnen, erst dann prüfen.
  const b = erklaerBewertungSchema.safeParse(bereiteBewertungVor(nutzlast, e.karte.kernpunkte.length));
  return b.success ? { ok: true, bewertung: b.data } : fehler('ausgabe', 'Antwort von claude passt nicht zum Schema');
}

/** Lauf-Log ohne Klartext und ohne Hash: nur die Länge von Karols Text. Schreibt nur in den eigenen Log-Ordner. */
function schreibeLog(umg: Umgebung, daten: Record<string, unknown>, laufId: string): void {
  const ordner = resolve(umg.wurzel, umg.konfig.log_pfad);
  const ziel = resolve(ordner, `${laufId}.json`);
  if (!ziel.startsWith(ordner + sep)) throw new Error('Log-Pfad außerhalb des Log-Ordners');
  mkdirSync(ordner, { recursive: true });
  const tmp = `${ziel}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(daten, null, 2)}\n`);
  renameSync(tmp, ziel);
}

function neueLaufId(): string {
  const z = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `${z}-${randomBytes(3).toString('hex')}`;
}

async function main(): Promise<number> {
  const start = Date.now();
  const umg = ladeUmgebung();
  const laufId = neueLaufId();
  // Beendet der Server den Coach (Abbruch, Zeit), endet auch claude: kein Waisenprozess.
  const abbruch = new AbortController();
  for (const s of ['SIGTERM', 'SIGINT'] as const) process.once(s, () => abbruch.abort());
  let roh = '';
  try { roh = await liesStdin(); } catch (e) { roh = ''; process.stderr.write(`${(e as Error).message}\n`); }
  const eingabe = parseEingabe(roh, umg.konfig.max_text_zeichen);
  const antwort = 'ok' in eingabe ? eingabe : await bewerte(umg, eingabe, abbruch.signal);
  const geprueft = agentAntwortSchema.parse(antwort);
  try {
    schreibeLog(umg, {
      laufId, start: new Date(start).toISOString(), dauerMs: Date.now() - start,
      karteId: 'ok' in eingabe ? null : eingabe.karte.id, zielperson: 'ok' in eingabe ? null : eingabe.zielperson.id,
      runde: 'ok' in eingabe ? null : eingabe.nachfrage ? 2 : 1,
      textLaenge: 'ok' in eingabe ? null : eingabe.text.length,
      art: geprueft.ok ? 'ok' : geprueft.art,
      punkte: geprueft.ok ? gesamtUrteil(geprueft.bewertung).punkte : null,
    }, laufId);
  } catch (e) {
    process.stderr.write(`Log nicht schreibbar: ${(e as Error).message}\n`);
  }
  process.stdout.write(`${JSON.stringify(geprueft)}\n`);
  return geprueft.ok ? 0 : 1;
}

main().then((code) => { process.exitCode = code; }, (e: unknown) => {
  process.stdout.write(`${JSON.stringify(fehler('claude_fehler', `Coach abgestürzt: ${(e as Error).message}`))}\n`);
  process.exitCode = 1;
});
