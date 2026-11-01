import { describe, expect, test } from 'vitest';
import {
  agentAntwortSchema, coachEingabeSchema, erklaerAnfrageSchema, erklaerBewertungSchema, erklaerErgebnisSchema,
  MAX_ERKLAER_TEXT, MIN_ERKLAER_TEXT, zielperson, zielpersonenFuer, ZIELPERSONEN,
} from './erklaer-typen';
import { karteSchema } from './typen';
import { bewertungBeispiel } from './erklaer-test-daten';

describe('Zielpersonen', () => {
  test('Reihenfolge je Track, Standard ist die erste', () => {
    expect(zielpersonenFuer('aie').map((z) => z.id)).toEqual(['gf', 'it', 'dev']);
    expect(zielpersonenFuer('fde').map((z) => z.id)).toEqual(['it', 'ciso', 'dsb', 'dev', 'gf']);
  });
  test('ciso ist die Informationssicherheit einer Bank, nur fde, Fachniveau mittel', () => {
    const c = zielperson('ciso');
    expect(c).toMatchObject({ titel: 'Informationssicherheit einer Bank', fachniveau: 'mittel', tracks: ['fde'] });
    expect(c.sorgt).toContain('DORA');
  });
  test('tracks passen zur Reihenfolge, jede Person hat Titel und Sorge', () => {
    for (const z of ZIELPERSONEN) {
      expect(z.titel.length).toBeGreaterThan(3);
      expect(z.sorgt.length).toBeGreaterThan(3);
      for (const t of z.tracks) expect(zielpersonenFuer(t)).toContain(z);
    }
    expect(zielperson('dsb').tracks).toEqual(['fde']);
  });
});

describe('erklaerAnfrageSchema', () => {
  const gut = { karteId: 'aie-token', zielperson: 'gf', text: 'Ein Token ist ein Stück Text, etwa ein Wortteil.' };
  test('gültige Anfrage, Text wird getrimmt', () => {
    expect(erklaerAnfrageSchema.parse({ ...gut, text: `  ${gut.text}  ` }).text).toBe(gut.text);
  });
  test('Grenzen: 20 bis 1200 Zeichen', () => {
    expect(erklaerAnfrageSchema.safeParse({ ...gut, text: 'x'.repeat(MIN_ERKLAER_TEXT - 1) }).success).toBe(false);
    expect(erklaerAnfrageSchema.safeParse({ ...gut, text: 'x'.repeat(MIN_ERKLAER_TEXT) }).success).toBe(true);
    expect(erklaerAnfrageSchema.safeParse({ ...gut, text: 'x'.repeat(MAX_ERKLAER_TEXT) }).success).toBe(true);
    expect(erklaerAnfrageSchema.safeParse({ ...gut, text: 'x'.repeat(MAX_ERKLAER_TEXT + 1) }).success).toBe(false);
  });
  test('Karten-id nur als Slug, Zielperson bekannt, Nachfrage begrenzt', () => {
    expect(erklaerAnfrageSchema.safeParse({ ...gut, karteId: '../x' }).success).toBe(false);
    expect(erklaerAnfrageSchema.safeParse({ ...gut, zielperson: 'chef' }).success).toBe(false);
    expect(erklaerAnfrageSchema.safeParse({ ...gut, nachfrage: { frage: 'Was kostet das?', ersterText: gut.text } }).success).toBe(true);
    expect(erklaerAnfrageSchema.safeParse({ ...gut, nachfrage: { frage: 'x'.repeat(401), ersterText: gut.text } }).success).toBe(false);
    expect(erklaerAnfrageSchema.safeParse({ ...gut, nachfrage: { frage: 'ok?', ersterText: 'x'.repeat(1201) } }).success).toBe(false);
  });
});

