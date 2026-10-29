import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { werteAus, werteIdeenAus, parseClaudeAusgabe } from './auswertung';
import { baueAuftrag, ladeKarten } from './bestand';
import { rufeClaude } from './claude';
import { parseArgs, liesTranskript, type Args } from './eingaben';
import { ladeUmgebung, type Umgebung } from './konfig';
import { schreibeMitMandat } from './mandat';
import { holeYoutubeTranskript, youtubeId } from './youtube';

interface Eingabe { transkript: string; quelle: string; url?: string }

/** Datei lesen oder YouTube-Untertitel holen. Ohne --quelle gilt bei Links der Videotitel. */
async function ladeEingabe(args: Args, umg: Umgebung): Promise<Eingabe> {
  const id = youtubeId(args.datei);
  if (!id) {
    if (!args.quelle) throw new Error('--quelle muss gesetzt sein');
    return { transkript: liesTranskript(args.datei, umg.konfig.max_transkript_kb), quelle: args.quelle };
  }
  const yt = await holeYoutubeTranskript(id, umg.ytdlpBin, umg.konfig.timeout_s * 1000);
  if (Buffer.byteLength(yt.text) >= umg.konfig.max_transkript_kb * 1024) throw new Error('Transkript ist zu groß');
  return { transkript: yt.text, quelle: args.quelle ?? `YouTube: ${yt.titel}`.slice(0, 300), url: `https://www.youtube.com/watch?v=${id}` };
}

function neueLaufId(): string {
  const z = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `${z}-${randomBytes(3).toString('hex')}`;
}

async function main(): Promise<number> {
  const start = Date.now();
  const umg = ladeUmgebung();
  const laufId = neueLaufId();
  const logOrdner = join(umg.wurzel, umg.konfig.log_pfad);
  const erlaubt = join(umg.wurzel, umg.konfig.erlaubter_schreibpfad);
  const log: Record<string, unknown> = { laufId, start: new Date(start).toISOString() };
  const schreibeLog = (extra: Record<string, unknown>) =>
    schreibeMitMandat(join(logOrdner, `${laufId}.json`), { ...log, ...extra, dauerMs: Date.now() - start }, logOrdner);

  try {
    const args = parseArgs(process.argv.slice(2));
    const { transkript, quelle, url } = await ladeEingabe(args, umg);
    Object.assign(log, { quelle, url: url ?? null, track: args.track ?? null, hash: createHash('sha256').update(transkript).digest('hex') });
    const karten = ladeKarten(join(umg.wurzel, 'inhalt'));
    const auftrag = baueAuftrag(umg.prompt, karten, transkript, args.track);
    const r = await rufeClaude(umg.claudeBin, auftrag, umg.schema, umg.konfig.modell, umg.konfig.timeout_s * 1000);
    if (r.exitCode !== 0) throw Object.assign(new Error(`claude endete mit Code ${r.exitCode}: ${r.stderr.slice(0, 500)}`), { exitCode: r.exitCode });
    const roh = parseClaudeAusgabe(r.stdout);
    const a = werteAus(roh.vorschlaege, { laufId, quelle, track: args.track, bestand: karten, max: umg.konfig.max_vorschlaege });
    const ideen = werteIdeenAus(roh.ideen, { laufId, quelle, track: args.track });
    const ziel = schreibeMitMandat(join(erlaubt, `${laufId}.json`), {
      laufId, quelle, ...(url ? { url } : {}), erstellt: new Date().toISOString(), vorschlaege: a.vorschlaege, ideen,
    }, erlaubt);
    try {
      schreibeLog({ exitCode: 0, zaehlung: { roh: roh.vorschlaege.length, gueltig: a.vorschlaege.length, ungueltig: a.ungueltig, dubletten: a.dubletten, ideen: ideen.length }, ziel, fehler: null });
    } catch (logFehler) {
      process.stderr.write(`Vorschläge gespeichert, aber Log nicht schreibbar: ${(logFehler as Error).message}\n`);
    }
    process.stdout.write(`${a.vorschlaege.length} Vorschläge, ${a.dubletten} Dubletten, ${ideen.length} Ideen → im Eingang prüfen` +
      `${a.ungueltig ? ` (${a.ungueltig} ungültige verworfen)` : ''}\n`);
    return 0;
  } catch (e) {
    const fehler = (e as Error).message;
    const exitCode = (e as { exitCode?: number }).exitCode ?? 1;
    try { schreibeLog({ exitCode, fehler }); } catch (logFehler) { process.stderr.write(`Log nicht schreibbar: ${(logFehler as Error).message}\n`); }
    process.stderr.write(`Tutor abgebrochen: ${fehler}\n`);
    return exitCode || 1;
  }
}

main().then((code) => { process.exitCode = code; });
