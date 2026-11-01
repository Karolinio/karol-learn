import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { haengeZeileAn, imOrdner, PfadFehler } from './dateien';
import { baueErklaerDienst, type CoachBefehl, type ErklaerDienst } from './erklaeren';
import { FachFehler, ideen, lehneAb, nimmAn, offeneVorschlaege, vidSchema } from './vorschlaege';

export const VERSION = '0.1.0';
const MAX_BODY = 64 * 1024;

export type { CoachBefehl } from './erklaeren';
export interface Optionen {
  inhalt: string; origins: readonly string[]; hosts?: readonly string[];
  /** Erklär-Coach als Kindprozess; ohne ihn meldet /api/status erklaeren: false. */
  coach?: CoachBefehl;
}

const meldungSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
  grund: z.string().trim().min(1).max(300),
});

type Antwort = { status: number; body: { success: boolean; data: unknown; error: string | null } };
const ok = (data: unknown, status = 200): Antwort => ({ status, body: { success: true, data, error: null } });
const fehler = (status: number, error: string): Antwort => ({ status, body: { success: false, data: null, error } });

async function liesBody(req: IncomingMessage): Promise<unknown> {
  const teile: Buffer[] = [];
  let groesse = 0;
  for await (const teil of req) {
    groesse += (teil as Buffer).length;
    if (groesse > MAX_BODY) throw new FachFehler(413, 'Anfrage zu groß');
    teile.push(teil as Buffer);
  }
  try {
    return teile.length ? JSON.parse(Buffer.concat(teile).toString('utf8')) : {};
  } catch {
    throw new FachFehler(400, 'Kein gültiges JSON');
  }
}

/** Schutz gegen CSRF und DNS-Rebinding: fremde Origin, falscher Host oder kein JSON bei POST. */
function abwehr(req: IncomingMessage, opt: Optionen): Antwort | undefined {
  const host = req.headers.host ?? '';
  if (opt.hosts && !opt.hosts.includes(host)) return fehler(403, 'Host nicht erlaubt');
  if (req.method !== 'POST') return undefined;
  const origin = req.headers.origin;
  if (origin && !opt.origins.includes(origin)) return fehler(403, 'Origin nicht erlaubt');
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return fehler(415, 'Content-Type muss application/json sein');
  return undefined;
}

function vidAusPfad(roh: string): string | undefined {
  try {
    const r = vidSchema.safeParse(decodeURIComponent(roh));
    return r.success ? r.data : undefined;
  } catch {
    return undefined;
  }
}

async function route(req: IncomingMessage, opt: Optionen, erklaeren: ErklaerDienst, signal: AbortSignal): Promise<Antwort> {
  const pfad = (req.url ?? '/').split('?')[0] ?? '/';
  const m = req.method ?? 'GET';
  const abgewehrt = abwehr(req, opt);
  if (abgewehrt) return abgewehrt;
  if (m === 'GET' && pfad === '/api/status') return ok({ ok: true, version: VERSION, erklaeren: !!opt.coach });
  if (m === 'GET' && pfad === '/api/vorschlaege') {
    const [vorschlaege, liste] = await Promise.all([offeneVorschlaege(opt.inhalt), ideen(opt.inhalt)]);
    return ok({ vorschlaege, ideen: liste });
  }
  const treffer = /^\/api\/vorschlaege\/([^/]+)\/(annehmen|ablehnen)$/.exec(pfad);
  if (m === 'POST' && treffer) {
    const vid = vidAusPfad(treffer[1] ?? '');
    if (!vid) return fehler(400, 'Ungültige Vorschlags-id');
    return treffer[2] === 'annehmen' ? ok(await nimmAn(opt.inhalt, vid)) : ok(await lehneAb(opt.inhalt, vid));
  }
  if (m === 'POST' && pfad === '/api/meldungen') {
    const r = meldungSchema.safeParse(await liesBody(req));
    if (!r.success) return fehler(400, 'Meldung braucht id und grund (höchstens 300 Zeichen)');
    const tag = new Date().toISOString().slice(0, 10);
    await haengeZeileAn(imOrdner(opt.inhalt, 'meldungen', `${tag}.jsonl`), { ...r.data, zeit: new Date().toISOString() });
    return ok({ gespeichert: true }, 201);
  }
  if (m === 'POST' && pfad === '/api/erklaeren') return ok(await erklaeren.bewerte(await liesBody(req), signal));
  return fehler(404, 'Nicht gefunden');
}

function cors(req: IncomingMessage, res: ServerResponse, opt: Optionen): void {
  const origin = req.headers.origin;
  if (origin && opt.origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

export function baueServer(opt: Optionen, protokoll: (z: string) => void = () => {}): Server {
  const erklaeren = baueErklaerDienst(opt.inhalt, opt.coach);
  return createServer((req, res) => {
    cors(req, res, opt);
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    // Bricht der Client ab, endet auch ein laufender Kindprozess (Erklär-Coach).
    const abbruch = new AbortController();
    res.on('close', () => { if (!res.writableFinished) abbruch.abort(); });
    route(req, opt, erklaeren, abbruch.signal)
      .catch((e: unknown): Antwort => {
        if (e instanceof FachFehler) return fehler(e.status, e.message);
        if (e instanceof PfadFehler) return fehler(400, 'Ungültiger Pfad');
        protokoll(`Fehler bei ${req.method} ${req.url}: ${(e as Error).stack ?? String(e)}`);
        return fehler(500, 'Interner Fehler');
      })
      .then(({ status, body }) => {
        if (res.destroyed) return;
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
        res.end(JSON.stringify(body));
      });
  });
}
