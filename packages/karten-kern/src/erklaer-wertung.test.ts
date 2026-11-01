import { describe, expect, test } from 'vitest';
import {
  ERKLAER_PAUSE_TAGE, erklaerFortschritt, gesamtUrteil, letztesErklaerErgebnis, MAX_ERKLAER_ERGEBNISSE, MAX_JE_KARTE,
  merkeErklaerErgebnis, naechsteErklaerKarte,
} from './erklaer-wertung';
import { bewertungBeispiel, erklaerKarte } from './erklaer-test-daten';
import type { ErklaerBewertung, ErklaerErgebnis } from './erklaer-typen';
import type { Lernstand } from './typen';

const mitPunkten = (r: number, v: number, s: number, k: number, falsch = 0): ErklaerBewertung => ({
  ...bewertungBeispiel,
  kriterien: {
    richtigkeit: { punkte: r as 0, satz: 'a' }, vollstaendigkeit: { punkte: v as 0, satz: 'b' },
    verstaendlichkeit: { punkte: s as 0, satz: 'c' }, kuerze: { punkte: k as 0, satz: 'd' },
  },
  falscheAussagen: Array.from({ length: falsch }, () => ({ zitat: 'z', korrektur: 'k' })),
});

describe('gesamtUrteil', () => {
  test('Summe im Code, Schwellen 10 und 7', () => {
    expect(gesamtUrteil(mitPunkten(3, 3, 3, 3))).toEqual({ punkte: 12, stufe: 'kundenreif' });
    expect(gesamtUrteil(mitPunkten(3, 2, 3, 2))).toEqual({ punkte: 10, stufe: 'kundenreif' });
    expect(gesamtUrteil(mitPunkten(3, 2, 2, 2))).toEqual({ punkte: 9, stufe: 'fast' });
    expect(gesamtUrteil(mitPunkten(2, 2, 2, 1))).toEqual({ punkte: 7, stufe: 'fast' });
    expect(gesamtUrteil(mitPunkten(2, 2, 1, 1))).toEqual({ punkte: 6, stufe: 'nochmal' });
    expect(gesamtUrteil(mitPunkten(0, 0, 0, 0))).toEqual({ punkte: 0, stufe: 'nochmal' });
  });
  test('Richtigkeit 0 oder 1 deckelt bei „fast“, auch ohne falsche Aussage', () => {
    expect(gesamtUrteil(mitPunkten(1, 3, 3, 3))).toEqual({ punkte: 10, stufe: 'fast' });
    expect(gesamtUrteil(mitPunkten(2, 3, 3, 3))).toEqual({ punkte: 11, stufe: 'kundenreif' });
  });
  test('mit einer falschen Aussage höchstens „fast“', () => {
    expect(gesamtUrteil(mitPunkten(3, 3, 3, 3, 1))).toEqual({ punkte: 12, stufe: 'fast' });
    expect(gesamtUrteil(mitPunkten(1, 1, 1, 1, 1)).stufe).toBe('nochmal');
  });
});

const ergebnis = (karteId: string, datum: string, extra: Partial<ErklaerErgebnis> = {}): ErklaerErgebnis => ({
  karteId, track: 'aie', zielperson: 'gf', datum, modus: 'coach', punkte: 8, max: 12, stufe: 'fast', runden: 1, ...extra,
});

describe('merkeErklaerErgebnis', () => {
  test('hängt an und verändert die alte Liste nicht', () => {
    const alt = Object.freeze([ergebnis('aie-a', '2026-10-01')]);
    const neu = merkeErklaerErgebnis(alt, ergebnis('aie-b', '2026-10-02'));
    expect(neu.map((e) => e.karteId)).toEqual(['aie-a', 'aie-b']);
    expect(alt).toHaveLength(1);
  });
  test('behält je Karte die letzten zehn', () => {
    const liste = Array.from({ length: MAX_JE_KARTE }, (_, i) => ergebnis('aie-a', `2026-10-${String(i + 1).padStart(2, '0')}`));
    const neu = merkeErklaerErgebnis([ergebnis('aie-b', '2026-09-01'), ...liste], ergebnis('aie-a', '2026-10-30'));
    const a = neu.filter((e) => e.karteId === 'aie-a');
    expect(a).toHaveLength(MAX_JE_KARTE);
    expect(a[0]!.datum).toBe('2026-10-02');
    expect(a.at(-1)!.datum).toBe('2026-10-30');
    expect(neu[0]!.karteId).toBe('aie-b');
  });
  test('insgesamt höchstens 2000, die ältesten fallen weg', () => {
    const liste = Array.from({ length: MAX_ERKLAER_ERGEBNISSE }, (_, i) => ergebnis(`aie-k${i}`, '2026-10-01'));
    const neu = merkeErklaerErgebnis(liste, ergebnis('aie-neu', '2026-10-30'));
    expect(neu).toHaveLength(MAX_ERKLAER_ERGEBNISSE);
    expect(neu[0]!.karteId).toBe('aie-k1');
    expect(neu.at(-1)!.karteId).toBe('aie-neu');
  });
});

