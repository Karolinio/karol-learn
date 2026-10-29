import { describe, expect, test } from 'vitest';
import { pruefeBestand, pruefeKarte } from './validierung';
import type { Karte } from './typen';

const karte = (teil: Partial<Karte> = {}): Karte => ({
  id: 'aie-token', track: 'aie', thema: 'Modelle', stufe: 1,
  frage: 'Was ist ein Token?', antwort: 'Ein Textstück.', quelle: 'test', ...teil,
});

describe('pruefeKarte', () => {
  test('akzeptiert eine gültige Karte', () => {
    expect(pruefeKarte(karte()).ok).toBe(true);
  });
  test('lehnt Überlänge bei Frage und Antwort ab', () => {
    expect(pruefeKarte(karte({ frage: 'x'.repeat(161) })).ok).toBe(false);
    expect(pruefeKarte(karte({ antwort: 'x'.repeat(401) })).ok).toBe(false);
    expect(pruefeKarte(karte({ frage: 'x'.repeat(160), antwort: 'y'.repeat(400) })).ok).toBe(true);
  });
  test('lehnt leere Quelle und falsche Stufe ab', () => {
    expect(pruefeKarte(karte({ quelle: '' })).ok).toBe(false);
    expect(pruefeKarte({ ...karte(), stufe: 4 }).ok).toBe(false);
  });
  test('lehnt id ohne Track-Präfix ab', () => {
    const r = pruefeKarte(karte({ id: 'fde-token' }));
    expect(r.ok).toBe(false);
    expect(r.fehler.join(' ')).toContain('Präfix');
  });
});

describe('pruefeBestand', () => {
  const datei = (pfad: string, thema: string, karten: Karte[], track = 'aie') => ({ pfad, inhalt: { track, thema, karten } });

  test('ist grün für passende Dateien', () => {
    const r = pruefeBestand([datei('aie/modelle.json', 'Modelle', [karte()])]);
    expect(r).toEqual({ ok: true, fehler: [], anzahl: 1 });
  });
  test('findet doppelte ids über Dateien hinweg', () => {
    const r = pruefeBestand([
      datei('aie/modelle.json', 'Modelle', [karte()]),
      datei('aie/kosten.json', 'Kosten', [karte({ thema: 'Kosten' })]),
    ]);
    expect(r.ok).toBe(false);
    expect(r.fehler.some((f) => f.includes('doppelt'))).toBe(true);
  });
  test('findet falschen Track gegenüber dem Ordner', () => {
    const r = pruefeBestand([datei('fde/modelle.json', 'Modelle', [karte()], 'fde')]);
    expect(r.ok).toBe(false);
    expect(r.fehler.some((f) => f.includes('Track'))).toBe(true);
  });
  test('findet Datei-Track, der nicht zum Ordner passt', () => {
    const r = pruefeBestand([datei('fde/modelle.json', 'Modelle', [], 'aie')]);
    expect(r.ok).toBe(false);
  });
  test('findet falsches Thema und falschen Dateinamen', () => {
    const r1 = pruefeBestand([datei('aie/modelle.json', 'Modelle', [karte({ thema: 'Kosten' })])]);
    expect(r1.ok).toBe(false);
    const r2 = pruefeBestand([datei('aie/falsch.json', 'Modelle', [karte()])]);
    expect(r2.fehler.some((f) => f.includes('Dateiname'))).toBe(true);
  });
  test('meldet kaputte Dateistruktur', () => {
    const r = pruefeBestand([{ pfad: 'aie/x.json', inhalt: { karten: 'nein' } }]);
    expect(r.ok).toBe(false);
  });
});
