import { describe, expect, test } from 'vitest';
import { fehlendeBilder, ordneBilderZu, themenBildDatei } from './bilder';
import type { Roadmap } from './typen';

const rm: Roadmap = {
  track: 'aie', titel: 'AI Engineer',
  themen: [
    { thema: 'Wissen & RAG', gruppe: 'G', text: 't' },
    { thema: 'Modelle', gruppe: 'G', text: 't', bild: 'inhalt/bilder/alt.webp' },
  ],
};

describe('Themenbilder', () => {
  test('Dateiname aus Track und Slug des Themas', () => {
    expect(themenBildDatei('aie', 'Wissen & RAG')).toBe('aie-wissen-und-rag.webp');
    expect(themenBildDatei('fde', 'Recht & Regulierung')).toBe('fde-recht-und-regulierung.webp');
  });
  test('vorhandene Bilder werden zugeordnet, fehlende nicht (und alte Werte fallen weg)', () => {
    const r = ordneBilderZu(rm, new Set(['aie-wissen-und-rag.webp']));
    expect(r.themen[0]?.bild).toBe('inhalt/bilder/aie-wissen-und-rag.webp');
    expect(r.themen[1]).not.toHaveProperty('bild');
    expect(rm.themen[0]).not.toHaveProperty('bild');
  });
  test('fehlendeBilder listet Themen ohne Datei', () => {
    expect(fehlendeBilder([rm], new Set(['aie-modelle.webp']))).toEqual(['aie: Wissen & RAG (aie-wissen-und-rag.webp)']);
    expect(fehlendeBilder([rm], new Set(['aie-modelle.webp', 'aie-wissen-und-rag.webp']))).toEqual([]);
  });
});
