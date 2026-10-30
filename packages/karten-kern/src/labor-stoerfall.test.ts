import { describe, expect, test } from 'vitest';
import { erfuelltBeweis, laufMitFix, merkeLaborErgebnis, starteStoerfall, stoerfallSchritt, type StoerfallEreignis, type StoerfallZustand } from './labor-stoerfall';
import { szenarioBasis } from './labor-test-daten';
import type { SimLauf } from './labor-typen';

const ablauf = (z: StoerfallZustand, ...e: StoerfallEreignis[]) => e.reduce(stoerfallSchritt, z);
const start = () => starteStoerfall(szenarioBasis);

describe('starteStoerfall', () => {
  test('beginnt im Symptom mit dem kaputten Lauf', () => {
    const z = start();
    expect(z.phase).toBe('symptom');
    expect(z.versuche).toBe(1);
    expect(z.kaputt.ende).toBe('not_aus');
  });
});

describe('stoerfallSchritt', () => {
  test('symptom → ABGESPIELT → ursache', () => {
    expect(ablauf(start(), { typ: 'ABGESPIELT' }).phase).toBe('ursache');
  });
  test('falsche Ursache: Hinweis mit warum, Versuch +1, Phase bleibt; doppelt zählt nicht', () => {
    const z = ablauf(start(), { typ: 'ABGESPIELT' }, { typ: 'WAEHLE_URSACHE', id: 'u2' });
    expect(z.phase).toBe('ursache');
    expect(z.versuche).toBe(2);
    expect(z.rueckmeldung).toEqual({ wahlId: 'u2', richtig: false, warum: 'Das Fenster ist nicht voll.' });
    expect(z.ausgeschlossen).toEqual(['u2']);
    expect(stoerfallSchritt(z, { typ: 'WAEHLE_URSACHE', id: 'u2' })).toBe(z);
  });
  test('richtige Ursache → reparatur mit Bestätigung', () => {
    const z = ablauf(start(), { typ: 'ABGESPIELT' }, { typ: 'WAEHLE_URSACHE', id: 'u1' });
    expect(z.phase).toBe('reparatur');
    expect(z.rueckmeldung?.richtig).toBe(true);
    expect(z.ausgeschlossen).toEqual([]);
  });
  test('falsche Reparatur wird simuliert, Symptom bleibt, Phase bleibt', () => {
    const z = ablauf(start(), { typ: 'ABGESPIELT' }, { typ: 'WAEHLE_URSACHE', id: 'u1' }, { typ: 'WAEHLE_REPARATUR', id: 'r2' });
    expect(z.phase).toBe('reparatur');
    expect(z.versuche).toBe(2);
    expect(z.falscherLauf?.ende).toBe('not_aus');
    expect(z.rueckmeldung).toMatchObject({ wahlId: 'r2', richtig: false });
  });
  test('richtige Reparatur → vergleich mit beiden Läufen, WEITER → fertig mit Ergebnis', () => {
    const v = ablauf(start(), { typ: 'ABGESPIELT' }, { typ: 'WAEHLE_URSACHE', id: 'u3' }, { typ: 'WAEHLE_URSACHE', id: 'u1' }, { typ: 'WAEHLE_REPARATUR', id: 'r1' });
    expect(v.phase).toBe('vergleich');
    expect(v.repariert?.ende).toBe('wiederholung');
    expect(v.falscherLauf).toBeUndefined();
    const f = stoerfallSchritt(v, { typ: 'WEITER', datum: '2026-10-29' });
    expect(f.phase).toBe('fertig');
    expect(f.ergebnis).toEqual({ szenarioId: 'aie-labor-test', track: 'aie', geloest: true, versuche: 2, datum: '2026-10-29' });
  });
  test('NEU setzt aus jeder Phase zurück', () => {
    const z = ablauf(start(), { typ: 'ABGESPIELT' }, { typ: 'WAEHLE_URSACHE', id: 'u2' }, { typ: 'NEU' });
    expect(z).toEqual(start());
  });
  test('unpassende Ereignisse ändern nichts', () => {
    const s = start();
    expect(stoerfallSchritt(s, { typ: 'WAEHLE_URSACHE', id: 'u1' })).toBe(s);
    expect(stoerfallSchritt(s, { typ: 'WEITER', datum: '2026-10-29' })).toBe(s);
    const u = stoerfallSchritt(s, { typ: 'ABGESPIELT' });
    expect(stoerfallSchritt(u, { typ: 'ABGESPIELT' })).toBe(u);
    expect(stoerfallSchritt(u, { typ: 'WAEHLE_REPARATUR', id: 'r1' })).toBe(u);
    expect(stoerfallSchritt(u, { typ: 'WAEHLE_URSACHE', id: 'gibts-nicht' })).toBe(u);
    const r = stoerfallSchritt(u, { typ: 'WAEHLE_URSACHE', id: 'u1' });
    expect(stoerfallSchritt(r, { typ: 'WAEHLE_REPARATUR', id: 'gibts-nicht' })).toBe(r);
    expect(stoerfallSchritt(r, { typ: 'WAEHLE_URSACHE', id: 'u1' })).toBe(r);
  });
});

