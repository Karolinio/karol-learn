import { describe, expect, test } from 'vitest';
import { bereiteBewertungVor, kuerzeText, ZIEL_LAENGE } from './erklaer-vorbereitung';
import { erklaerBewertungSchema } from './erklaer-typen';
import { bewertungBeispiel } from './erklaer-test-daten';

describe('kuerzeText', () => {
  test('kurze Texte bleiben, lange enden an einer Wortgrenze mit …', () => {
    expect(kuerzeText('kurz', 10)).toBe('kurz');
    expect(kuerzeText('eins zwei drei vier', 12)).toBe('eins zwei…');
    expect(kuerzeText('eins zwei drei vier', 12).length).toBeLessThanOrEqual(12);
  });
  test('ohne Leerzeichen wird hart geschnitten, Satzzeichen am Ende fallen weg', () => {
    expect(kuerzeText('x'.repeat(30), 10)).toBe(`${'x'.repeat(9)}…`);
    expect(kuerzeText('eins, zwei drei', 11)).toBe('eins, zwei…');
    expect(kuerzeText('eins, zweiundzwanzig', 12)).toBe('eins…');
  });
});

/** Rohe Modellantwort: Kernpunkte 1-basiert, Texte evtl. zu lang. */
const roh = (extra: Record<string, unknown> = {}) => ({ ...bewertungBeispiel, fehlendeKernpunkte: [2], ...extra });

describe('bereiteBewertungVor', () => {
  test('kürzt alle Textfelder auf die Zielwerte, danach besteht zod', () => {
    const lang = (n: number) => 'wort '.repeat(n);
    const k = bewertungBeispiel.kriterien;
    const v = bereiteBewertungVor(roh({
      urteil: lang(80), besserSatz: lang(120), nachfrage: lang(80),
      kriterien: { ...k, kuerze: { punkte: 2, satz: lang(90) } },
      falscheAussagen: [{ zitat: lang(90), korrektur: lang(90) }],
    }), 3) as typeof bewertungBeispiel;
    expect(v.urteil.length).toBeLessThanOrEqual(ZIEL_LAENGE.urteil);
    expect(v.urteil.endsWith('…')).toBe(true);
    expect(v.besserSatz.length).toBeLessThanOrEqual(ZIEL_LAENGE.besserSatz);
    expect(v.nachfrage.length).toBeLessThanOrEqual(ZIEL_LAENGE.nachfrage);
    expect(v.kriterien.kuerze.satz.length).toBeLessThanOrEqual(ZIEL_LAENGE.satz);
    expect(v.kriterien.richtigkeit).toEqual(k.richtigkeit);
    expect(v.falscheAussagen[0]!.zitat.length).toBeLessThanOrEqual(ZIEL_LAENGE.zitat);
    expect(v.falscheAussagen[0]!.korrektur.length).toBeLessThanOrEqual(ZIEL_LAENGE.korrektur);
    expect(erklaerBewertungSchema.safeParse(v).success).toBe(true);
  });
  test('Kernpunkt-Nummern: 1-basiert → 0-basiert, außerhalb verworfen, doppelte einmal', () => {
    expect((bereiteBewertungVor(roh({ fehlendeKernpunkte: [1, 3, 0, 4, 3, 2.5] }), 3) as { fehlendeKernpunkte: number[] }).fehlendeKernpunkte).toEqual([0, 2]);
  });
  test('verändert die Eingabe nicht, Unbekanntes geht unverändert an zod', () => {
    const r = Object.freeze(roh());
    bereiteBewertungVor(r, 3);
    expect(r.fehlendeKernpunkte).toEqual([2]);
    expect(bereiteBewertungVor('kein objekt', 3)).toBe('kein objekt');
    expect(bereiteBewertungVor(null, 3)).toBeNull();
    const kaputt = bereiteBewertungVor({ urteil: 5, kriterien: 'x', falscheAussagen: 'y', fehlendeKernpunkte: 'z' }, 3);
    expect(kaputt).toEqual({ urteil: 5, kriterien: 'x', falscheAussagen: 'y', fehlendeKernpunkte: 'z' });
    expect(erklaerBewertungSchema.safeParse(kaputt).success).toBe(false);
  });
});
