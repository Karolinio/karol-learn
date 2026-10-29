import { describe, expect, test } from 'vitest';
import { fortschritt, MAX_NEUE, sessionGroesse, waehleSession } from './auswahl';
import type { Karte, Lernstand } from './typen';

const HEUTE = '2026-10-27';
const k = (id: string, thema: string, stufe: 1 | 2 | 3, track: 'aie' | 'fde' = 'aie'): Karte => ({
  id: `${track}-${id}`, track, thema, stufe, frage: id, antwort: id, quelle: 't',
});
const st = (id: string, box: number, faellig: string): Lernstand => ({ id, box, faellig, richtig: 0, falsch: 0, serie: 0 });

describe('waehleSession', () => {
  const karten = [
    k('a', 'Kosten', 2), k('b', 'Modelle', 1), k('c', 'Kosten', 1), k('d', 'Modelle', 3),
    k('e', 'Modelle', 2), k('f', 'Kosten', 3), k('g', 'Modelle', 1), k('x', 'Rolle', 1, 'fde'),
  ];
  test('nimmt zuerst fällige Karten nach Fälligkeit, nicht fällige nicht', () => {
    const staende = {
      'aie-a': st('aie-a', 2, '2026-10-25'),
      'aie-d': st('aie-d', 3, '2026-10-20'),
      'aie-e': st('aie-e', 4, '2026-11-01'),
    };
    const s = waehleSession(karten, staende, 'aie', 10, HEUTE);
    expect(s.slice(0, 2)).toEqual(['aie-d', 'aie-a']);
    expect(s).not.toContain('aie-e');
  });
  test('neue Karten nach Stufe, dann Roadmap-Reihenfolge, höchstens maxNeue', () => {
    const s = waehleSession(karten, {}, 'aie', 10, HEUTE, ['Modelle', 'Kosten'], 5);
    expect(s).toEqual(['aie-b', 'aie-g', 'aie-c', 'aie-e', 'aie-a']);
  });
  test('erste Session hat ohne Lernstand zehn neue Karten', () => {
    const viele = Array.from({ length: 30 }, (_, i) => k(`n${i}`, 'Modelle', 1));
    expect(MAX_NEUE).toBe(10);
    expect(waehleSession(viele, {}, 'aie', sessionGroesse(), HEUTE)).toHaveLength(10);
  });
  test('Limit neuer Karten ist wählbar: 5, 10, 20', () => {
    const viele = Array.from({ length: 30 }, (_, i) => k(`n${i}`, 'Modelle', 1));
    expect(waehleSession(viele, {}, 'aie', sessionGroesse(5), HEUTE, [], 5)).toHaveLength(5);
    expect(waehleSession(viele, {}, 'aie', sessionGroesse(20), HEUTE, [], 20)).toHaveLength(20);
    expect(sessionGroesse(5)).toBe(10);
    expect(sessionGroesse(20)).toBe(20);
  });
  test('fällige Karten verdrängen neue, das Limit bleibt Obergrenze', () => {
    const viele = Array.from({ length: 30 }, (_, i) => k(`n${i}`, 'Modelle', 1));
    const staende = Object.fromEntries(['n0', 'n1', 'n2', 'n3'].map((x) => [`aie-${x}`, st(`aie-${x}`, 1, HEUTE)]));
    const s = waehleSession(viele, staende, 'aie', 10, HEUTE, [], 10);
    expect(s).toHaveLength(10);
    expect(s.slice(0, 4).sort()).toEqual(['aie-n0', 'aie-n1', 'aie-n2', 'aie-n3']);
  });
  test('Themen ohne Roadmap-Platz kommen hinten', () => {
    const s = waehleSession(karten, {}, 'aie', 10, HEUTE, ['Kosten']);
    expect(s[0]).toBe('aie-c');
  });
  test('trennt die Tracks streng', () => {
    const s = waehleSession(karten, {}, 'fde', 10, HEUTE);
    expect(s).toEqual(['fde-x']);
  });
  test('begrenzt auf n Karten und füllt mit neuen auf', () => {
    const staende = Object.fromEntries(['a', 'b', 'c'].map((x) => [`aie-${x}`, st(`aie-${x}`, 1, HEUTE)]));
    const s = waehleSession(karten, staende, 'aie', 4, HEUTE);
    expect(s).toHaveLength(4);
    expect(s.slice(0, 3).sort()).toEqual(['aie-a', 'aie-b', 'aie-c']);
  });
  test('Box 0 zählt als neu', () => {
    const s = waehleSession([k('a', 'Kosten', 1)], { 'aie-a': st('aie-a', 0, '2026-01-01') }, 'aie', 10, HEUTE);
    expect(s).toEqual(['aie-a']);
  });
});

describe('fortschritt', () => {
  test('zählt kann, lerne, offen gesamt und je Thema', () => {
    const karten = [k('a', 'Kosten', 1), k('b', 'Kosten', 1), k('c', 'Modelle', 1)];
    const f = fortschritt(karten, { 'aie-a': st('aie-a', 5, HEUTE), 'aie-c': st('aie-c', 2, HEUTE) });
    expect(f).toMatchObject({ gesamt: 3, kann: 1, lerne: 1, offen: 1 });
    expect(f.anteil).toBeCloseTo(1 / 3);
    expect(f.jeThema).toEqual([
      { thema: 'Kosten', gesamt: 2, kann: 1, lerne: 0, offen: 1 },
      { thema: 'Modelle', gesamt: 1, kann: 0, lerne: 1, offen: 0 },
    ]);
  });
  test('leerer Bestand hat Anteil 0', () => {
    expect(fortschritt([], {}).anteil).toBe(0);
  });
});
