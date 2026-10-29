import type { Fortschritt, Karte, Lernstand, ThemenFortschritt, Track } from './typen';
import { stufeVon } from './wiederholung';

export const SESSION_GROESSE = 10;
export const MAX_NEUE = 10;
/** Wählbare Grenzen für neue Karten pro Session (Einstellungen). */
export const NEUE_OPTIONEN = [5, 10, 20] as const;
export type NeueProSession = (typeof NEUE_OPTIONEN)[number];

/** Eine Session ist mindestens zehn Karten groß, bei 20 neuen entsprechend größer. */
export function sessionGroesse(neue: number = MAX_NEUE): number {
  return Math.max(SESSION_GROESSE, neue);
}

type Staende = Readonly<Record<string, Lernstand | undefined>>;

/** Wählt die Karten einer Session: fällige nach Datum, dann höchstens `maxNeue` neue. */
export function waehleSession(
  karten: readonly Karte[],
  staende: Staende,
  track: Track,
  n = SESSION_GROESSE,
  heute = new Date().toISOString().slice(0, 10),
  reihenfolge: readonly string[] = [],
  maxNeue: number = MAX_NEUE,
): string[] {
  const eigene = karten.filter((k) => k.track === track);
  const faellige = eigene
    .filter((k) => { const s = staende[k.id]; return s !== undefined && s.box > 0 && s.faellig <= heute; })
    .sort((a, b) => (staende[a.id]!.faellig).localeCompare(staende[b.id]!.faellig) || a.id.localeCompare(b.id));
  const rang = (thema: string) => { const i = reihenfolge.indexOf(thema); return i === -1 ? reihenfolge.length : i; };
  const neue = eigene
    .map((k, pos) => ({ k, pos }))
    .filter(({ k }) => (staende[k.id]?.box ?? 0) === 0)
    .sort((a, b) => a.k.stufe - b.k.stufe || rang(a.k.thema) - rang(b.k.thema) || a.pos - b.pos)
    .map(({ k }) => k);
  const auswahl = faellige.slice(0, n);
  const platz = Math.min(maxNeue, n - auswahl.length);
  return [...auswahl, ...neue.slice(0, Math.max(platz, 0))].map((k) => k.id);
}

const leer = (thema: string): ThemenFortschritt => ({ thema, gesamt: 0, kann: 0, lerne: 0, offen: 0 });

export function fortschritt(karten: readonly Karte[], staende: Staende): Fortschritt {
  const jeThema = new Map<string, ThemenFortschritt>();
  for (const k of karten) {
    const alt = jeThema.get(k.thema) ?? leer(k.thema);
    const stufe = stufeVon(staende[k.id]);
    jeThema.set(k.thema, { ...alt, gesamt: alt.gesamt + 1, [stufe]: alt[stufe] + 1 });
  }
  const liste = [...jeThema.values()];
  const summe = (f: 'kann' | 'lerne' | 'offen') => liste.reduce((s, t) => s + t[f], 0);
  const gesamt = karten.length;
  const kann = summe('kann');
  return { gesamt, kann, lerne: summe('lerne'), offen: summe('offen'), anteil: gesamt ? kann / gesamt : 0, jeThema: liste };
}
