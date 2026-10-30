import { describe, expect, test } from 'vitest';
import { addiereKosten, KEINE_KOSTEN, rundenKosten } from './labor-kosten';

describe('rundenKosten', () => {
  test('ohne Caching zählt alles als normaler Input (von Hand: 12.000 × 3 $ + 500 × 15 $ je Mio.)', () => {
    const k = rundenKosten({ praefix: 10_000, neu: 2_000, output: 500 }, false);
    expect(k).toMatchObject({ input: 12_000, cacheLesen: 0, cacheSchreiben: 0, output: 500 });
    expect(k.usd).toBeCloseTo(0.036 + 0.0075, 10);
  });
  test('mit Caching: Präfix × 0,1, Neues × 1,25 (von Hand: 0,003 + 0,0075 + 0,0075)', () => {
    const k = rundenKosten({ praefix: 10_000, neu: 2_000, output: 500 }, true);
    expect(k).toMatchObject({ input: 0, cacheLesen: 10_000, cacheSchreiben: 2_000, output: 500 });
    expect(k.usd).toBeCloseTo(0.018, 10);
  });
  test('erste Runde mit Caching schreibt nur, ist also etwas teurer als ohne', () => {
    const mit = rundenKosten({ praefix: 0, neu: 4_000, output: 100 }, true);
    const ohne = rundenKosten({ praefix: 0, neu: 4_000, output: 100 }, false);
    expect(mit.usd).toBeGreaterThan(ohne.usd);
  });
});

describe('addiereKosten', () => {
  test('summiert feldweise und verändert keine Eingabe', () => {
    const a = Object.freeze(rundenKosten({ praefix: 0, neu: 1_000, output: 10 }, false));
    const b = Object.freeze(rundenKosten({ praefix: 500, neu: 500, output: 10 }, true));
    const s = addiereKosten(addiereKosten(KEINE_KOSTEN, a), b);
    expect(s).toMatchObject({ input: 1_000, cacheLesen: 500, cacheSchreiben: 500, output: 20 });
    expect(s.usd).toBeCloseTo(a.usd + b.usd, 12);
    expect(KEINE_KOSTEN.usd).toBe(0);
  });
});
