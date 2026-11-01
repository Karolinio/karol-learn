import { describe, expect, test } from 'vitest';
import { erklaerAnfrageVon, erklaerSchritt, starteErklaeren, type ErklaerEreignis, type ErklaerZustand } from './erklaer-ablauf';
import { bewertungBeispiel } from './erklaer-test-daten';

const KARTE = { id: 'aie-token', track: 'aie' as const, kernpunkte: ['Ein Token ist ein Stück Text.', 'Modelle rechnen in Tokens ab.', 'Dritter Punkt hier.'] };
const TEXT = 'Ein Token ist ein Wortstück, danach wird abgerechnet.';
const ablauf = (z: ErklaerZustand, ...e: ErklaerEreignis[]) => e.reduce(erklaerSchritt, z);
const start = () => starteErklaeren(KARTE);
const geschrieben = () => ablauf(start(), { typ: 'WAEHLE', id: 'gf' }, { typ: 'TEXT', text: TEXT });
const imErgebnis = () => ablauf(geschrieben(), { typ: 'ABSENDEN', online: true }, { typ: 'ERGEBNIS', bewertung: bewertungBeispiel });

describe('starteErklaeren', () => {
  test('beginnt bei der Zielperson, leer, Runde 1', () => {
    expect(start()).toMatchObject({ phase: 'zielperson', text: '', runde: 1, haken: [] });
  });
});

describe('erklaerSchritt: Weg mit Coach', () => {
  test('WAEHLE → schreiben; TEXT bleibt im Zustand', () => {
    const z = geschrieben();
    expect(z.phase).toBe('schreiben');
    expect(z.zielperson).toBe('gf');
    expect(z.text).toBe(TEXT);
  });
  test('ABSENDEN online → wartet, ERGEBNIS → ergebnis mit Urteil', () => {
    const w = erklaerSchritt(geschrieben(), { typ: 'ABSENDEN', online: true });
    expect(w.phase).toBe('wartet');
    const e = erklaerSchritt(w, { typ: 'ERGEBNIS', bewertung: bewertungBeispiel });
    expect(e.phase).toBe('ergebnis');
    expect(e.urteil).toEqual({ punkte: 10, stufe: 'kundenreif' });
    expect(e.bewertung?.nachfrage).toBe(bewertungBeispiel.nachfrage);
  });
  test('ERGEBNIS verwirft Kernpunkt-Indizes außerhalb der Karte und doppelte', () => {
    const z = ablauf(geschrieben(), { typ: 'ABSENDEN', online: true }, { typ: 'ERGEBNIS', bewertung: { ...bewertungBeispiel, fehlendeKernpunkte: [2, 7, 2, 0] } });
    expect(z.bewertung?.fehlendeKernpunkte).toEqual([2, 0]);
  });
  test('Nachfrage beantworten → Runde 2 mit Frage und erstem Text, dann Ergebnis ohne Nachfrage', () => {
    const r2 = erklaerSchritt(imErgebnis(), { typ: 'NACHFRAGE_BEANTWORTEN' });
    expect(r2).toMatchObject({ phase: 'schreiben', runde: 2, text: '', nachfrage: bewertungBeispiel.nachfrage, ersterText: TEXT });
    const antwort = 'Sie zahlen pro Wortstück, kurze Fragen sind also billiger.';
    const mitText = ablauf(r2, { typ: 'TEXT', text: antwort });
    expect(erklaerAnfrageVon(mitText)).toEqual({ karteId: 'aie-token', zielperson: 'gf', text: antwort, nachfrage: { frage: bewertungBeispiel.nachfrage, ersterText: TEXT } });
    const e2 = ablauf(mitText, { typ: 'ABSENDEN', online: true }, { typ: 'ERGEBNIS', bewertung: bewertungBeispiel });
    expect(e2.runde).toBe(2);
    expect(e2.bewertung?.nachfrage).toBe('');
    expect(erklaerSchritt(e2, { typ: 'NACHFRAGE_BEANTWORTEN' })).toBe(e2);
    const f = erklaerSchritt(e2, { typ: 'FERTIG', datum: '2026-10-30' });
    expect(f.phase).toBe('fertig');
    expect(f.ergebnis).toEqual({ karteId: 'aie-token', track: 'aie', zielperson: 'gf', datum: '2026-10-30', modus: 'coach', punkte: 10, max: 12, stufe: 'kundenreif', runden: 2, text: TEXT });
  });
  test('FERTIG direkt nach Runde 1', () => {
    const f = erklaerSchritt(imErgebnis(), { typ: 'FERTIG', datum: '2026-10-30' });
    expect(f.ergebnis).toMatchObject({ runden: 1, modus: 'coach', text: TEXT });
  });
  test('ohne Nachfrage gibt es keine Runde 2', () => {
    const z = ablauf(geschrieben(), { typ: 'ABSENDEN', online: true }, { typ: 'ERGEBNIS', bewertung: { ...bewertungBeispiel, nachfrage: '' } });
    expect(erklaerSchritt(z, { typ: 'NACHFRAGE_BEANTWORTEN' })).toBe(z);
  });
  test('ABBRECHEN beim Warten → zurück zum Schreiben, Text bleibt', () => {
    const z = ablauf(geschrieben(), { typ: 'ABSENDEN', online: true }, { typ: 'ABBRECHEN' });
    expect(z).toMatchObject({ phase: 'schreiben', text: TEXT });
  });
  test('Zielperson wechseln behält den Text', () => {
    const z = erklaerSchritt(geschrieben(), { typ: 'ZIELPERSON_WECHSELN' });
    expect(z).toMatchObject({ phase: 'zielperson', text: TEXT });
  });
});

