import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baueServer, type CoachBefehl } from './app';

const HIER = dirname(fileURLToPath(import.meta.url));
const TSX = resolve(HIER, '../../../node_modules/.bin/tsx');
const RUN = resolve(HIER, '../../../agents/erklaer-coach/run.ts');
const ORIGIN = 'http://127.0.0.1:5180';
const TEXT = 'Ein Token ist ein Wortstück. Danach rechnet der Anbieter ab.';
let ordner = '';
let bin = '';

interface Antwort { status: number; json: any }
function rufe(port: number, method: string, path: string, body?: unknown, origin?: string, abbruchNachMs?: number): Promise<Antwort> {
  return new Promise((ok, nein) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => ok({ status: res.statusCode ?? 0, json: d ? JSON.parse(d) : null }));
    });
    req.on('error', (e) => (abbruchNachMs ? ok({ status: 0, json: null }) : nein(e)));
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
    if (abbruchNachMs) setTimeout(() => req.destroy(), abbruchNachMs);
  });
}

/** Echter run.ts, aber KL_CLAUDE_BIN zeigt immer auf den Fake: nie das echte claude. */
const echterCoach = (env: Record<string, string> = {}, timeoutMs = 20_000): CoachBefehl => ({
  befehl: TSX, args: [RUN], timeoutMs,
  env: { ...process.env, KL_WURZEL: ordner, PATH: `${bin}:${process.env.PATH}`, KL_CLAUDE_BIN: join(bin, 'claude'), ...env },
});
const lebt = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function warteBis(bedingung: () => boolean, ms = 15_000): Promise<void> {
  const ende = Date.now() + ms;
  while (!bedingung()) {
    if (Date.now() > ende) throw new Error('Bedingung nicht erfüllt');
    await new Promise((r) => setTimeout(r, 50));
  }
}
const pidAus = async (datei: string) => { await warteBis(() => existsSync(datei) && readFileSync(datei, 'utf8') !== ''); return Number(readFileSync(datei, 'utf8')); };
const nodeCoach = (code: string, timeoutMs = 5000): CoachBefehl => ({ befehl: process.execPath, args: ['-e', code], timeoutMs });

