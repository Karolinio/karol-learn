import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ordneBilderZu, themenBildDatei, type Karte, type Roadmap } from '@karol-learn/karten-kern';
import { liesRoadmaps, liesThemenDateien, schreibeJson } from './lib';

export interface IndexOptionen {
  /** Ordner `inhalt/` (Quelle). */
  inhalt: string;
  /** Ordner `apps/web/public/inhalt/` (Ziel, gitignored). */
  ziel: string;
  /** Themen, die nicht in den Index sollen (KL_AUSSCHLIESSEN). */
  aus?: ReadonlySet<string>;
  jetzt?: Date;
}

export interface IndexErgebnis { karten: number; roadmaps: number; bilder: number }

/** Liest die vorhandenen Themenbilder (nur `*.webp` direkt im Ordner). */
export function vorhandeneBilder(inhalt: string): Set<string> {
  const ordner = join(inhalt, 'bilder', 'themen');
  if (!existsSync(ordner)) return new Set();
  return new Set(readdirSync(ordner).filter((f) => /^[a-z0-9-]+\.webp$/.test(f)));
}

/** Kopiert nur die Bilder, die ein Thema im Index wirklich nutzt; alte Kopien fliegen raus. */
function kopiereBilder(inhalt: string, ziel: string, roadmaps: readonly Roadmap[]): number {
  const zielOrdner = join(ziel, 'bilder');
  rmSync(zielOrdner, { recursive: true, force: true });
  mkdirSync(zielOrdner, { recursive: true });
  const genutzt = roadmaps.flatMap((r) => r.themen.filter((t) => t.bild).map((t) => themenBildDatei(r.track, t.thema)));
  for (const datei of genutzt) copyFileSync(join(inhalt, 'bilder', 'themen', datei), join(zielOrdner, datei));
  return genutzt.length;
}

/** Baut `index.json` und kopiert die Themenbilder daneben. */
export function baueIndex(o: IndexOptionen): IndexErgebnis {
  const aus = o.aus ?? new Set<string>();
  const karten = liesThemenDateien(o.inhalt)
    .flatMap((d) => ((d.inhalt as { karten?: Karte[] }).karten ?? []))
    .filter((k) => !aus.has(k.thema));
  const bilder = vorhandeneBilder(o.inhalt);
  const roadmaps = liesRoadmaps(o.inhalt)
    .map((r) => ordneBilderZu({ ...r, themen: r.themen.filter((t) => !aus.has(t.thema)) }, bilder));
  const kopiert = kopiereBilder(o.inhalt, o.ziel, roadmaps);
  schreibeJson(join(o.ziel, 'index.json'), { version: 1, stand: (o.jetzt ?? new Date()).toISOString(), karten, roadmaps });
  return { karten: karten.length, roadmaps: roadmaps.length, bilder: kopiert };
}
