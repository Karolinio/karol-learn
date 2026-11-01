import { describe, expect, test } from 'vitest';
import { kartenMitEinemKernpunkt, kernpunkteVon, MAX_AUTO_KERNPUNKTE } from './erklaer-kernpunkte';
import { erklaerKarte } from './erklaer-test-daten';

describe('kernpunkteVon', () => {
  test('nimmt gepflegte Kernpunkte unverändert', () => {
    const k = erklaerKarte('aie-a', { kernpunkte: ['Erstens.', 'Zweitens.'] });
    expect(kernpunkteVon(k)).toEqual(['Erstens.', 'Zweitens.']);
  });
  test('teilt die Antwort an Satzenden vor Großbuchstaben', () => {
    const k = erklaerKarte('aie-a', { antwort: 'Ein Token ist ein Stück Text. Modelle rechnen in Tokens ab! Wie viele passen hinein? Das sagt das Fenster.' });
    expect(kernpunkteVon(k)).toEqual(['Ein Token ist ein Stück Text.', 'Modelle rechnen in Tokens ab!', 'Wie viele passen hinein?', 'Das sagt das Fenster.']);
  });
  test('schützt Abkürzungen', () => {
    const k = erklaerKarte('aie-a', { antwort: 'Ein Werkzeug, z. B. Suche, bzw. Datenbank. Das Modell entscheidet, d. h. es wählt u. a. das Tool. Es kostet etwa. Viel Geld am Ende.' });
    expect(kernpunkteVon(k)).toEqual([
      'Ein Werkzeug, z. B. Suche, bzw. Datenbank.',
      'Das Modell entscheidet, d. h. es wählt u. a. das Tool.',
      'Es kostet etwa. Viel Geld am Ende.',
    ]);
  });
  test('Abkürzungen nur als eigenes Wort: „Replica.“ beendet den Satz, „ca.“ nicht', () => {
    const k = erklaerKarte('aie-a', { antwort: 'Die Daten liegen in einer Replica. Das kostet ca. Zehn Euro im Monat.' });
    expect(kernpunkteVon(k)).toEqual(['Die Daten liegen in einer Replica.', 'Das kostet ca. Zehn Euro im Monat.']);
  });
  test('kein Split ohne Großbuchstaben oder Leerzeichen danach (Zahlen, Versionen)', () => {
    const k = erklaerKarte('aie-a', { antwort: 'Version 3.5 ist neuer als 3. das ist klein geschrieben und bleibt zusammen.' });
    expect(kernpunkteVon(k)).toEqual(['Version 3.5 ist neuer als 3. das ist klein geschrieben und bleibt zusammen.']);
  });
  test('verwirft zu kurze Teile und nimmt höchstens vier', () => {
    const k = erklaerKarte('aie-a', { antwort: 'Ja. Erster langer Satz hier. Zweiter langer Satz hier. Dritter langer Satz hier. Vierter langer Satz hier. Fünfter langer Satz hier.' });
    const p = kernpunkteVon(k);
    expect(p).toHaveLength(MAX_AUTO_KERNPUNKTE);
    expect(p[0]).toBe('Erster langer Satz hier.');
  });
  test('kurze Antwort bleibt ein Kernpunkt', () => {
    expect(kernpunkteVon(erklaerKarte('aie-a', { antwort: 'Ein Textstück.' }))).toEqual(['Ein Textstück.']);
  });
});

describe('kartenMitEinemKernpunkt', () => {
  test('meldet nur Karten mit genau einem Kernpunkt', () => {
    const karten = [
      erklaerKarte('aie-kurz', { antwort: 'Ein einziger Satz.' }),
      erklaerKarte('aie-lang'),
      erklaerKarte('aie-gepflegt', { antwort: 'x', kernpunkte: ['a', 'b'] }),
    ];
    expect(kartenMitEinemKernpunkt(karten)).toEqual(['aie-kurz']);
  });
});
