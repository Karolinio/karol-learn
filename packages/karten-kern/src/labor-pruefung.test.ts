import { describe, expect, test } from 'vitest';
import { pruefeLabor, pruefeSzenario } from './labor-pruefung';
import { szenarioBasis } from './labor-test-daten';
import type { Szenario } from './labor-typen';
import type { Track } from './typen';

const karten = new Map<string, { track: Track }>([['aie-endlosschleife', { track: 'aie' }], ['fde-log', { track: 'fde' }]]);
const mit = (teil: Partial<Szenario>): Szenario => ({ ...szenarioBasis, ...teil });
const [u1, u2, u3] = szenarioBasis.ursachen;
const [r1, r2, r3] = szenarioBasis.reparaturen;

describe('pruefeSzenario', () => {
  test('ein stimmiges Szenario ist grün', () => {
    expect(pruefeSzenario(szenarioBasis, karten)).toEqual([]);
  });
  test('kaputtes Schema wird gemeldet, ohne weiter zu simulieren', () => {
    const f = pruefeSzenario({ ...szenarioBasis, ursachen: [u1] }, karten);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/aie-labor-test: Schema/);
  });
  test('fehlende Karte und Karte aus fremdem Track', () => {
    expect(pruefeSzenario(mit({ karten: ['aie-gibts-nicht'] }), karten)[0]).toMatch(/Karte aie-gibts-nicht fehlt/);
    expect(pruefeSzenario(mit({ karten: ['fde-log'] }), karten)[0]).toMatch(/Track fde/);
  });
  test('genau eine richtige Wahl je Liste, ids eindeutig', () => {
    expect(pruefeSzenario(mit({ ursachen: [u1, { ...u2, richtig: true }, u3] }), karten)[0]).toMatch(/Ursachen: 2 richtige/);
    expect(pruefeSzenario(mit({ reparaturen: [{ ...r1, richtig: false }, r2, r3] }), karten).join(' ')).toMatch(/Reparaturen: 0 richtige/);
    expect(pruefeSzenario(mit({ ursachen: [u1, { ...u2, id: 'u1' }, u3] }), karten)[0]).toMatch(/doppelt/);
  });
  test('wirkungslose richtige Reparatur fällt auf', () => {
    const f = pruefeSzenario(mit({ reparaturen: [{ ...r1, regler: { kontextLimit: 300_000 } }, r2, r3] }), karten);
    expect(f).toEqual(['aie-labor-test: richtige Reparatur r1 erfüllt den Beweis nicht (ende = not_aus)']);
  });
  test('falsche Reparatur, die doch wirkt, fällt auf', () => {
    const f = pruefeSzenario(mit({ reparaturen: [r1, { ...r2, regler: { gleicheBitteMax: 1 } }, r3] }), karten);
    expect(f).toEqual(['aie-labor-test: falsche Reparatur r2 erfüllt den Beweis trotzdem']);
  });
  test('Fix ohne Regler und Skript muss als wirkungslos markiert sein, und umgekehrt', () => {
    expect(pruefeSzenario(mit({ reparaturen: [r1, r2, { ...r3, wirkungslos: undefined }] }), karten))
      .toEqual(['aie-labor-test: Reparatur r3 ändert nichts, braucht wirkungslos: true']);
    expect(pruefeSzenario(mit({ reparaturen: [r1, { ...r2, wirkungslos: true }, r3] }), karten))
      .toEqual(['aie-labor-test: Reparatur r2 ist als wirkungslos markiert, ändert aber Regler oder Skript']);
    expect(pruefeSzenario(mit({ reparaturen: [{ ...r1, regler: undefined, wirkungslos: true }, r2, r3] }), karten).join(' '))
      .toMatch(/richtige Reparatur r1 darf nicht wirkungslos sein/);
  });
  test('ein Szenario braucht mindestens eine Karte', () => {
    expect(pruefeSzenario(mit({ karten: [] }), karten)).toEqual(['aie-labor-test: braucht mindestens eine Karte']);
  });
  test('kaputter Lauf darf den Beweis nicht schon erfüllen', () => {
    const f = pruefeSzenario(mit({ regler: { ...szenarioBasis.regler, gleicheBitteMax: 3 } }), karten);
    expect(f[0]).toMatch(/kaputter Lauf erfüllt den Beweis schon/);
  });
});

describe('pruefeLabor', () => {
  test('findet doppelte Szenario-ids und sammelt Fehler', () => {
    const f = pruefeLabor([szenarioBasis, szenarioBasis, mit({ id: 'aie-labor-zwei', karten: ['x'] })], karten);
    expect(f).toEqual(['aie-labor-test: id doppelt', 'aie-labor-zwei: Karte x fehlt']);
  });
});
