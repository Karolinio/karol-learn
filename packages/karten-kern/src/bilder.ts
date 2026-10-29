import { slug } from './slug';
import type { Roadmap, Track } from './typen';

/** Ordner der Themenbilder im gebauten Web-Inhalt, relativ zur App-Basis. */
export const BILD_PFAD = 'inhalt/bilder';

/** Dateiname eines Themenbilds: `<track>-<slug(thema)>.webp`. */
export function themenBildDatei(track: Track, thema: string): string {
  return `${track}-${slug(thema)}.webp`;
}

/** Gibt jedem Roadmap-Thema ein `bild`, wenn die Datei vorhanden ist. Fehlende Bilder sind kein Fehler. */
export function ordneBilderZu(roadmap: Roadmap, vorhanden: ReadonlySet<string>): Roadmap {
  return {
    ...roadmap,
    themen: roadmap.themen.map((t) => {
      const { bild: _alt, ...ohne } = t;
      const datei = themenBildDatei(roadmap.track, t.thema);
      return vorhanden.has(datei) ? { ...ohne, bild: `${BILD_PFAD}/${datei}` } : ohne;
    }),
  };
}

/** Roadmap-Themen ohne Bilddatei, als `<track>: <thema> (<datei>)`. */
export function fehlendeBilder(roadmaps: readonly Roadmap[], vorhanden: ReadonlySet<string>): string[] {
  return roadmaps.flatMap((r) => r.themen
    .map((t) => ({ t, datei: themenBildDatei(r.track, t.thema) }))
    .filter(({ datei }) => !vorhanden.has(datei))
    .map(({ t, datei }) => `${r.track}: ${t.thema} (${datei})`));
}