describe('laufMitFix und erfuelltBeweis', () => {
  test('Fix mischt Regler und ersetzt das Skript', () => {
    expect(laufMitFix(szenarioBasis, { regler: { maxRunden: 3 } }).schritte).toHaveLength(3);
    const kurz = { ...szenarioBasis.skript, schleife: undefined, runden: [{ denken: { text: 'fertig', tokens: 5 }, fertig: true }] };
    expect(laufMitFix(szenarioBasis, { skript: kurz }).ende).toBe('fertig');
  });
  const lauf = (teil: Partial<SimLauf>): SimLauf => ({ ...laufMitFix(szenarioBasis, { regler: { maxRunden: 2 } }), ...teil });
  test('jede Metrik', () => {
    const l = lauf({});
    const usd = l.schritte.at(-1)!.kumuliert.usd;
    expect(erfuelltBeweis(l, { metrik: 'ende', erwartet: 'max_runden' })).toBe(true);
    expect(erfuelltBeweis(l, { metrik: 'ende', erwartet: 'fertig' })).toBe(false);
    expect(erfuelltBeweis(l, { metrik: 'usd', erwartet: usd })).toBe(true);
    expect(erfuelltBeweis(l, { metrik: 'usd', erwartet: usd / 2 })).toBe(false);
    expect(erfuelltBeweis(l, { metrik: 'kontextMax', erwartet: 1 })).toBe(false);
    expect(erfuelltBeweis(l, { metrik: 'kontextMax', erwartet: 1_000_000 })).toBe(true);
    expect(erfuelltBeweis(lauf({ injektionAusgefuehrt: false }), { metrik: 'injektion', erwartet: false })).toBe(true);
    expect(erfuelltBeweis(lauf({ fehlerSichtbar: false }), { metrik: 'fehlerSichtbar', erwartet: true })).toBe(false);
    expect(erfuelltBeweis(l, { metrik: 'tool', erwartet: 'suche_bestellung' })).toBe(true);
    expect(erfuelltBeweis(l, { metrik: 'tool', erwartet: 'sende_mail' })).toBe(false);
    expect(erfuelltBeweis(lauf({ schritte: [] }), { metrik: 'usd', erwartet: 0 })).toBe(true);
  });
});

describe('merkeLaborErgebnis', () => {
  const e = (versuche: number, datum: string, geloest = true) => ({ szenarioId: 'aie-labor-test', track: 'aie' as const, geloest, versuche, datum });
  test('neuer Fall wird angehängt, andere bleiben', () => {
    const anderer = { ...e(2, '2026-10-01'), szenarioId: 'aie-labor-anders' };
    expect(merkeLaborErgebnis([anderer], e(1, '2026-10-29'))).toEqual([anderer, e(1, '2026-10-29')]);
  });
  test('Wiederholen behält das beste Ergebnis: gelöst bleibt gelöst, kleinste Versuchszahl gewinnt', () => {
    const alt = Object.freeze([e(1, '2026-10-01')]);
    expect(merkeLaborErgebnis(alt, e(3, '2026-10-29'))).toEqual([e(1, '2026-10-01')]);
    expect(merkeLaborErgebnis(alt, e(1, '2026-10-29', false))).toEqual([e(1, '2026-10-01')]);
    expect(merkeLaborErgebnis([e(3, '2026-10-01')], e(2, '2026-10-29'))).toEqual([e(2, '2026-10-29')]);
    expect(merkeLaborErgebnis([e(3, '2026-10-01', false)], e(4, '2026-10-29'))).toEqual([e(4, '2026-10-29')]);
  });
});
