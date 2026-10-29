import { describe, expect, test } from 'vitest';
import { normalisiereThema, teileAuf } from './bestand';
import type { Karte } from './typen';

const k = (id: string, thema: string, frage = id, track: 'aie' | 'fde' = 'aie'): Karte => ({
  id, track, thema, stufe: 1, frage, antwort: 'a', quelle: 'q',
});

describe('normalisiereThema', () => {
  test('Modell wird Modelle, Werkzeuge wird Runtime, sonst unverändert', () => {
    expect(normalisiereThema('Modell')).toBe('Modelle');
    expect(normalisiereThema('Werkzeuge')).toBe('Runtime');
    expect(normalisiereThema(' Kosten ')).toBe('Kosten');
  });
});

describe('teileAuf', () => {
  test('gruppiert nach Track und Thema mit Slug-Pfad und normalisiert Themen', () => {
    const r = teileAuf([k('aie-a', 'Modell'), k('aie-b', 'Modelle', 'Wie groß?'), k('fde-c', 'Wissen & RAG', 'x', 'fde')]);
    expect(r.dateien.map((d) => d.pfad)).toEqual(['aie/modelle.json', 'fde/wissen-und-rag.json']);
    expect(r.dateien[0]?.inhalt.karten.map((x) => x.thema)).toEqual(['Modelle', 'Modelle']);
  });
  test('behält bei doppelter id die erste Karte', () => {
    const r = teileAuf([k('aie-a', 'Kosten', 'eins'), k('aie-a', 'Kosten', 'zwei')]);
    expect(r.dateien[0]?.inhalt.karten).toHaveLength(1);
    expect(r.dateien[0]?.inhalt.karten[0]?.frage).toBe('eins');
    expect(r.verworfen).toEqual([{ id: 'aie-a', frage: 'zwei', grund: 'doppelte id', behalten: 'aie-a' }]);
  });
  test('verwirft fast gleiche Frage im selben Track, nicht im anderen', () => {
    const r = teileAuf([
      k('aie-a', 'Kosten', 'Was ist ein Webhook?'),
      k('aie-b', 'Tools', 'Was ist ein Webhook'),
      k('fde-c', 'Daten', 'Was ist ein Webhook?', 'fde'),
    ]);
    expect(r.verworfen.map((v) => v.id)).toEqual(['aie-b']);
    expect(r.verworfen[0]?.grund).toBe('fast gleiche Frage');
  });
  test('ist idempotent', () => {
    const roh = [k('aie-a', 'Kosten'), k('aie-b', 'Tools', 'andere Frage')];
    const r1 = teileAuf(roh);
    const r2 = teileAuf(r1.dateien.flatMap((d) => d.inhalt.karten));
    expect(r2.dateien).toEqual(r1.dateien);
  });
});

describe('teileAuf reicht optionale Felder durch', () => {
  test('skizze und erklaerhilfe bleiben erhalten', () => {
    const k = { id: 'aie-x', track: 'aie' as const, thema: 'MCP', stufe: 1 as const, frage: 'F?', antwort: 'A', quelle: 'q', skizze: 'mcp', erklaerhilfe: 'Wie ein Stecker.' };
    const [d] = teileAuf([k]).dateien;
    expect(d?.inhalt.karten[0]).toMatchObject({ skizze: 'mcp', erklaerhilfe: 'Wie ein Stecker.' });
  });
});
