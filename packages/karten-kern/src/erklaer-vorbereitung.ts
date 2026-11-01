/**
 * Bereitet die rohe Antwort des Modells für die Prüfung vor. Pur, verändert nichts.
 * Das Modell hält Zeichenzahlen nicht zuverlässig ein: lieber kürzen als die ganze Bewertung verwerfen.
 */

/** Zielwerte, auf die der Agent kürzt. Die zod-Grenzen sind doppelt so groß. */
export const ZIEL_LAENGE = Object.freeze({ urteil: 160, satz: 200, zitat: 200, korrektur: 240, besserSatz: 300, nachfrage: 200 });

/** Kürzt an einer Wortgrenze und hängt „…“ an; das Ergebnis ist höchstens `max` Zeichen lang. */
export function kuerzeText(text: string, max: number): string {
  if (text.length <= max) return text;
  const schnitt = text.slice(0, max - 1);
  const anGrenze = /\s/.test(text.charAt(max - 1));
  const leer = schnitt.lastIndexOf(' ');
  const basis = anGrenze ? schnitt : leer > 0 ? schnitt.slice(0, leer) : schnitt;
  return `${basis.replace(/[\s,;:.\-–]+$/u, '')}…`;
}

type Roh = Record<string, unknown>;
const istObjekt = (x: unknown): x is Roh => typeof x === 'object' && x !== null && !Array.isArray(x);
const kurz = (x: unknown, max: number): unknown => (typeof x === 'string' ? kuerzeText(x.trim(), max) : x);

function kriterien(roh: unknown): unknown {
  if (!istObjekt(roh)) return roh;
  return Object.fromEntries(Object.entries(roh).map(([k, v]) => [k, istObjekt(v) ? { ...v, satz: kurz(v.satz, ZIEL_LAENGE.satz) } : v]));
}

function falscheAussagen(roh: unknown): unknown {
  if (!Array.isArray(roh)) return roh;
  return roh.map((f) => (istObjekt(f) ? { ...f, zitat: kurz(f.zitat, ZIEL_LAENGE.zitat), korrektur: kurz(f.korrektur, ZIEL_LAENGE.korrektur) } : f));
}

/** Das Modell nummeriert Kernpunkte wie im Auftrag ab 1; die App rechnet ab 0. Unpassende Nummern fallen weg. */
function kernpunktNummern(roh: unknown, anzahl: number): unknown {
  if (!Array.isArray(roh)) return roh;
  const gueltig = roh.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= anzahl);
  return [...new Set(gueltig)].map((n) => n - 1);
}

export function bereiteBewertungVor(roh: unknown, anzahlKernpunkte: number): unknown {
  if (!istObjekt(roh)) return roh;
  return {
    ...roh,
    urteil: kurz(roh.urteil, ZIEL_LAENGE.urteil),
    kriterien: kriterien(roh.kriterien),
    falscheAussagen: falscheAussagen(roh.falscheAussagen),
    fehlendeKernpunkte: kernpunktNummern(roh.fehlendeKernpunkte, anzahlKernpunkte),
    besserSatz: kurz(roh.besserSatz, ZIEL_LAENGE.besserSatz),
    nachfrage: kurz(roh.nachfrage, ZIEL_LAENGE.nachfrage),
  };
}
