import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baueIndex } from './index-lib';

let wurzel = '';
const inhalt = () => join(wurzel, 'inhalt');
const ziel = () => join(wurzel, 'public', 'inhalt');
const karte = (id: string, thema: string) => ({ id, track: 'aie', thema, stufe: 1, frage: `${id}?`, antwort: 'a', quelle: 'q' });
const json = (p: string, d: unknown) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(d)); };

beforeEach(() => {
  wurzel = mkdtempSync(join(tmpdir(), 'kl-index-'));
  json(join(inhalt(), 'karten/aie/modelle.json'), { track: 'aie', thema: 'Modelle', karten: [karte('aie-a', 'Modelle')] });
  json(join(inhalt(), 'karten/aie/wiya.json'), { track: 'aie', thema: 'wiya', karten: [karte('aie-w', 'wiya')] });
  json(join(inhalt(), 'roadmap/aie.json'), { track: 'aie', titel: 'A', themen: [
    { thema: 'Modelle', gruppe: 'G', text: 't' }, { thema: 'Wissen & RAG', gruppe: 'G', text: 't' }, { thema: 'wiya', gruppe: 'G', text: 't' },
  ] });
  json(join(inhalt(), 'roadmap/fde.json'), { track: 'fde', titel: 'F', themen: [{ thema: 'Rolle', gruppe: 'G', text: 't' }] });
  mkdirSync(join(inhalt(), 'bilder/themen'), { recursive: true });
  for (const f of ['aie-modelle.webp', 'aie-wiya.webp', 'README.txt']) writeFileSync(join(inhalt(), 'bilder/themen', f), 'x');
  mkdirSync(join(ziel(), 'bilder'), { recursive: true });
  writeFileSync(join(ziel(), 'bilder/veraltet.webp'), 'x');
});
afterEach(() => rmSync(wurzel, { recursive: true, force: true }));

const lies = () => JSON.parse(readFileSync(join(ziel(), 'index.json'), 'utf8')) as { roadmaps: { track: string; themen: { thema: string; bild?: string }[] }[] };

describe('baueIndex mit Themenbildern', () => {
  test('ordnet vorhandene Bilder zu, fehlende sind kein Fehler', () => {
    const r = baueIndex({ inhalt: inhalt(), ziel: ziel() });
    const themen = lies().roadmaps[0]!.themen;
    expect(themen.find((t) => t.thema === 'Modelle')?.bild).toBe('inhalt/bilder/aie-modelle.webp');
    expect(themen.find((t) => t.thema === 'Wissen & RAG')).not.toHaveProperty('bild');
    expect(r.bilder).toBe(2);
  });
  test('kopiert nur genutzte Bilder und räumt alte Kopien weg', () => {
    baueIndex({ inhalt: inhalt(), ziel: ziel() });
    expect(readdirSync(join(ziel(), 'bilder')).sort()).toEqual(['aie-modelle.webp', 'aie-wiya.webp']);
  });
  test('KL_AUSSCHLIESSEN lässt Thema, Karten und Bild weg', () => {
    const r = baueIndex({ inhalt: inhalt(), ziel: ziel(), aus: new Set(['wiya']) });
    expect(lies().roadmaps[0]!.themen.map((t) => t.thema)).toEqual(['Modelle', 'Wissen & RAG']);
    expect(existsSync(join(ziel(), 'bilder/aie-wiya.webp'))).toBe(false);
    expect(r.karten).toBe(1);
  });
  test('ohne Bilderordner läuft der Index trotzdem', () => {
    rmSync(join(inhalt(), 'bilder'), { recursive: true });
    expect(baueIndex({ inhalt: inhalt(), ziel: ziel() }).bilder).toBe(0);
  });
});
