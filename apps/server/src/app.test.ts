import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { baueServer } from './app';
import { imOrdner } from './dateien';

let ordner = '';
let server: Server;
let port = 0;

const vorschlag = (vid: string, id: string, extra = {}) => ({
  id, track: 'aie', thema: 'Modelle', stufe: 1, frage: `Frage ${id}?`, antwort: 'Antwort.', quelle: 'Video',
  vorschlagId: vid, begruendung: 'weil', status: 'offen', ...extra,
});

function rufe(method: string, path: string, body?: unknown, origin?: string): Promise<{ status: number; json: any; headers: Record<string, unknown> }> {
  return new Promise((ok, nein) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => ok({ status: res.statusCode ?? 0, json: d ? JSON.parse(d) : null, headers: res.headers }));
    });
    req.on('error', nein);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

beforeAll(async () => {
  ordner = await mkdtemp(join(tmpdir(), 'kl-server-'));
  await mkdir(join(ordner, 'karten/aie'), { recursive: true });
  await mkdir(join(ordner, 'vorschlaege'), { recursive: true });
  await writeFile(join(ordner, 'karten/aie/modelle.json'), JSON.stringify({ track: 'aie', thema: 'Modelle', karten: [
    { id: 'aie-alt', track: 'aie', thema: 'Modelle', stufe: 1, frage: 'Alt?', antwort: 'Ja.', quelle: 'x' },
  ] }));
  await writeFile(join(ordner, 'vorschlaege/lauf-1.json'), JSON.stringify({ laufId: 'lauf-1', quelle: 'Video', erstellt: '2026-10-27', vorschlaege: [
    vorschlag('v1', 'aie-neu'), vorschlag('v2', 'aie-zwei'), vorschlag('v3', 'aie-alt'),
    vorschlag('v4', 'aie-wissen', { thema: 'Wissen & RAG', erklaerhilfe: 'Wie ein Bibliothekar, der erst sucht und dann vorliest.' }),
    vorschlag('v5', 'aie-x', { status: 'abgelehnt' }),
  ], ideen: [
    { id: 'lauf-1-i1', titel: 'Kontext als Koffer', art: 'vergleich', beschreibung: 'Der Koffer hat feste Größe.', track: 'aie', thema: 'Kontext' },
    { id: 'lauf-1-i2', titel: 'x'.repeat(81), art: 'skizze', beschreibung: 'zu lang', track: 'aie', thema: 'Kontext' },
  ] }));
  await writeFile(join(ordner, 'vorschlaege/lauf-0.json'), JSON.stringify({ laufId: 'lauf-0', quelle: 'Alt', erstellt: '2026-10-26', vorschlaege: [] }));
  await mkdir(join(ordner, 'rohbestand'), { recursive: true });
  await writeFile(join(ordner, 'rohbestand/aie-basis.json'), JSON.stringify({ karten: [
    { id: 'aie-roh', track: 'aie', thema: 'Modelle', stufe: 1, frage: 'Roh?', antwort: 'Ja.', quelle: 'x' },
  ] }));
  await writeFile(join(ordner, 'vorschlaege/kaputt.json'), '{"nein": true}');
  server = baueServer({ inhalt: ordner, origins: ['http://127.0.0.1:5180'] });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  await rm(ordner, { recursive: true, force: true });
});

