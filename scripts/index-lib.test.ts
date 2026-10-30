import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baueIndex } from './index-lib';
import { INHALT } from './lib';

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

const lies = () => JSON.parse(readFileSync(join(ziel(), 'index.json'), 'utf8')) as {
  roadmaps: { track: string; themen: { thema: string; bild?: string }[] }[];
  labor: { id: string; themen: string[]; karten: string[] }[]; grundlaeufe: { id: string }[];
};
const echt = (datei: string) => JSON.parse(readFileSync(join(INHALT, 'labor', datei), 'utf8')) as Record<string, unknown>;

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

describe('baueIndex mit Labor', () => {
  test('schreibt Störfälle und Grundlauf, KL_AUSSCHLIESSEN filtert über die Themen', () => {
    json(join(inhalt(), 'labor/aie-labor-a.json'), { ...echt('aie-labor-endlosschleife.json'), id: 'aie-labor-a', themen: ['Modelle'] });
    json(join(inhalt(), 'labor/fde-labor-b.json'), { ...echt('fde-labor-injektion.json'), id: 'fde-labor-b', themen: ['wiya'] });
    json(join(inhalt(), 'labor/fde-labor-c.json'), { ...echt('fde-labor-injektion.json'), id: 'fde-labor-c', themen: ['wiya', 'Sicherheit'], karten: ['aie-a', 'aie-w'] });
    json(join(inhalt(), 'labor/aie-grundlauf.json'), echt('aie-grundlauf.json'));
    baueIndex({ inhalt: inhalt(), ziel: ziel() });
    expect(lies().labor.map((s) => s.id)).toEqual(['aie-labor-a', 'fde-labor-b', 'fde-labor-c']);
    expect(lies().grundlaeufe.map((g) => g.id)).toEqual(['aie-grundlauf']);
    expect(lies().labor.find((s) => s.id === 'fde-labor-c')).toMatchObject({ themen: ['wiya', 'Sicherheit'], karten: ['aie-a', 'aie-w'] });
    const r = baueIndex({ inhalt: inhalt(), ziel: ziel(), aus: new Set(['wiya']) });
    // Nur-wiya-Fall fällt weg; der gemischte bleibt, aber ohne wiya-Thema und ohne Karten, die nicht im Index stehen.
    expect(lies().labor.map((s) => s.id)).toEqual(['aie-labor-a', 'fde-labor-c']);
    expect(lies().labor.find((s) => s.id === 'fde-labor-c')).toMatchObject({ themen: ['Sicherheit'], karten: ['aie-a'] });
    expect(readFileSync(join(ziel(), 'index.json'), 'utf8').toLowerCase()).not.toContain('wiya');
    expect(r.labor).toBe(2);
  });
  test('ohne Labor-Ordner bleibt die Liste leer', () => {
    baueIndex({ inhalt: inhalt(), ziel: ziel() });
    expect(lies().labor).toEqual([]);
  });
});
