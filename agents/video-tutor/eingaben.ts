import { readFileSync, statSync } from 'node:fs';
import { z } from 'zod';
import type { Track } from '@karol-learn/karten-kern';

export const argsSchema = z.object({
  datei: z.string().min(1, 'Transkript-Datei oder YouTube-Link fehlt'),
  quelle: z.string().trim().min(1, '--quelle muss gesetzt sein').max(300).optional(),
  track: z.enum(['aie', 'fde']).optional(),
});
/** `datei` ist ein Pfad oder ein YouTube-Link. Ohne `quelle` nimmt der Tutor bei Links den Videotitel. */
export type Args = { datei: string; quelle?: string; track?: Track };

export function parseArgs(argv: readonly string[]): Args {
  const roh: Record<string, string | undefined> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === '--quelle' || a === '--track') { roh[a.slice(2)] = argv[i + 1]; i++; }
    else rest.push(a);
  }
  const args = argsSchema.parse({ datei: rest[0] ?? '', quelle: roh.quelle, track: roh.track });
  return Object.fromEntries(Object.entries(args).filter(([, w]) => w !== undefined)) as Args;
}

/** Die Datei muss existieren, kleiner als die Grenze und Text sein. */
export function liesTranskript(pfad: string, maxKb: number): string {
  let groesse: number;
  try {
    const s = statSync(pfad);
    if (!s.isFile()) throw new Error('keine Datei');
    groesse = s.size;
  } catch {
    throw new Error(`Transkript nicht gefunden: ${pfad}`);
  }
  if (groesse >= maxKb * 1024) throw new Error(`Transkript ist zu groß (${Math.round(groesse / 1024)} KB, erlaubt < ${maxKb} KB)`);
  const puffer = readFileSync(pfad);
  if (puffer.includes(0)) throw new Error('Transkript ist keine Textdatei');
  const text = new TextDecoder('utf-8', { fatal: false }).decode(puffer);
  if (text.includes('�')) throw new Error('Transkript ist kein gültiges UTF-8');
  if (!text.trim()) throw new Error('Transkript ist leer');
  return text;
}