async function mitServer<T>(coach: CoachBefehl | undefined, arbeit: (port: number) => Promise<T>): Promise<T> {
  const s: Server = baueServer({ inhalt: join(ordner, 'inhalt'), origins: [ORIGIN], ...(coach ? { coach } : {}) });
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', () => r()));
  try {
    return await arbeit((s.address() as AddressInfo).port);
  } finally {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
}

const anfrage = (extra: Record<string, unknown> = {}) => ({ karteId: 'aie-token', zielperson: 'gf', text: TEXT, ...extra });

beforeAll(async () => {
  ordner = await mkdtemp(join(tmpdir(), 'kl-erklaeren-'));
  bin = join(ordner, 'bin');
  await mkdir(bin);
  await copyFile(resolve(HIER, '../../../agents/erklaer-coach/test/fake-claude.mjs'), join(bin, 'claude'));
  await chmod(join(bin, 'claude'), 0o755);
  await mkdir(join(ordner, 'inhalt/karten/aie'), { recursive: true });
  await writeFile(join(ordner, 'inhalt/karten/aie/modelle.json'), JSON.stringify({ track: 'aie', thema: 'Modelle', karten: [
    { id: 'aie-token', track: 'aie', thema: 'Modelle', stufe: 1, frage: 'Was ist ein Token?', antwort: 'Ein Token ist ein Stück Text. Modelle rechnen in Tokens ab.', quelle: 'x' },
  ] }));
});
afterAll(async () => { await rm(ordner, { recursive: true, force: true }); });

describe('POST /api/erklaeren', () => {
  test('Status meldet erklaeren nur mit Coach', async () => {
    await mitServer(undefined, async (p) => expect((await rufe(p, 'GET', '/api/status')).json.data).toEqual({ ok: true, version: '0.1.0', erklaeren: false }));
    await mitServer(echterCoach(), async (p) => expect((await rufe(p, 'GET', '/api/status')).json.data.erklaeren).toBe(true));
  });
  test('ohne Coach: 503', async () => {
    await mitServer(undefined, async (p) => expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(503));
  });
  test('echter Coach mit Fake-claude: 200 im Umschlag mit geprüfter Bewertung', async () => {
    await mitServer(echterCoach(), async (p) => {
      const r = await rufe(p, 'POST', '/api/erklaeren', anfrage(), ORIGIN);
      expect(r.status).toBe(200);
      expect(r.json.success).toBe(true);
      expect(r.json.error).toBeNull();
      expect(r.json.data.bewertung.kriterien.richtigkeit.punkte).toBe(3);
    });
  });
  test('Eingangsfehler: 400, 400 mit eigener Meldung, 404, 413, 403', async () => {
    await mitServer(echterCoach(), async (p) => {
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage({ zielperson: 'chef' }))).status).toBe(400);
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage({ text: 'kurz' }))).status).toBe(400);
      const lang = await rufe(p, 'POST', '/api/erklaeren', anfrage({ text: 'x'.repeat(1201) }));
      expect(lang.status).toBe(400);
      expect(lang.json.error).toContain('1200');
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage({ karteId: 'aie-gibts-nicht' }))).status).toBe(404);
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage({ karteId: 'xyz-token' }))).status).toBe(404);
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage({ text: 'x'.repeat(70_000) }))).status).toBe(413);
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage(), 'http://boese.example')).status).toBe(403);
    });
  });
  test('Fehlermeldungen sind feste Texte je Art, ohne stderr oder Pfade', async () => {
    await mitServer(echterCoach({ CLAUDE_FAKE_MODUS: 'absturz' }), async (p) => {
      const r = await rufe(p, 'POST', '/api/erklaeren', anfrage());
      expect(r.status).toBe(502);
      expect(r.json.error).toBe('Claude hat einen Fehler gemeldet');
      expect(JSON.stringify(r.json)).not.toContain('/geheimer/pfad');
    });
  });
  test('tsx fehlt: 503', async () => {
    await mitServer({ befehl: '/gibts/nicht/tsx', args: [], timeoutMs: 5000 }, async (p) => expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(503));
  });
  test('zu große Ausgabe ist 502, nicht 504', async () => {
    await mitServer(nodeCoach('process.stdout.write("x".repeat(400000))'), async (p) => expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(502));
  });
  test('Abbruch durch den Client: ganze Prozessgruppe endet, kein claude überlebt, danach ist die Sperre frei', async () => {
    const pidDatei = join(ordner, 'pid-abbruch');
    await mitServer(echterCoach({ CLAUDE_FAKE_MODUS: 'langsam', CLAUDE_FAKE_PID_DATEI: pidDatei }), async (p) => {
      const req = request({ host: '127.0.0.1', port: p, method: 'POST', path: '/api/erklaeren', headers: { 'Content-Type': 'application/json' } });
      req.on('error', () => { /* gewollt abgebrochen */ });
      req.end(JSON.stringify(anfrage()));
      const pid = await pidAus(pidDatei);
      expect(lebt(pid)).toBe(true);
      // Sperre wird vor dem Kartenscan geprüft: auch eine unbekannte Karte bekommt 429.
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage({ karteId: 'aie-gibts-nicht' }))).status).toBe(429);
      req.destroy();
      await warteBis(() => !lebt(pid), 5000);
      // Die Sperre fällt erst, wenn der Kindprozess wirklich beendet ist; das dauert einen Moment.
      let status = 429;
      for (let i = 0; i < 40 && status === 429; i++) {
        status = (await rufe(p, 'POST', '/api/erklaeren', anfrage({ karteId: 'aie-gibts-nicht' }))).status;
        if (status === 429) await new Promise((r) => setTimeout(r, 100));
      }
      expect(status).toBe(404);
    });
  });
  test('Zeitlimit des Servers: Prozessgruppe wird beendet, kein claude überlebt', async () => {
    const pidDatei = join(ordner, 'pid-zeit');
    await mitServer(echterCoach({ CLAUDE_FAKE_MODUS: 'langsam', CLAUDE_FAKE_PID_DATEI: pidDatei }, 4000), async (p) => {
      const r = rufe(p, 'POST', '/api/erklaeren', anfrage());
      const pid = await pidAus(pidDatei);
      expect((await r).status).toBe(504);
      await warteBis(() => !lebt(pid), 3000);
    });
  });
  test('claude fehlt: 503', async () => {
    await mitServer(echterCoach({ KL_CLAUDE_BIN: '/gibts/nicht' }), async (p) => {
      const r = await rufe(p, 'POST', '/api/erklaeren', anfrage());
      expect(r.status).toBe(503);
      expect(r.json.success).toBe(false);
    });
  });
  test('zweiter Lauf während des ersten: 429; claude zu langsam: 504', async () => {
    await mitServer(echterCoach({ CLAUDE_FAKE_MODUS: 'langsam', KL_COACH_TIMEOUT_MS: '2500' }), async (p) => {
      const erster = rufe(p, 'POST', '/api/erklaeren', anfrage());
      await new Promise((r) => setTimeout(r, 300));
      const zweiter = await rufe(p, 'POST', '/api/erklaeren', anfrage());
      expect(zweiter.status).toBe(429);
      expect(zweiter.json.error).toBe('Es läuft schon eine Bewertung');
      expect((await erster).status).toBe(504);
    });
  }, 20_000);
  test('kaputte oder schemafremde Ausgabe: 502', async () => {
    await mitServer(nodeCoach('process.stdout.write("müll")'), async (p) => expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(502));
    await mitServer(nodeCoach('process.stdout.write(JSON.stringify({ok:true,bewertung:{urteil:"x"}}))'), async (p) => {
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(502);
    });
    await mitServer(echterCoach({ CLAUDE_FAKE_MODUS: 'schemafalsch' }), async (p) => expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(502));
  });
  test('Kindprozess hängt: Server beendet ihn nach seinem Zeitlimit (504) und gibt die Sperre frei', async () => {
    await mitServer(nodeCoach('setTimeout(() => {}, 10000)', 400), async (p) => {
      const start = Date.now();
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(504);
      expect(Date.now() - start).toBeLessThan(3000);
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(504);
    });
  });
  test('Client bricht ab: Kindprozess endet, Sperre ist frei', async () => {
    await mitServer(nodeCoach('setTimeout(() => {}, 10000)', 8000), async (p) => {
      await rufe(p, 'POST', '/api/erklaeren', anfrage(), undefined, 200);
      await new Promise((r) => setTimeout(r, 200));
      const start = Date.now();
      const r = await Promise.race([rufe(p, 'POST', '/api/erklaeren', anfrage(), undefined, 400), new Promise<Antwort>((ok) => setTimeout(() => ok({ status: -1, json: null }), 1000))]);
      expect(r.status).not.toBe(429);
      expect(Date.now() - start).toBeLessThan(1500);
    });
  });
  test('Stundenlimit: danach 429 mit eigener Meldung', async () => {
    await mitServer({ ...nodeCoach('process.stdout.write("müll")'), maxProStunde: 1 }, async (p) => {
      expect((await rufe(p, 'POST', '/api/erklaeren', anfrage())).status).toBe(502);
      const r = await rufe(p, 'POST', '/api/erklaeren', anfrage());
      expect(r.status).toBe(429);
      expect(r.json.error).toContain('Stunde');
    });
  });
});
