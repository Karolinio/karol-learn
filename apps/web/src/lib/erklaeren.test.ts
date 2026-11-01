import { describe, expect, test } from 'vitest';
import { bewerteErklaerung, ErklaerFehler } from './erklaeren';

const BEWERTUNG = {
  urteil: 'Gut.', falscheAussagen: [], fehlendeKernpunkte: [], besserSatz: 'So.', nachfrage: 'Und?',
  kriterien: { richtigkeit: { punkte: 3, satz: 'a' }, vollstaendigkeit: { punkte: 2, satz: 'b' }, verstaendlichkeit: { punkte: 3, satz: 'c' }, kuerze: { punkte: 2, satz: 'd' } },
};
const ANFRAGE = { karteId: 'aie-a', zielperson: 'gf' as const, text: 'Eine Erklärung mit genug Zeichen.' };
const antwort = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

async function fehlerVon(p: Promise<unknown>): Promise<ErklaerFehler> {
  try { await p; } catch (e) { return e as ErklaerFehler; }
  throw new Error('kein Fehler');
}

describe('bewerteErklaerung', () => {
  test('liefert die geprüfte Bewertung', async () => {
    const b = await bewerteErklaerung(ANFRAGE, undefined, antwort(200, { success: true, data: { bewertung: BEWERTUNG }, error: null }));
    expect(b.kriterien.richtigkeit.punkte).toBe(3);
  });
  test('schemafremde Antwort trotz 200 wird abgelehnt', async () => {
    const f = await fehlerVon(bewerteErklaerung(ANFRAGE, undefined, antwort(200, { success: true, data: { bewertung: { urteil: 'x' } }, error: null })));
    expect(f).toBeInstanceOf(ErklaerFehler);
    expect(f.art).toBe('ausgabe');
  });
  test('HTTP-Status wird zur Fehlerart, Meldung vom Server bleibt', async () => {
    const fall = async (status: number) => fehlerVon(bewerteErklaerung(ANFRAGE, undefined, antwort(status, { success: false, data: null, error: `Fehler ${status}` })));
    expect((await fall(504)).art).toBe('zeit');
    expect((await fall(503)).art).toBe('claude_fehlt');
    expect((await fall(502)).art).toBe('ausgabe');
    expect((await fall(429)).art).toBe('eingabe');
    expect((await fall(500)).art).toBe('claude_fehler');
    expect((await fall(504)).message).toBe('Fehler 504');
  });
  test('Netzfehler und Abbruch', async () => {
    const kaputt = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect((await fehlerVon(bewerteErklaerung(ANFRAGE, undefined, kaputt))).art).toBe('netz');
    const ab = new AbortController();
    ab.abort();
    const wartend = ((_u: string, init: RequestInit) => new Promise((_ok, nein) => {
      if (init.signal?.aborted) nein(new DOMException('abgebrochen', 'AbortError'));
    })) as unknown as typeof fetch;
    expect((await fehlerVon(bewerteErklaerung(ANFRAGE, ab.signal, wartend))).art).toBe('abgebrochen');
  });
});
