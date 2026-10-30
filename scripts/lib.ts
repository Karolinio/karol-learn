import { readdirSync, readFileSync, renameSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grundlaufSchema, karteSchema, roadmapSchema, szenarioSchema, TRACKS, type BestandsDatei, type Grundlauf, type Karte, type Roadmap, type Szenario } from '@karol-learn/karten-kern';

export const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const INHALT = join(WURZEL, 'inhalt');

export function liesJson(pfad: string): unknown {
  return JSON.parse(readFileSync(pfad, 'utf8'));
}

/** Atomar schreiben: erst tmp, dann rename. */
export function schreibeJson(pfad: string, daten: unknown): void {
  mkdirSync(dirname(pfad), { recursive: true });
  const tmp = `${pfad}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(daten, null, 2)}\n`);
  renameSync(tmp, pfad);
}

export function liesRohbestand(inhalt = INHALT): { karten: Karte[]; fehler: string[] } {
  const ordner = join(inhalt, 'rohbestand');
  const dateien = readdirSync(ordner).filter((f) => f.endsWith('.json')).sort();
  const fehler: string[] = [];
  const karten: Karte[] = [];
  for (const f of dateien) {
    const roh = (liesJson(join(ordner, f)) as { karten?: unknown[] }).karten ?? [];
    for (const k of roh) {
      const r = karteSchema.safeParse(k);
      if (r.success) karten.push(r.data);
      else fehler.push(`${f}: ${String((k as { id?: string })?.id)} ungültig: ${r.error.issues[0]?.message}`);
    }
  }
  return { karten, fehler };
}

export function liesThemenDateien(inhalt = INHALT): BestandsDatei[] {
  return TRACKS.flatMap((track) => {
    const ordner = join(inhalt, 'karten', track);
    if (!existsSync(ordner)) return [];
    return readdirSync(ordner).filter((f) => f.endsWith('.json')).sort()
      .map((f) => ({ pfad: `${track}/${f}`, inhalt: liesJson(join(ordner, f)) }));
  });
}

export function liesRoadmaps(inhalt = INHALT): Roadmap[] {
  return TRACKS.map((t) => roadmapSchema.parse(liesJson(join(inhalt, 'roadmap', `${t}.json`))));
}

export interface LaborBestand {
  /** Rohdaten aller Störfälle, für pruefeLabor. */
  roh: unknown[];
  szenarien: Szenario[];
  grundlaeufe: Grundlauf[];
  fehler: string[];
}

/** Liest inhalt/labor/: `<track>-grundlauf.json` ist Sandbox, alles andere ein Störfall. */
export function liesLabor(inhalt = INHALT): LaborBestand {
  const ordner = join(inhalt, 'labor');
  const leer: LaborBestand = { roh: [], szenarien: [], grundlaeufe: [], fehler: [] };
  if (!existsSync(ordner)) return leer;
  return readdirSync(ordner).filter((f) => f.endsWith('.json')).sort().reduce<LaborBestand>((b, f) => {
    const daten = liesJson(join(ordner, f));
    if (f.endsWith('-grundlauf.json')) {
      const g = grundlaufSchema.safeParse(daten);
      return g.success ? { ...b, grundlaeufe: [...b.grundlaeufe, g.data] } : { ...b, fehler: [...b.fehler, `labor/${f}: Grundlauf ungültig`] };
    }
    if (`${(daten as { id?: unknown })?.id}.json` !== f) return { ...b, roh: [...b.roh, daten], fehler: [...b.fehler, `labor/${f}: Dateiname passt nicht zur id`] };
    const s = szenarioSchema.safeParse(daten);
    return { ...b, roh: [...b.roh, daten], szenarien: s.success ? [...b.szenarien, s.data] : b.szenarien };
  }, leer);
}
