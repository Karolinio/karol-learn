import 'fake-indexeddb/auto';
import { describe, expect, test } from 'vitest';
import { baueExport, oeffneSpeicher, pruefeImport } from './speicher';

class FakeStorage implements Storage {
  private d = new Map<string, string>();
  get length() { return this.d.size; }
  clear() { this.d.clear(); }
  getItem(k: string) { return this.d.get(k) ?? null; }
  key(i: number) { return [...this.d.keys()][i] ?? null; }
  removeItem(k: string) { this.d.delete(k); }
  setItem(k: string, v: string) { this.d.set(k, v); }
}

describe('oeffneSpeicher', () => {
  test('nimmt IndexedDB, wenn vorhanden, und hält Werte', async () => {
    const sp = await oeffneSpeicher({ indexedDB: globalThis.indexedDB });
    expect(sp.art).toBe('idb');
    await sp.schreibe('lernstand', { a: 1 });
    expect(await sp.lies('lernstand')).toEqual({ a: 1 });
    const neu = await oeffneSpeicher({ indexedDB: globalThis.indexedDB });
    expect(await neu.lies('lernstand')).toEqual({ a: 1 });
    await neu.loesche('lernstand');
    expect(await neu.lies('lernstand')).toBeUndefined();
  });
  test('fällt auf localStorage zurück', async () => {
    const ls = new FakeStorage();
    const sp = await oeffneSpeicher({ localStorage: ls });
    expect(sp.art).toBe('local');
    await sp.schreibe('x', [1, 2]);
    expect(ls.getItem('kl:x')).toBe('[1,2]');
    expect(await sp.lies('x')).toEqual([1, 2]);
    expect(await sp.lies('fehlt')).toBeUndefined();
    await sp.loesche('x');
    expect(ls.getItem('kl:x')).toBeNull();
  });
  test('fällt auf RAM zurück, wenn localStorage wirft', async () => {
    const kaputt = new FakeStorage();
    kaputt.setItem = () => { throw new Error('QuotaExceeded'); };
    const sp = await oeffneSpeicher({ localStorage: kaputt });
    expect(sp.art).toBe('ram');
    const wert = { a: { b: 1 } };
    await sp.schreibe('x', wert);
    wert.a.b = 2;
    expect(await sp.lies('x')).toEqual({ a: { b: 1 } });
    await sp.loesche('x');
    expect(await sp.lies('x')).toBeUndefined();
  });
  test('RAM ohne jede Ablage', async () => {
    expect((await oeffneSpeicher({})).art).toBe('ram');
  });
});

describe('Export und Import', () => {
  const daten = {
    lernstand: { 'aie-a': { id: 'aie-a', box: 2, faellig: '2026-10-28', richtig: 2, falsch: 0, serie: 2 } },
    sessions: [{ id: 's1', track: 'aie' as const, start: '2026-10-27T10:00:00Z', karten: ['aie-a'], antworten: [{ id: 'aie-a', gewusst: true, ms: 1200 }] }],
    einstellungen: { track: 'aie' as const, neueProSession: 10 as const },
  };
  test('Rundreise über JSON', () => {
    const exp = baueExport(daten, new Date('2026-10-27T12:00:00Z'));
    expect(exp.version).toBe(1);
    const r = pruefeImport(JSON.stringify(exp));
    expect(r.ok && r.daten.lernstand['aie-a']?.box).toBe(2);
  });
  test('alter Export ohne neueProSession wird mit 10 gelesen', () => {
    const alt = { ...baueExport(daten), einstellungen: { track: 'fde' } };
    const r = pruefeImport(JSON.stringify(alt));
    expect(r.ok && r.daten.einstellungen.neueProSession).toBe(10);
  });
  test('lehnt kaputtes JSON und falsches Schema ab', () => {
    expect(pruefeImport('{')).toEqual({ ok: false, fehler: 'Die Datei ist kein JSON.' });
    const falsch = { ...baueExport(daten), lernstand: { x: { box: 9 } } };
    expect(pruefeImport(JSON.stringify(falsch)).ok).toBe(false);
  });
});

describe('Einstellungen: neue Karten pro Session', () => {
  test('Standard ist 10, wählbar 5 und 20, Unsinn fällt auf 10', async () => {
    const { einstellungenSchema } = await import('./speicher');
    expect(einstellungenSchema.parse({}).neueProSession).toBe(10);
    expect(einstellungenSchema.parse({ neueProSession: 5 }).neueProSession).toBe(5);
    expect(einstellungenSchema.parse({ neueProSession: 20 }).neueProSession).toBe(20);
    expect(einstellungenSchema.parse({ neueProSession: 7 }).neueProSession).toBe(10);
  });
});
