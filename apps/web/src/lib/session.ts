import { sessionGroesse, waehleSession, type Lernstand, type Track } from '@karol-learn/karten-kern';
import { heute } from './datum';
import { themenReihenfolge, type Inhalt } from './inhalt';

/** Die eine Stelle, an der Heute und Stapel die Session wählen. */
export function waehleFuer(inhalt: Inhalt, staende: Readonly<Record<string, Lernstand>>, track: Track, neue: number, thema?: string): string[] {
  const karten = thema ? inhalt.karten.filter((k) => k.thema === thema) : inhalt.karten;
  return waehleSession(karten, staende, track, sessionGroesse(neue), heute(), themenReihenfolge(inhalt, track), neue);
}
