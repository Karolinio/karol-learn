import { z } from 'zod';
import { karteSchema, roadmapSchema, type Karte, type Roadmap, type RoadmapThema, type Track } from '@karol-learn/karten-kern';

const indexSchema = z.object({
  version: z.literal(1),
  stand: z.string(),
  karten: z.array(karteSchema),
  roadmaps: z.array(roadmapSchema),
});

export interface Inhalt {
  stand: string;
  karten: readonly Karte[];
  roadmaps: Readonly<Record<Track, Roadmap | undefined>>;
  nachId: ReadonlyMap<string, Karte>;
  /** Themen, die es im Index gibt (nach KL_AUSSCHLIESSEN), je Track. */
  themen: Readonly<Record<Track, ReadonlySet<string>>>;
}

/** Themen je Track aus Karten und Roadmaps: was hier fehlt, ist ausgeblendet. */
export function themenImIndex(karten: readonly Karte[], roadmaps: readonly Roadmap[]): Record<Track, Set<string>> {
  const leer = { aie: new Set<string>(), fde: new Set<string>() };
  for (const k of karten) leer[k.track].add(k.thema);
  for (const r of roadmaps) for (const t of r.themen) leer[r.track].add(t.thema);
  return leer;
}

export async function ladeInhalt(fetcher: typeof fetch = fetch): Promise<Inhalt> {
  const antwort = await fetcher(`${import.meta.env.BASE_URL}inhalt/index.json`, { cache: 'no-cache' });
  if (!antwort.ok) throw new Error(`Inhalt nicht ladbar (HTTP ${antwort.status})`);
  const daten = indexSchema.parse(await antwort.json());
  const roadmaps = { aie: daten.roadmaps.find((r) => r.track === 'aie'), fde: daten.roadmaps.find((r) => r.track === 'fde') };
  return {
    stand: daten.stand, karten: daten.karten, roadmaps,
    nachId: new Map(daten.karten.map((k) => [k.id, k])),
    themen: themenImIndex(daten.karten, daten.roadmaps),
  };
}

export function themenReihenfolge(inhalt: Inhalt, track: Track): string[] {
  return inhalt.roadmaps[track]?.themen.map((t) => t.thema) ?? [];
}

export function roadmapThema(inhalt: Inhalt, track: Track, thema: string): RoadmapThema | undefined {
  return inhalt.roadmaps[track]?.themen.find((t) => t.thema === thema);
}