describe('erklaerBewertungSchema', () => {
  test('Beispiel ist gültig', () => {
    expect(erklaerBewertungSchema.parse(bewertungBeispiel)).toEqual(bewertungBeispiel);
  });
  test('Punkte nur 0–3, höchstens 3 falsche Aussagen, Längen begrenzt', () => {
    const k = bewertungBeispiel.kriterien;
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, kriterien: { ...k, kuerze: { punkte: 4, satz: 'x' } } }).success).toBe(false);
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, kriterien: { ...k, kuerze: { punkte: 1.5, satz: 'x' } } }).success).toBe(false);
    const f = { zitat: 'a', korrektur: 'b' };
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, falscheAussagen: [f, f, f, f] }).success).toBe(false);
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, urteil: 'x'.repeat(321) }).success).toBe(false);
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, besserSatz: 'x'.repeat(601) }).success).toBe(false);
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, fehlendeKernpunkte: [-1] }).success).toBe(false);
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, nachfrage: '' }).success).toBe(true);
    // Prüfgrenzen sind doppelt so groß wie die Zielwerte: der Agent kürzt vorher, die CLI soll nicht wiederholen.
    expect(erklaerBewertungSchema.safeParse({ ...bewertungBeispiel, urteil: 'x'.repeat(320), besserSatz: 'x'.repeat(600) }).success).toBe(true);
  });
});

describe('erklaerErgebnisSchema', () => {
  const e = { karteId: 'aie-token', track: 'aie', zielperson: 'gf', datum: '2026-10-30', modus: 'coach', punkte: 9, max: 12, stufe: 'fast', runden: 2 };
  test('gültig mit und ohne Text', () => {
    expect(erklaerErgebnisSchema.safeParse(e).success).toBe(true);
    expect(erklaerErgebnisSchema.safeParse({ ...e, text: 'Meine Erklärung.' }).success).toBe(true);
  });
  test('ungültige Werte', () => {
    expect(erklaerErgebnisSchema.safeParse({ ...e, punkte: 13 }).success).toBe(false);
    expect(erklaerErgebnisSchema.safeParse({ ...e, runden: 3 }).success).toBe(false);
    expect(erklaerErgebnisSchema.safeParse({ ...e, datum: '30.10.2026' }).success).toBe(false);
    expect(erklaerErgebnisSchema.safeParse({ ...e, text: 'x'.repeat(1201) }).success).toBe(false);
    expect(erklaerErgebnisSchema.safeParse({ ...e, modus: 'raten' }).success).toBe(false);
  });
});

describe('coachEingabeSchema und agentAntwortSchema', () => {
  const eingabe = {
    karte: { id: 'aie-token', track: 'aie', frage: 'Was ist ein Token?', antwort: 'Ein Textstück.', kernpunkte: ['Ein Textstück.'] },
    zielperson: zielperson('gf'), text: 'Ein Token ist ein Stück Text.',
  };
  test('Eingabe des Agenten', () => {
    expect(coachEingabeSchema.safeParse(eingabe).success).toBe(true);
    expect(coachEingabeSchema.safeParse({ ...eingabe, karte: { ...eingabe.karte, kernpunkte: [] } }).success).toBe(false);
    expect(coachEingabeSchema.safeParse({ ...eingabe, text: 'kurz' }).success).toBe(false);
  });
  test('Antwort des Agenten: ok mit Bewertung oder Fehler mit Art', () => {
    expect(agentAntwortSchema.safeParse({ ok: true, bewertung: bewertungBeispiel }).success).toBe(true);
    expect(agentAntwortSchema.safeParse({ ok: false, art: 'zeit', meldung: 'zu langsam' }).success).toBe(true);
    expect(agentAntwortSchema.safeParse({ ok: false, art: 'unbekannt', meldung: 'x' }).success).toBe(false);
    expect(agentAntwortSchema.safeParse({ ok: true, bewertung: { urteil: 'x' } }).success).toBe(false);
  });
});

describe('kernpunkte an der Karte', () => {
  const k = { id: 'aie-a', track: 'aie', thema: 'T', stufe: 1, frage: 'F?', antwort: 'A.', quelle: 'q' };
  test('optional, 2–5 Punkte, je höchstens 140 Zeichen', () => {
    expect(karteSchema.safeParse(k).success).toBe(true);
    expect(karteSchema.safeParse({ ...k, kernpunkte: ['eins', 'zwei'] }).success).toBe(true);
    expect(karteSchema.safeParse({ ...k, kernpunkte: ['nur einer'] }).success).toBe(false);
    expect(karteSchema.safeParse({ ...k, kernpunkte: ['a', 'b', 'c', 'd', 'e', 'f'] }).success).toBe(false);
    expect(karteSchema.safeParse({ ...k, kernpunkte: ['a', 'x'.repeat(141)] }).success).toBe(false);
  });
});