describe('erklaerFortschritt und letztesErklaerErgebnis', () => {
  const liste = [
    ergebnis('aie-a', '2026-10-01'), ergebnis('aie-a', '2026-10-02', { stufe: 'kundenreif', punkte: 11 }),
    ergebnis('aie-b', '2026-10-03'), ergebnis('fde-c', '2026-10-03', { track: 'fde', stufe: 'kundenreif' }),
  ];
  test('zählt verschiedene Karten je Track, kundenreif = je einmal kundenreif', () => {
    expect(erklaerFortschritt(liste, 'aie')).toEqual({ geuebt: 2, kundenreif: 1 });
    expect(erklaerFortschritt(liste, 'fde')).toEqual({ geuebt: 1, kundenreif: 1 });
    expect(erklaerFortschritt([], 'aie')).toEqual({ geuebt: 0, kundenreif: 0 });
  });
  test('letztes Ergebnis einer Karte', () => {
    expect(letztesErklaerErgebnis(liste, 'aie-a')?.datum).toBe('2026-10-02');
    expect(letztesErklaerErgebnis(liste, 'aie-x')).toBeUndefined();
  });
});

describe('naechsteErklaerKarte', () => {
  const stand = (id: string, box: number): Lernstand => ({ id, box, faellig: '2026-10-30', richtig: box, falsch: 0, serie: 0 });
  const heute = '2026-10-30';
  const karten = [
    erklaerKarte('aie-neu', { stufe: 1 }), erklaerKarte('aie-eins', { stufe: 1 }), erklaerKarte('aie-zwei', { stufe: 2 }),
    erklaerKarte('aie-schwach', { stufe: 1 }), erklaerKarte('aie-gestern', { stufe: 3 }), erklaerKarte('aie-reif', { stufe: 2 }),
    erklaerKarte('fde-x', { track: 'fde', stufe: 3 }),
  ];
  const staende = Object.fromEntries(['aie-eins', 'aie-zwei', 'aie-schwach', 'aie-gestern', 'aie-reif', 'fde-x'].map((id) => [id, stand(id, 2)]));
  const liste = [
    ergebnis('aie-schwach', '2026-10-20', { punkte: 2 }),
    ergebnis('aie-gestern', '2026-10-29', { punkte: 1 }),
    ergebnis('aie-reif', '2026-10-01', { stufe: 'kundenreif', punkte: 11 }),
    ergebnis('aie-zwei', '2026-10-10', { punkte: 9 }),
  ];
  test('nur Box ≥ 2, nicht kürzlich, nicht kundenreif; niedrigste letzte Punktzahl zuerst', () => {
    expect(naechsteErklaerKarte(karten, { ...staende, 'aie-neu': stand('aie-neu', 1) }, liste, 'aie', heute)?.id).toBe('aie-eins');
  });
  test('bei gleicher Punktzahl kommt Stufe 2/3 vor 1', () => {
    const ohneEins = { ...staende, 'aie-eins': stand('aie-eins', 0) };
    const gleich = [...liste.filter((e) => e.karteId !== 'aie-schwach'), ergebnis('aie-schwach', '2026-10-20', { punkte: 9 })];
    expect(naechsteErklaerKarte(karten, ohneEins, gleich, 'aie', heute)?.id).toBe('aie-zwei');
  });
  test('Pause: vor drei Tagen erklärt ist wieder dran, vorgestern nicht', () => {
    const nurGestern = { 'aie-gestern': stand('aie-gestern', 3) };
    expect(ERKLAER_PAUSE_TAGE).toBe(3);
    expect(naechsteErklaerKarte(karten, nurGestern, liste, 'aie', heute)).toBeUndefined();
    expect(naechsteErklaerKarte(karten, nurGestern, liste, 'aie', '2026-10-31')).toBeUndefined();
    expect(naechsteErklaerKarte(karten, nurGestern, liste, 'aie', '2026-11-01')?.id).toBe('aie-gestern');
  });
  test('nichts passend → undefined, anderer Track bleibt außen vor', () => {
    expect(naechsteErklaerKarte(karten, {}, [], 'aie', heute)).toBeUndefined();
    expect(naechsteErklaerKarte(karten, staende, liste, 'fde', heute)?.id).toBe('fde-x');
  });
});
