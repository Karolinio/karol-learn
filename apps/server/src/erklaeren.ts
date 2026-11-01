import { spawn } from 'node:child_process';
import {
  agentAntwortSchema, erklaerAnfrageSchema, karteSchema, kernpunkteVon, MAX_ERKLAER_TEXT, TRACKS, zielperson,
  type AgentAntwort, type CoachEingabe, type ErklaerAnfrage, type ErklaerBewertung, type Karte, type Track,
} from '@karol-learn/karten-kern';
import { imOrdner, jsonDateien, liesJson } from './dateien';
import { FachFehler } from './vorschlaege';

/** Wie der Server den Erklär-Coach startet: fester Befehl ohne Shell, z. B. tsx + agents/erklaer-coach/run.ts. */
export interface CoachBefehl {
  befehl: string;
  args: readonly string[];
  /** Zeitlimit für den Kindprozess; claude selbst hat 60 s. */
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  /** Nur für Tests; sonst MAX_LAEUFE_PRO_STUNDE. */
  maxProStunde?: number;
}

export const MAX_LAEUFE_PRO_STUNDE = 30;
const STUNDE_MS = 60 * 60 * 1000;
const MAX_AUSGABE = 256 * 1024;

/** Fehlerart des Agenten → HTTP-Status. */
const STATUS: Readonly<Record<Exclude<AgentAntwort, { ok: true }>['art'], number>> = {
  eingabe: 400, claude_fehlt: 503, zeit: 504, ausgabe: 502, claude_fehler: 502,
};

/** Sucht eine Karte nur im Track ihres Präfixes, über den vorhandenen Themen-Leser. */
export async function findeKarte(inhalt: string, id: string): Promise<Karte | undefined> {
  const track = TRACKS.find((t) => id.startsWith(`${t}-`)) as Track | undefined;
  if (!track) return undefined;
  const ordner = imOrdner(inhalt, 'karten', track);
  for (const f of await jsonDateien(ordner)) {
    const d = await liesJson<{ karten?: unknown[] }>(imOrdner(ordner, f));
    for (const roh of d.karten ?? []) {
      const k = karteSchema.safeParse(roh);
      if (k.success && k.data.id === id) return k.data;
    }
  }
  return undefined;
}

type Lauf = { art: 'fertig'; stdout: string } | { art: 'zeit' | 'abgebrochen' | 'zu_gross' | 'fehlt' };

/** Beendet die ganze Prozessgruppe (tsx → node → claude). Ist sie schon weg, ist nichts zu tun. */
function beendeGruppe(pid: number | undefined): void {
  if (!pid) return;
  try { process.kill(-pid, 'SIGTERM'); } catch { /* Gruppe schon beendet */ }
}

/**
 * Startet den Coach in eigener Prozessgruppe (detached), ohne Shell. Bei Abbruch, Zeitlimit oder zu großer
 * Ausgabe endet die ganze Gruppe. Das Ergebnis kommt erst, wenn der Kindprozess wirklich beendet ist.
 */
