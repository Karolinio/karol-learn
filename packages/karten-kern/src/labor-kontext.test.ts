import { describe, expect, test } from 'vitest';
import { gemeinsamerPraefix, KOMPAKT_TOKENS, kompaktiere, kuerze, tausender } from './labor-kontext';
import type { Nachricht } from './labor-typen';

const n = (id: string, tokens = 10): Nachricht => ({ id, rolle: 'assistant', text: id, tokens });

describe('labor-kontext', () => {
  test('tausender setzt Punkte wie im Deutschen', () => {
    expect(tausender(40000)).toBe('40.000');
    expect(tausender(1234567)).toBe('1.234.567');
    expect(tausender(999)).toBe('999');
  });
  test('kuerze lässt Kurzes in Ruhe und schneidet Langes auf das Maximum', () => {
    expect(kuerze('a', 10, undefined)).toEqual({ text: 'a', tokens: 10, gekuerzt: false });
    expect(kuerze('a', 10, 10).gekuerzt).toBe(false);
    expect(kuerze('a', 11, 10)).toMatchObject({ tokens: 10, gekuerzt: true });
  });
  test('gemeinsamerPraefix zählt bis zur ersten Abweichung', () => {
    expect(gemeinsamerPraefix([{ id: 'a', tokens: 5 }, { id: 'b', tokens: 7 }], [{ id: 'a', tokens: 5 }, { id: 'c', tokens: 7 }])).toBe(5);
    expect(gemeinsamerPraefix([], [{ id: 'a', tokens: 5 }])).toBe(0);
  });
  test('kompaktiere ersetzt ältere Runden durch eine Zusammenfassung, Runde 1 bleibt unberührt', () => {
    expect(kompaktiere([n('r1-denken')], 1)).toBeUndefined();
    const k = kompaktiere([n('r1-denken'), n('r1-ergebnis', 40_000), n('r2-denken')], 2)!;
    expect(k.map((x) => x.id)).toEqual(['kompakt-2', 'r2-denken']);
    expect(k[0]!.tokens).toBe(KOMPAKT_TOKENS);
  });
});
