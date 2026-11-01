import {
  MAX_ERKLAER_PUNKTE, MAX_ERKLAER_TEXT, MIN_ERKLAER_TEXT,
  type AgentFehlerart, type ErklaerAnfrage, type ErklaerBewertung, type ErklaerErgebnis, type ErklaerStufe, type ZielpersonId,
} from './erklaer-typen';
import { gesamtUrteil, SCHWELLE_FAST, SCHWELLE_KUNDENREIF } from './erklaer-wertung';
import type { Track } from './typen';

export type ErklaerPhase = 'zielperson' | 'schreiben' | 'wartet' | 'ergebnis' | 'selbst' | 'fehler' | 'fertig';

export interface ErklaerKarte { id: string; track: Track; kernpunkte: readonly string[] }

export interface ErklaerZustand {
  karte: ErklaerKarte;
  phase: ErklaerPhase;
  zielperson?: ZielpersonId;
  /** Was Karol gerade schreibt; in Runde 2 die Antwort auf die Nachfrage. */
  text: string;
  runde: 1 | 2;
  /** Runde 2: die Frage der Zielperson und Karols erste Erklärung. */
  nachfrage?: string;
  ersterText?: string;
  bewertung?: ErklaerBewertung;
  urteil?: { punkte: number; stufe: ErklaerStufe };
  /** Selbstcheck: abgehakte Kernpunkte (Indizes). */
  haken: readonly number[];
  fehler?: { art: AgentFehlerart | 'netz'; meldung: string };
  ergebnis?: ErklaerErgebnis;
}

export type ErklaerEreignis =
  | { typ: 'WAEHLE'; id: ZielpersonId }
  | { typ: 'ZIELPERSON_WECHSELN' }
  | { typ: 'TEXT'; text: string }
  | { typ: 'ABSENDEN'; online: boolean }
  | { typ: 'ERGEBNIS'; bewertung: ErklaerBewertung }
  | { typ: 'FEHLER'; art: AgentFehlerart | 'netz'; meldung: string }
  | { typ: 'ABBRECHEN' }
  | { typ: 'ERNEUT' }
  | { typ: 'SELBST_PRUEFEN' }
  | { typ: 'NACHFRAGE_BEANTWORTEN' }
  | { typ: 'HAKEN'; i: number }
  | { typ: 'SELBST_FERTIG'; datum: string }
  | { typ: 'FERTIG'; datum: string }
  | { typ: 'NEU' };

export function starteErklaeren(karte: ErklaerKarte): ErklaerZustand {
  return { karte, phase: 'zielperson', text: '', runde: 1, haken: [] };
}

/** Selbstcheck: Anteil der Haken, auf dieselben Schwellen wie beim Coach umgerechnet. */
export function stufeAusAnteil(punkte: number, max: number): ErklaerStufe {
  const skaliert = max ? (punkte / max) * MAX_ERKLAER_PUNKTE : 0;
  return skaliert >= SCHWELLE_KUNDENREIF ? 'kundenreif' : skaliert >= SCHWELLE_FAST ? 'fast' : 'nochmal';
}

/** Kernpunkt-Indizes außerhalb der Karte und Doppelte fallen weg; in Runde 2 gibt es keine Nachfrage mehr. */
function bereinige(b: ErklaerBewertung, z: ErklaerZustand): ErklaerBewertung {
  const indizes = [...new Set(b.fehlendeKernpunkte)].filter((i) => i < z.karte.kernpunkte.length);
  return { ...b, fehlendeKernpunkte: indizes, nachfrage: z.runde === 2 ? '' : b.nachfrage };
}

function ergebnisVon(z: ErklaerZustand, modus: 'coach' | 'selbst', datum: string, punkte: number, max: number, stufe: ErklaerStufe): ErklaerErgebnis {
  return {
    karteId: z.karte.id, track: z.karte.track, zielperson: z.zielperson ?? 'gf', datum, modus,
    punkte, max, stufe, runden: z.runde, text: (z.ersterText ?? z.text).trim(),
  };
}

function absenden(z: ErklaerZustand, online: boolean): ErklaerZustand {
  if (z.text.trim().length < MIN_ERKLAER_TEXT) return z;
  return online ? { ...z, phase: 'wartet', fehler: undefined } : { ...z, phase: 'selbst', haken: [] };
}