function starteCoach(c: CoachBefehl, eingabe: CoachEingabe, signal: AbortSignal): Promise<Lauf> {
  return new Promise((ok) => {
    const kind = spawn(c.befehl, [...c.args], { env: c.env ?? process.env, detached: true, stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
    const teile: Buffer[] = [];
    let groesse = 0;
    let grund: Lauf['art'] | undefined;
    const stoppe = (g: Lauf['art']) => { grund ??= g; beendeGruppe(kind.pid); };
    const zeit = setTimeout(() => stoppe('zeit'), c.timeoutMs);
    const abbruch = () => stoppe('abgebrochen');
    signal.addEventListener('abort', abbruch);
    kind.stdout?.on('data', (t: Buffer) => {
      groesse += t.length;
      if (groesse > MAX_AUSGABE) stoppe('zu_gross'); else teile.push(t);
    });
    kind.on('error', (e: NodeJS.ErrnoException) => { if (e.code === 'ENOENT') grund ??= 'fehlt'; });
    kind.on('close', () => {
      clearTimeout(zeit);
      signal.removeEventListener('abort', abbruch);
      ok(grund && grund !== 'fertig' ? { art: grund } : { art: 'fertig', stdout: Buffer.concat(teile).toString('utf8') });
    });
    kind.stdin?.on('error', () => { /* Kind schon beendet: Ergebnis kommt über close */ });
    kind.stdin?.end(JSON.stringify(eingabe));
    if (signal.aborted) abbruch();
  });
}

/** Feste Texte je Fehlerart: stderr, Pfade und Modelltexte des Agenten gehen nie an den Client. */
const MELDUNG: Readonly<Record<Exclude<AgentAntwort, { ok: true }>['art'], string>> = {
  eingabe: 'Die Anfrage passt nicht zum Coach',
  claude_fehlt: 'claude ist auf diesem Mac nicht eingerichtet',
  zeit: 'Die Bewertung hat zu lange gedauert',
  ausgabe: 'Die Antwort des Coachs hatte ein unerwartetes Format',
  claude_fehler: 'Claude hat einen Fehler gemeldet',
};

/** Zweite Prüfung der Agenten-Ausgabe: genau eine JSON-Zeile nach agentAntwortSchema. */
function werteAus(stdout: string): ErklaerBewertung {
  const zeile = stdout.trim().split('\n').pop() ?? '';
  let roh: unknown;
  try { roh = JSON.parse(zeile); } catch { throw new FachFehler(502, MELDUNG.ausgabe); }
  const a = agentAntwortSchema.safeParse(roh);
  if (!a.success) throw new FachFehler(502, MELDUNG.ausgabe);
  if (!a.data.ok) throw new FachFehler(STATUS[a.data.art], MELDUNG[a.data.art]);
  return a.data.bewertung;
}

function pruefeLauf(lauf: Lauf): ErklaerBewertung {
  if (lauf.art === 'fertig') return werteAus(lauf.stdout);
  if (lauf.art === 'zeit') throw new FachFehler(504, MELDUNG.zeit);
  if (lauf.art === 'zu_gross') throw new FachFehler(502, MELDUNG.ausgabe);
  if (lauf.art === 'fehlt') throw new FachFehler(503, 'Der Erklär-Coach lässt sich nicht starten');
  throw new FachFehler(499, 'Abgebrochen');
}

function coachEingabe(karte: Karte, anfrage: ErklaerAnfrage): CoachEingabe {
  return {
    karte: { id: karte.id, track: karte.track, frage: karte.frage, antwort: karte.antwort, kernpunkte: kernpunkteVon(karte), ...(karte.erklaerhilfe ? { erklaerhilfe: karte.erklaerhilfe } : {}) },
    zielperson: zielperson(anfrage.zielperson), text: anfrage.text, ...(anfrage.nachfrage ? { nachfrage: anfrage.nachfrage } : {}),
  };
}

export interface ErklaerDienst { bewerte: (body: unknown, signal: AbortSignal) => Promise<{ bewertung: ErklaerBewertung }> }

/** Eine Bewertung gleichzeitig, höchstens 30 pro Stunde. Zustand lebt je Server-Instanz. */
export function baueErklaerDienst(inhalt: string, coach: CoachBefehl | undefined): ErklaerDienst {
  let laeuft = false;
  let starts: readonly number[] = [];
  const limit = coach?.maxProStunde ?? MAX_LAEUFE_PRO_STUNDE;

  async function bewerte(body: unknown, signal: AbortSignal) {
    if (!coach) throw new FachFehler(503, 'Der Erklär-Coach ist auf diesem Server nicht eingerichtet');
    const text = (body as { text?: unknown } | null)?.text;
    if (typeof text === 'string' && text.trim().length > MAX_ERKLAER_TEXT) throw new FachFehler(400, `Deine Erklärung ist länger als ${MAX_ERKLAER_TEXT} Zeichen`);
    const r = erklaerAnfrageSchema.safeParse(body);
    if (!r.success) throw new FachFehler(400, 'Anfrage braucht karteId, zielperson und 20 bis 1200 Zeichen Text');
    // Sperre und Stundenlimit vor dem Kartenscan: ein laufender Coach blockiert auch das Lesen.
    if (laeuft) throw new FachFehler(429, 'Es läuft schon eine Bewertung');
    const jetzt = Date.now();
    starts = starts.filter((t) => jetzt - t < STUNDE_MS);
    if (starts.length >= limit) throw new FachFehler(429, `Mehr als ${limit} Bewertungen in einer Stunde. Mach eine Pause oder prüf selbst.`);
    laeuft = true;
    try {
      const karte = await findeKarte(inhalt, r.data.karteId);
      if (!karte) throw new FachFehler(404, `Karte ${r.data.karteId} nicht gefunden`);
      starts = [...starts, jetzt];
      // Die Sperre fällt erst, wenn der Kindprozess beendet ist (starteCoach wartet auf close).
      return { bewertung: pruefeLauf(await starteCoach(coach, coachEingabe(karte, r.data), signal)) };
    } finally {
      laeuft = false;
    }
  }
  return { bewerte };
}
