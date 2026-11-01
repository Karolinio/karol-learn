import type { Karte } from './typen';

export const MAX_AUTO_KERNPUNKTE = 4;
const MIN_TEIL = 12;
/** Punkte in diesen Wendungen beenden keinen Satz. */
const ABKUERZUNGEN = ['z. B.', 'bzw.', 'd. h.', 'u. a.', 'etwa.', 'z. T.', 'ca.', 'etc.', 'vgl.', 'Nr.'] as const;
const PLATZHALTER = '\u0000';

const MUSTER = ABKUERZUNGEN.map((a) => ({
  // Nur als eigenes Wort: kein Buchstabe davor („Replica.“ ist keine Abkürzung).
  re: new RegExp(`(?<!\\p{L})${a.replace(/[.]/g, '\\.')}`, 'gu'),
  ersatz: a.replace(/\./g, PLATZHALTER),
}));
const schuetze = (text: string) => MUSTER.reduce((t, m) => t.replace(m.re, m.ersatz), text);
const stelleHer = (text: string) => text.split(PLATZHALTER).join('.');

/** Kernaussagen einer Karte: gepflegte Kernpunkte oder die Sätze der Antwort (höchstens vier). */
export function kernpunkteVon(karte: Pick<Karte, 'antwort' | 'kernpunkte'>): string[] {
  if (karte.kernpunkte?.length) return [...karte.kernpunkte];
  const saetze = schuetze(karte.antwort.trim())
    .split(/(?<=[.?!])\s+(?=[A-ZÄÖÜ])/)
    .map((s) => stelleHer(s).trim())
    .filter((s) => s.length >= MIN_TEIL)
    .slice(0, MAX_AUTO_KERNPUNKTE);
  return saetze.length ? saetze : [karte.antwort.trim()];
}

/** Für `pruefen`: Karten, deren Antwort nur einen Kernpunkt ergibt (Info, kein Fehler). */
export function kartenMitEinemKernpunkt(karten: readonly Karte[]): string[] {
  return karten.filter((k) => kernpunkteVon(k).length === 1).map((k) => k.id);
}
