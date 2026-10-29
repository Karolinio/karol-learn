import { jaccard, woerter } from './dubletten';
import { slug } from './slug';
import type { Karte, ThemenDatei } from './typen';

/** Für den Rohbestand: nur wirklich gleiche Fragen gelten als Dublette. */
export const SCHWELLE_BESTAND = 0.9;

const THEMEN_ERSATZ: Readonly<Record<string, string>> = { Modell: 'Modelle', Werkzeuge: 'Runtime' };

export function normalisiereThema(thema: string): string {
  const t = thema.trim();
  return THEMEN_ERSATZ[t] ?? t;
}

export interface Verworfen { id: string; frage: string; grund: 'doppelte id' | 'fast gleiche Frage'; behalten: string }
export interface Aufteilung { dateien: { pfad: string; inhalt: ThemenDatei }[]; verworfen: Verworfen[] }

/** Normalisiert Themen, entfernt Dubletten (erste gewinnt) und gruppiert nach Track/Thema. */
export function teileAuf(roh: readonly Karte[]): Aufteilung {
  const behalten: { k: Karte; w: Set<string> }[] = [];
  const verworfen: Verworfen[] = [];
  for (const original of roh) {
    const k = { ...original, thema: normalisiereThema(original.thema) };
    const w = woerter(k.frage);
    const gleicheId = behalten.find((b) => b.k.id === k.id);
    const aehnlich = gleicheId ?? behalten.find((b) => b.k.track === k.track && jaccard(w, b.w) >= SCHWELLE_BESTAND);
    if (aehnlich) {
      verworfen.push({ id: k.id, frage: k.frage, grund: gleicheId ? 'doppelte id' : 'fast gleiche Frage', behalten: aehnlich.k.id });
      continue;
    }
    behalten.push({ k, w });
  }
  const gruppen = new Map<string, ThemenDatei>();
  for (const { k } of behalten) {
    const pfad = `${k.track}/${slug(k.thema)}.json`;
    const alt = gruppen.get(pfad) ?? { track: k.track, thema: k.thema, karten: [] };
    gruppen.set(pfad, { ...alt, karten: [...alt.karten, k] });
  }
  const dateien = [...gruppen.entries()].map(([pfad, inhalt]) => ({ pfad, inhalt })).sort((a, b) => a.pfad.localeCompare(b.pfad));
  return { dateien, verworfen };
}
