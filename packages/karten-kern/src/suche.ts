import type { Karte, Track } from './typen';

export interface Suchindex { karten: readonly Karte[]; texte: readonly string[] }
export interface Suchfilter { track?: Track; thema?: string }

const normal = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function baueSuchindex(karten: readonly Karte[]): Suchindex {
  return { karten, texte: karten.map((k) => normal(`${k.frage} ${k.antwort} ${k.thema} ${k.id}`)) };
}

/** Volltextsuche: alle Wörter müssen vorkommen, Filter nach Track und Thema. */
export function suche(index: Suchindex, anfrage: string, filter: Suchfilter = {}): Karte[] {
  const teile = normal(anfrage).split(/\s+/).filter(Boolean);
  return index.karten.filter((k, i) =>
    (!filter.track || k.track === filter.track) &&
    (!filter.thema || k.thema === filter.thema) &&
    teile.every((t) => index.texte[i]!.includes(t)),
  );
}