function nachfrageBeantworten(z: ErklaerZustand): ErklaerZustand {
  if (z.runde !== 1 || !z.bewertung?.nachfrage) return z;
  return { ...z, phase: 'schreiben', runde: 2, nachfrage: z.bewertung.nachfrage, ersterText: z.text, text: '' };
}

function haken(z: ErklaerZustand, i: number): ErklaerZustand {
  if (i < 0 || i >= z.karte.kernpunkte.length) return z;
  return { ...z, haken: z.haken.includes(i) ? z.haken.filter((x) => x !== i) : [...z.haken, i].sort((a, b) => a - b) };
}

function selbstFertig(z: ErklaerZustand, datum: string): ErklaerZustand {
  const max = z.karte.kernpunkte.length;
  const punkte = z.haken.length;
  return { ...z, phase: 'fertig', ergebnis: ergebnisVon(z, 'selbst', datum, punkte, max, stufeAusAnteil(punkte, max)) };
}

function coachFertig(z: ErklaerZustand, datum: string): ErklaerZustand {
  if (!z.urteil) return z;
  return { ...z, phase: 'fertig', ergebnis: ergebnisVon(z, 'coach', datum, z.urteil.punkte, MAX_ERKLAER_PUNKTE, z.urteil.stufe) };
}

type Uebergang = (z: ErklaerZustand, e: ErklaerEreignis) => ErklaerZustand | undefined;

const UEBERGAENGE: Readonly<Record<ErklaerPhase, Uebergang>> = {
  zielperson: (z, e) => (e.typ === 'WAEHLE' ? { ...z, phase: 'schreiben', zielperson: e.id } : undefined),
  schreiben: (z, e) => {
    if (e.typ === 'TEXT') return { ...z, text: e.text.slice(0, MAX_ERKLAER_TEXT) };
    if (e.typ === 'ABSENDEN') return absenden(z, e.online);
    if (e.typ === 'ZIELPERSON_WECHSELN' && z.runde === 1) return { ...z, phase: 'zielperson' };
    return undefined;
  },
  wartet: (z, e) => {
    if (e.typ === 'ERGEBNIS') {
      const bewertung = bereinige(e.bewertung, z);
      return { ...z, phase: 'ergebnis', bewertung, urteil: gesamtUrteil(bewertung) };
    }
    if (e.typ === 'FEHLER') return { ...z, phase: 'fehler', fehler: { art: e.art, meldung: e.meldung } };
    if (e.typ === 'ABBRECHEN') return { ...z, phase: 'schreiben' };
    return undefined;
  },
  ergebnis: (z, e) => {
    if (e.typ === 'NACHFRAGE_BEANTWORTEN') return nachfrageBeantworten(z);
    if (e.typ === 'FERTIG') return coachFertig(z, e.datum);
    return undefined;
  },
  fehler: (z, e) => {
    if (e.typ === 'ERNEUT') return { ...z, phase: 'wartet', fehler: undefined };
    if (e.typ === 'SELBST_PRUEFEN') return { ...z, phase: 'selbst', haken: [] };
    return undefined;
  },
  selbst: (z, e) => {
    if (e.typ === 'HAKEN') return haken(z, e.i);
    if (e.typ === 'SELBST_FERTIG') return selbstFertig(z, e.datum);
    return undefined;
  },
  fertig: () => undefined,
};

/** Zustandsmaschine des Erklär-Trainings. Pur; unpassende Ereignisse geben denselben Zustand zurück. */
export function erklaerSchritt(z: ErklaerZustand, e: ErklaerEreignis): ErklaerZustand {
  if (e.typ === 'NEU') return starteErklaeren(z.karte);
  return UEBERGAENGE[z.phase](z, e) ?? z;
}

/** Die Anfrage an den Server aus dem Zustand; ohne Zielperson gibt es keine. */
export function erklaerAnfrageVon(z: ErklaerZustand): ErklaerAnfrage | undefined {
  if (!z.zielperson) return undefined;
  const basis = { karteId: z.karte.id, zielperson: z.zielperson, text: z.text.trim() };
  return z.runde === 2 && z.nachfrage && z.ersterText
    ? { ...basis, nachfrage: { frage: z.nachfrage, ersterText: z.ersterText.trim() } }
    : basis;
}
