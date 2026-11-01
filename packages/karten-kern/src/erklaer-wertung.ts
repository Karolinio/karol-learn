import { KRITERIEN, type ErklaerBewertung, type ErklaerErgebnis, type ErklaerStufe } from './erklaer-typen';
import type { Karte, Lernstand, Track } from './typen';
import { plusTage } from './wiederholung';

export const SCHWELLE_KUNDENREIF = 10;
export const SCHWELLE_FAST = 7;
export const MAX_JE_KARTE = 10;
export const MAX_ERKLAER_ERGEBNISSE = 2000;
/** So lange ruht eine Karte nach dem Erklären, bevor sie wieder vorgeschlagen wird. */
export const ERKLAER_PAUSE_TAGE = 3;
/** Erst ab dieser Leitner-Box kennt Karol die Karte gut genug zum Erklären. */
export const ERKLAER_AB_BOX = 2;

/** Ab dieser Richtigkeit darf eine Erklärung kundenreif sein. */
export const MIN_RICHTIGKEIT_KUNDENREIF = 2;

/** Summe der vier Kriterien (im Code, nie vom Modell) und die Stufe. Eine falsche Aussage oder Richtigkeit ≤ 1 deckelt bei „fast“. */
export function gesamtUrteil(b: ErklaerBewertung): { punkte: number; stufe: ErklaerStufe } {
  const punkte = KRITERIEN.reduce((s, k) => s + b.kriterien[k].punkte, 0);
  const roh: ErklaerStufe = punkte >= SCHWELLE_KUNDENREIF ? 'kundenreif' : punkte >= SCHWELLE_FAST ? 'fast' : 'nochmal';
  const gedeckelt = b.falscheAussagen.length > 0 || b.kriterien.richtigkeit.punkte < MIN_RICHTIGKEIT_KUNDENREIF;
  return { punkte, stufe: roh === 'kundenreif' && gedeckelt ? 'fast' : roh };
}

/** Hängt ein Ergebnis an: je Karte die letzten zehn, insgesamt höchstens 2000 (älteste fallen weg). */
export function merkeErklaerErgebnis(liste: readonly ErklaerErgebnis[], e: ErklaerErgebnis): ErklaerErgebnis[] {
  const mit = [...liste, e];
  const jeKarte = mit.filter((x) => x.karteId === e.karteId);
  const zuViel = Math.max(0, jeKarte.length - MAX_JE_KARTE);
  const weg = new Set(jeKarte.slice(0, zuViel));
  return mit.filter((x) => !weg.has(x)).slice(-MAX_ERKLAER_ERGEBNISSE);
}

export function letztesErklaerErgebnis(liste: readonly ErklaerErgebnis[], karteId: string): ErklaerErgebnis | undefined {
  return [...liste].reverse().find((e) => e.karteId === karteId);
}

/** Geübt = verschiedene Karten mit Ergebnis; kundenreif = Karten, die einmal kundenreif waren. */
export function erklaerFortschritt(liste: readonly ErklaerErgebnis[], track: Track): { geuebt: number; kundenreif: number } {
  const eigene = liste.filter((e) => e.track === track);
  return {
    geuebt: new Set(eigene.map((e) => e.karteId)).size,
    kundenreif: new Set(eigene.filter((e) => e.stufe === 'kundenreif').map((e) => e.karteId)).size,
  };
}

/** Nächste Karte zum Erklären: gelernt (Box ≥ 2), ausgeruht, noch nicht kundenreif; schwächste zuerst, Stufe 2/3 vor 1. */
export function naechsteErklaerKarte(
  karten: readonly Karte[],
  staende: Readonly<Record<string, Lernstand | undefined>>,
  liste: readonly ErklaerErgebnis[],
  track: Track,
  heute: string,
): Karte | undefined {
  const grenze = plusTage(heute, -ERKLAER_PAUSE_TAGE);
  const kandidaten = karten.filter((k) => {
    if (k.track !== track || (staende[k.id]?.box ?? 0) < ERKLAER_AB_BOX) return false;
    const eigene = liste.filter((e) => e.karteId === k.id);
    if (eigene.some((e) => e.stufe === 'kundenreif')) return false;
    return !eigene.some((e) => e.datum > grenze);
  });
  const rang = (k: Karte) => { const l = letztesErklaerErgebnis(liste, k.id); return l ? l.punkte / l.max : 0; };
  const stufenRang = (k: Karte) => (k.stufe === 1 ? 1 : 0);
  return [...kandidaten].sort((a, b) => rang(a) - rang(b) || stufenRang(a) - stufenRang(b) || a.id.localeCompare(b.id))[0];
}
