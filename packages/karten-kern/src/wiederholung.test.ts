import { describe, expect, test } from 'vitest';
import { ABSTAENDE, bewerte, neuerStand, plusTage, reiheNachFehler, stufeVon } from './wiederholung';

const HEUTE = '2026-10-27';

describe('bewerte', () => {
  test('gewusst hebt die Box um eins und setzt die Fälligkeit nach Abstand', () => {
    const s = bewerte(neuerStand('a'), true, HEUTE);
    expect(s.box).toBe(1);
    expect(s.faellig).toBe(HEUTE);
    const s2 = bewerte(s, true, HEUTE);
    expect(s2.box).toBe(2);
    expect(s2.faellig).toBe('2026-10-28');
    expect(bewerte({ ...s2, box: 3 }, true, HEUTE).faellig).toBe(plusTage(HEUTE, ABSTAENDE[4] ?? -1));
  });
  test('Box 5 ist die Obergrenze mit 21 Tagen', () => {
    const s = bewerte({ ...neuerStand('a'), box: 5 }, true, HEUTE);
    expect(s.box).toBe(5);
    expect(s.faellig).toBe('2026-11-17');
  });
  test('nicht gewusst setzt auf Box 1, fällig morgen, Serie auf 0', () => {
    const vorher = { ...neuerStand('a'), box: 4, serie: 3, richtig: 3 };
    const s = bewerte(vorher, false, HEUTE);
    expect(s).toMatchObject({ box: 1, faellig: '2026-10-28', serie: 0, falsch: 1, richtig: 3, zuletzt: HEUTE });
  });
  test('zählt richtig und Serie hoch und verändert das Original nicht', () => {
    const vorher = neuerStand('a');
    const s = bewerte(vorher, true, HEUTE);
    expect(s).toMatchObject({ richtig: 1, serie: 1 });
    expect(vorher.box).toBe(0);
    expect(s).not.toBe(vorher);
  });
  test('ohne bisherigen Stand wird mit id angelegt', () => {
    expect(bewerte(undefined, true, HEUTE, 'x').id).toBe('x');
    expect(() => bewerte(undefined, true, HEUTE)).toThrow();
  });
});

describe('plusTage', () => {
  test('überschreitet Monats- und Jahresgrenzen', () => {
    expect(plusTage('2026-12-31', 1)).toBe('2027-01-01');
    expect(plusTage('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('stufeVon', () => {
  test('Box-Grenzen: 0 offen, 1–3 lerne, ab 4 kann', () => {
    expect(stufeVon(undefined)).toBe('offen');
    expect(stufeVon({ ...neuerStand('a'), box: 0 })).toBe('offen');
    expect(stufeVon({ ...neuerStand('a'), box: 1 })).toBe('lerne');
    expect(stufeVon({ ...neuerStand('a'), box: 3 })).toBe('lerne');
    expect(stufeVon({ ...neuerStand('a'), box: 4 })).toBe('kann');
    expect(stufeVon({ ...neuerStand('a'), box: 5 })).toBe('kann');
  });
});

describe('reiheNachFehler', () => {
  test('fügt die Karte nach drei weiteren Karten wieder ein', () => {
    const r = reiheNachFehler(['a', 'b', 'c', 'd', 'e', 'f'], 0, {});
    expect(r.reihe).toEqual(['a', 'b', 'c', 'd', 'a', 'e', 'f']);
    expect(r.zaehler).toEqual({ a: 1 });
  });
  test('hängt ans Ende, wenn weniger als drei Karten folgen', () => {
    expect(reiheNachFehler(['a', 'b'], 0, {}).reihe).toEqual(['a', 'b', 'a']);
  });
  test('höchstens zweimal pro Session', () => {
    const r1 = reiheNachFehler(['a', 'b'], 0, {});
    const r2 = reiheNachFehler(r1.reihe, 2, r1.zaehler);
    expect(r2.zaehler.a).toBe(2);
    const r3 = reiheNachFehler(r2.reihe, 3, r2.zaehler);
    expect(r3.reihe).toBe(r2.reihe);
    expect(r3.zaehler.a).toBe(2);
  });
  test('wirft bei ungültigem Index', () => {
    expect(() => reiheNachFehler(['a'], 5, {})).toThrow();
  });
});
