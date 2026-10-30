import { describe, expect, test } from 'vitest';
import { grundlaufSchema, harnessReglerSchema, laborErgebnisSchema, szenarioSchema } from './labor-typen';
import { reglerBasis, skriptBasis, szenarioBasis } from './labor-test-daten';

describe('szenarioSchema', () => {
  test('akzeptiert ein gültiges Szenario', () => {
    expect(szenarioSchema.safeParse(szenarioBasis).success).toBe(true);
  });
  test('id braucht Track-Präfix und „-labor-“', () => {
    expect(szenarioSchema.safeParse({ ...szenarioBasis, id: 'aie-test' }).success).toBe(false);
    expect(szenarioSchema.safeParse({ ...szenarioBasis, id: 'fde-labor-test' }).success).toBe(false);
    expect(szenarioSchema.safeParse({ ...szenarioBasis, track: 'fde', id: 'fde-labor-test' }).success).toBe(true);
  });
  test('genau drei Ursachen und drei Reparaturen', () => {
    expect(szenarioSchema.safeParse({ ...szenarioBasis, ursachen: szenarioBasis.ursachen.slice(0, 2) }).success).toBe(false);
    expect(szenarioSchema.safeParse({ ...szenarioBasis, reparaturen: [...szenarioBasis.reparaturen, szenarioBasis.reparaturen[0]] }).success).toBe(false);
  });
  test('lehnt leere Texte, negative Tokens und fremde Metrik ab', () => {
    expect(szenarioSchema.safeParse({ ...szenarioBasis, symptom: '' }).success).toBe(false);
    const kaputt = { ...szenarioBasis, skript: { ...skriptBasis, system: { text: 'x', tokens: -1 } } };
    expect(szenarioSchema.safeParse(kaputt).success).toBe(false);
    expect(szenarioSchema.safeParse({ ...szenarioBasis, beweis: { metrik: 'gefuehl', erwartet: 1 } }).success).toBe(false);
  });
});

describe('Obergrenzen gegen aufgeblähte Eingaben', () => {
  test('freie Texte höchstens 20.000 Zeichen', () => {
    const lang = { ...szenarioBasis, skript: { ...skriptBasis, user: { text: 'x'.repeat(20_001), tokens: 1 } } };
    expect(szenarioSchema.safeParse(lang).success).toBe(false);
    const ok = { ...szenarioBasis, skript: { ...skriptBasis, user: { text: 'x'.repeat(20_000), tokens: 1 } } };
    expect(szenarioSchema.safeParse(ok).success).toBe(true);
  });
  test('Ergebnis: versuche höchstens 99, szenarioId wie eine Szenario-id', () => {
    const e = { szenarioId: 'aie-labor-test', track: 'aie', geloest: true, versuche: 99, datum: '2026-10-29' };
    expect(laborErgebnisSchema.safeParse(e).success).toBe(true);
    expect(laborErgebnisSchema.safeParse({ ...e, versuche: 100 }).success).toBe(false);
    expect(laborErgebnisSchema.safeParse({ ...e, szenarioId: '../etc' }).success).toBe(false);
    expect(laborErgebnisSchema.safeParse({ ...e, szenarioId: 'aie-test' }).success).toBe(false);
  });
  test('Reparatur kann als wirkungslos markiert sein', () => {
    expect(szenarioSchema.safeParse(szenarioBasis).success).toBe(true);
    expect(szenarioBasis.reparaturen[2].wirkungslos).toBe(true);
  });
});

describe('harnessReglerSchema', () => {
  test('toolAnzahl 1–12, Kompaktierung 0–1', () => {
    expect(harnessReglerSchema.safeParse(reglerBasis).success).toBe(true);
    expect(harnessReglerSchema.safeParse({ ...reglerBasis, toolAnzahl: 0 }).success).toBe(false);
    expect(harnessReglerSchema.safeParse({ ...reglerBasis, toolAnzahl: 13 }).success).toBe(false);
    expect(harnessReglerSchema.safeParse({ ...reglerBasis, kompaktierungAb: 1.2 }).success).toBe(false);
    expect(harnessReglerSchema.safeParse({ ...reglerBasis, maxRunden: 0 }).success).toBe(false);
  });
});

describe('laborErgebnisSchema und grundlaufSchema', () => {
  test('Ergebnis braucht Datum im Format JJJJ-MM-TT', () => {
    const e = { szenarioId: 'aie-labor-test', track: 'aie', geloest: true, versuche: 1, datum: '2026-10-29' };
    expect(laborErgebnisSchema.safeParse(e).success).toBe(true);
    expect(laborErgebnisSchema.safeParse({ ...e, datum: 'gestern' }).success).toBe(false);
  });
  test('Grundlauf hat Skript und Regler', () => {
    const g = { id: 'aie-grundlauf', track: 'aie', themen: ['Harness'], titel: 'Grundlauf', skript: skriptBasis, regler: reglerBasis };
    expect(grundlaufSchema.safeParse(g).success).toBe(true);
    expect(grundlaufSchema.safeParse({ ...g, skript: undefined }).success).toBe(false);
  });
});