describe('Server', () => {
  test('GET /api/status liefert den Umschlag', async () => {
    const r = await rufe('GET', '/api/status');
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ success: true, data: { ok: true, version: '0.1.0', erklaeren: false }, error: null });
  });
  test('CORS nur für die erlaubte Origin', async () => {
    expect((await rufe('GET', '/api/status', undefined, 'http://127.0.0.1:5180')).headers['access-control-allow-origin']).toBe('http://127.0.0.1:5180');
    expect((await rufe('GET', '/api/status', undefined, 'http://boese.example')).headers['access-control-allow-origin']).toBeUndefined();
    expect((await rufe('OPTIONS', '/api/meldungen', undefined, 'http://127.0.0.1:5180')).status).toBe(204);
  });
  test('GET /api/vorschlaege liefert nur offene, ignoriert kaputte Dateien', async () => {
    const r = await rufe('GET', '/api/vorschlaege');
    expect(r.json.data.vorschlaege.map((v: { vorschlagId: string }) => v.vorschlagId)).toEqual(['v1', 'v2', 'v3', 'v4']);
  });
  test('GET /api/vorschlaege liefert gültige Ideen mit Quelle, tolerant ohne ideen-Feld', async () => {
    const r = await rufe('GET', '/api/vorschlaege');
    expect(r.json.data.ideen).toEqual([{
      id: 'lauf-1-i1', titel: 'Kontext als Koffer', art: 'vergleich', beschreibung: 'Der Koffer hat feste Größe.',
      track: 'aie', thema: 'Kontext', quelle: 'Video', laufId: 'lauf-1',
    }]);
  });
  test('annehmen hängt die Karte an die Themen-Datei und setzt den Status', async () => {
    const r = await rufe('POST', '/api/vorschlaege/v1/annehmen');
    expect(r.status).toBe(200);
    expect(r.json.data.id).toBe('aie-neu');
    const datei = JSON.parse(await readFile(join(ordner, 'karten/aie/modelle.json'), 'utf8'));
    expect(datei.karten.map((k: { id: string }) => k.id)).toEqual(['aie-alt', 'aie-neu']);
    const eingang = JSON.parse(await readFile(join(ordner, 'rohbestand/eingang.json'), 'utf8'));
    expect(eingang.karten.map((k: { id: string }) => k.id)).toEqual(['aie-neu']);
    const lauf = JSON.parse(await readFile(join(ordner, 'vorschlaege/lauf-1.json'), 'utf8'));
    expect(lauf.vorschlaege[0].status).toBe('angenommen');
    expect((await rufe('POST', '/api/vorschlaege/v1/annehmen')).status).toBe(409);
  });
  test('annehmen legt eine neue Themen-Datei per Slug an', async () => {
    expect((await rufe('POST', '/api/vorschlaege/v4/annehmen')).status).toBe(200);
    const datei = JSON.parse(await readFile(join(ordner, 'karten/aie/wissen-und-rag.json'), 'utf8'));
    expect(datei.thema).toBe('Wissen & RAG');
    expect(datei.karten[0].erklaerhilfe).toMatch(/Bibliothekar/);
    const eingang = JSON.parse(await readFile(join(ordner, 'rohbestand/eingang.json'), 'utf8'));
    expect(eingang.karten.at(-1).erklaerhilfe).toMatch(/Bibliothekar/);
  });
  test('annehmen lehnt eine schon vorhandene id ab', async () => {
    const r = await rufe('POST', '/api/vorschlaege/v3/annehmen');
    expect(r.status).toBe(409);
    expect(r.json.success).toBe(false);
  });
  test('annehmen lehnt eine id ab, die es nur im Rohbestand gibt', async () => {
    await writeFile(join(ordner, 'vorschlaege/lauf-2.json'), JSON.stringify({ laufId: 'lauf-2', quelle: 'V', erstellt: '2026-10-28', vorschlaege: [vorschlag('v9', 'aie-roh')] }));
    expect((await rufe('POST', '/api/vorschlaege/v9/annehmen')).status).toBe(409);
  });
  test('abgebrochenes Annehmen (Karte schon im Eingang) wird zu Ende geführt statt 409', async () => {
    const eingang = JSON.parse(await readFile(join(ordner, 'rohbestand/eingang.json'), 'utf8'));
    const halb = { id: 'aie-halb', track: 'aie', thema: 'Modelle', stufe: 1, frage: 'Frage aie-halb?', antwort: 'Antwort.', quelle: 'Video' };
    await writeFile(join(ordner, 'rohbestand/eingang.json'), JSON.stringify({ ...eingang, karten: [...eingang.karten, halb] }));
    await writeFile(join(ordner, 'vorschlaege/lauf-3.json'), JSON.stringify({ laufId: 'lauf-3', quelle: 'Video', erstellt: '2026-10-28', vorschlaege: [vorschlag('v10', 'aie-halb')] }));
    expect((await rufe('POST', '/api/vorschlaege/v10/annehmen')).status).toBe(200);
    const nachher = JSON.parse(await readFile(join(ordner, 'rohbestand/eingang.json'), 'utf8'));
    expect(nachher.karten.filter((k: { id: string }) => k.id === 'aie-halb')).toHaveLength(1);
    const datei = JSON.parse(await readFile(join(ordner, 'karten/aie/modelle.json'), 'utf8'));
    expect(datei.karten.some((k: { id: string }) => k.id === 'aie-halb')).toBe(true);
  });
  test('ablehnen setzt den Status und löscht nichts', async () => {
    expect((await rufe('POST', '/api/vorschlaege/v2/ablehnen')).status).toBe(200);
    const lauf = JSON.parse(await readFile(join(ordner, 'vorschlaege/lauf-1.json'), 'utf8'));
    expect(lauf.vorschlaege).toHaveLength(5);
    expect(lauf.vorschlaege[1].status).toBe('abgelehnt');
    expect((await rufe('POST', '/api/vorschlaege/v5/ablehnen')).status).toBe(409);
  });
  test('unbekannte Vorschläge geben 404', async () => {
    expect((await rufe('POST', '/api/vorschlaege/gibtsnicht/annehmen')).status).toBe(404);
  });
  test('../ in der Vorschlags-id wird abgelehnt', async () => {
    for (const p of ['/api/vorschlaege/..%2F..%2Fetc/annehmen', '/api/vorschlaege/%2E%2E/ablehnen', '/api/vorschlaege/..%5Cx/annehmen']) {
      const r = await rufe('POST', p);
      expect(r.status).toBe(400);
      expect(r.json.success).toBe(false);
    }
  });
  test('imOrdner verhindert Ausbrüche', () => {
    expect(() => imOrdner(ordner, '../x')).toThrow();
    expect(() => imOrdner(ordner, 'karten', '../../x')).toThrow();
    expect(imOrdner(ordner, 'karten')).toBe(join(ordner, 'karten'));
  });
  test('POST /api/meldungen prüft mit zod und schreibt jsonl', async () => {
    expect((await rufe('POST', '/api/meldungen', { id: 'aie-alt', grund: 'Antwort unklar' })).status).toBe(201);
    expect((await rufe('POST', '/api/meldungen', { id: '../x', grund: 'a' })).status).toBe(400);
    expect((await rufe('POST', '/api/meldungen', { id: 'aie-alt', grund: 'x'.repeat(301) })).status).toBe(400);
    expect((await rufe('POST', '/api/meldungen', 'kein json')).status).toBe(400);
    const tag = new Date().toISOString().slice(0, 10);
    const zeilen = (await readFile(join(ordner, `meldungen/${tag}.jsonl`), 'utf8')).trim().split('\n');
    expect(zeilen).toHaveLength(1);
    expect(JSON.parse(zeilen[0] ?? '{}').grund).toBe('Antwort unklar');
  });
  test('CSRF-Abwehr: fremde Origin und Nicht-JSON bei POST werden abgelehnt', async () => {
    expect((await rufe('POST', '/api/vorschlaege/v1/ablehnen', undefined, 'http://boese.example')).status).toBe(403);
    const r = await new Promise<number>((ok) => {
      const req = request({ host: '127.0.0.1', port, method: 'POST', path: '/api/meldungen', headers: { 'Content-Type': 'text/plain' } }, (res) => { res.resume(); ok(res.statusCode ?? 0); });
      req.end(JSON.stringify({ id: 'aie-alt', grund: 'x' }));
    });
    expect(r).toBe(415);
    expect((await rufe('POST', '/api/vorschlaege/%zz/annehmen')).status).toBe(400);
  });
  test('zu große Anfragen und unbekannte Routen', async () => {
    expect((await rufe('POST', '/api/meldungen', { id: 'a', grund: 'x'.repeat(70000) })).status).toBe(413);
    expect((await rufe('GET', '/api/nichts')).status).toBe(404);
  });
});

describe('Host-Prüfung', () => {
  test('fremder Host-Header wird abgelehnt (DNS-Rebinding)', async () => {
    const s = baueServer({ inhalt: tmpdir(), origins: [], hosts: ['127.0.0.1:1'] });
    await new Promise<void>((r) => s.listen(0, '127.0.0.1', () => r()));
    const p = (s.address() as AddressInfo).port;
    const status = await new Promise<number>((ok) => {
      request({ host: '127.0.0.1', port: p, path: '/api/status', headers: { Host: 'boese.example' } }, (res) => { res.resume(); ok(res.statusCode ?? 0); }).end();
    });
    await new Promise((r) => s.close(r));
    expect(status).toBe(403);
  });
});