describe('erklaerSchritt: Fehler und Selbstcheck', () => {
  const imFehler = () => ablauf(geschrieben(), { typ: 'ABSENDEN', online: true }, { typ: 'FEHLER', art: 'zeit', meldung: 'Zu langsam' });
  test('FEHLER → fehler mit Art und Meldung', () => {
    expect(imFehler()).toMatchObject({ phase: 'fehler', fehler: { art: 'zeit', meldung: 'Zu langsam' } });
  });
  test('ERNEUT nur aus fehler → wartet', () => {
    expect(erklaerSchritt(imFehler(), { typ: 'ERNEUT' }).phase).toBe('wartet');
  });
  test('SELBST_PRUEFEN → selbst, Text bleibt', () => {
    expect(erklaerSchritt(imFehler(), { typ: 'SELBST_PRUEFEN' })).toMatchObject({ phase: 'selbst', text: TEXT });
  });
  test('offline: ABSENDEN → selbst, Haken toggeln, SELBST_FERTIG zählt Haken', () => {
    const s = erklaerSchritt(geschrieben(), { typ: 'ABSENDEN', online: false });
    expect(s.phase).toBe('selbst');
    const h = ablauf(s, { typ: 'HAKEN', i: 0 }, { typ: 'HAKEN', i: 2 }, { typ: 'HAKEN', i: 1 }, { typ: 'HAKEN', i: 1 }, { typ: 'HAKEN', i: 9 });
    expect(h.haken).toEqual([0, 2]);
    const f = erklaerSchritt(h, { typ: 'SELBST_FERTIG', datum: '2026-10-30' });
    expect(f.ergebnis).toEqual({ karteId: 'aie-token', track: 'aie', zielperson: 'gf', datum: '2026-10-30', modus: 'selbst', punkte: 2, max: 3, stufe: 'fast', runden: 1, text: TEXT });
  });
  test('Selbstcheck-Stufen: alle Haken kundenreif', () => {
    const s = erklaerSchritt(geschrieben(), { typ: 'ABSENDEN', online: false });
    const alle = ablauf(s, { typ: 'HAKEN', i: 0 }, { typ: 'HAKEN', i: 1 }, { typ: 'HAKEN', i: 2 }, { typ: 'SELBST_FERTIG', datum: '2026-10-30' });
    expect(alle.ergebnis?.stufe).toBe('kundenreif');
  });
});

describe('erklaerSchritt: Grenzen', () => {
  test('Text unter 20 Zeichen: ABSENDEN ändert nichts', () => {
    const z = ablauf(start(), { typ: 'WAEHLE', id: 'gf' }, { typ: 'TEXT', text: '   zu kurz           ' });
    expect(erklaerSchritt(z, { typ: 'ABSENDEN', online: true })).toBe(z);
  });
  test('Text wird auf 1200 Zeichen gekappt', () => {
    expect(ablauf(start(), { typ: 'WAEHLE', id: 'gf' }, { typ: 'TEXT', text: 'x'.repeat(1300) }).text).toHaveLength(1200);
  });
  test('NEU setzt aus jeder Phase zurück', () => {
    expect(erklaerSchritt(imErgebnis(), { typ: 'NEU' })).toEqual(start());
  });
  test('unpassende Ereignisse ändern nichts', () => {
    const s = start();
    for (const e of [{ typ: 'ABSENDEN', online: true }, { typ: 'TEXT', text: 'x' }, { typ: 'ERGEBNIS', bewertung: bewertungBeispiel }, { typ: 'FERTIG', datum: '2026-10-30' }, { typ: 'HAKEN', i: 0 }, { typ: 'ERNEUT' }, { typ: 'ZIELPERSON_WECHSELN' }] as const) {
      expect(erklaerSchritt(s, e)).toBe(s);
    }
    const g = geschrieben();
    for (const e of [{ typ: 'WAEHLE', id: 'it' }, { typ: 'ERGEBNIS', bewertung: bewertungBeispiel }, { typ: 'FEHLER', art: 'zeit', meldung: 'x' }, { typ: 'ABBRECHEN' }, { typ: 'SELBST_FERTIG', datum: '2026-10-30' }, { typ: 'SELBST_PRUEFEN' }] as const) {
      expect(erklaerSchritt(g, e)).toBe(g);
    }
    const w = erklaerSchritt(g, { typ: 'ABSENDEN', online: true });
    expect(erklaerSchritt(w, { typ: 'TEXT', text: 'anders' })).toBe(w);
    expect(erklaerSchritt(w, { typ: 'FERTIG', datum: '2026-10-30' })).toBe(w);
    const e = imErgebnis();
    expect(erklaerSchritt(e, { typ: 'ERGEBNIS', bewertung: bewertungBeispiel })).toBe(e);
    const r2 = erklaerSchritt(e, { typ: 'NACHFRAGE_BEANTWORTEN' });
    expect(erklaerSchritt(r2, { typ: 'ZIELPERSON_WECHSELN' })).toBe(r2);
  });
  test('erklaerAnfrageVon ohne Zielperson gibt undefined', () => {
    expect(erklaerAnfrageVon(start())).toBeUndefined();
    expect(erklaerAnfrageVon(geschrieben())).toEqual({ karteId: 'aie-token', zielperson: 'gf', text: TEXT });
  });
});
