import { describe, expect, test } from 'vitest';
import { baueSuchindex, suche } from './suche';
import type { Karte } from './typen';

const k = (i: number, track: 'aie' | 'fde' = 'aie'): Karte => ({
  id: `${track}-k${i}`, track, thema: i % 2 ? 'Kosten' : 'Modelle', stufe: 1,
  frage: `Frage Nummer ${i} über Tokens`, antwort: i === 3 ? 'Prompt Caching spart Geld' : 'nichts', quelle: 'q',
});

describe('suche', () => {
  const karten = Array.from({ length: 600 }, (_, i) => k(i, i % 3 ? 'aie' : 'fde'));
  const index = baueSuchindex(karten);
  test('findet in Antworten ohne Rücksicht auf Groß/Klein und Umlaute', () => {
    expect(suche(index, 'caching').map((x) => x.id)).toEqual(['fde-k3']);
  });
  test('filtert nach Track und Thema', () => {
    const r = suche(index, '', { track: 'fde', thema: 'Modelle' });
    expect(r.every((x) => x.track === 'fde' && x.thema === 'Modelle')).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
  test('mehrere Wörter müssen alle vorkommen', () => {
    expect(suche(index, 'nummer 3 tokens').map((x) => x.id)).toContain('fde-k3');
    expect(suche(index, 'nummer zzz')).toEqual([]);
  });
  test('ist unter 50 ms bei 600 Karten', () => {
    const t = performance.now();
    for (let i = 0; i < 10; i++) suche(index, 'frage tokens');
    expect((performance.now() - t) / 10).toBeLessThan(50);
  });
});
