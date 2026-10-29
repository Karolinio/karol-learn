import { appendFile, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';

/** Löst einen Pfad nur innerhalb von `basis` auf, sonst Fehler (gegen ../). */
export function imOrdner(basis: string, ...teile: string[]): string {
  const b = resolve(basis);
  const ziel = resolve(b, ...teile);
  if (ziel !== b && !ziel.startsWith(b + sep)) throw new PfadFehler(`Pfad außerhalb von ${b}`);
  return ziel;
}

export class PfadFehler extends Error {}

export async function liesJson<T>(pfad: string): Promise<T> {
  return JSON.parse(await readFile(pfad, 'utf8')) as T;
}

export async function liesJsonOder<T>(pfad: string, ersatz: T): Promise<T> {
  try {
    return await liesJson<T>(pfad);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return ersatz;
    throw e;
  }
}

export async function schreibeJsonAtomar(pfad: string, daten: unknown): Promise<void> {
  await mkdir(dirname(pfad), { recursive: true });
  const tmp = `${pfad}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmp, `${JSON.stringify(daten, null, 2)}\n`);
  await rename(tmp, pfad);
}

export async function haengeZeileAn(pfad: string, zeile: unknown): Promise<void> {
  await mkdir(dirname(pfad), { recursive: true });
  await appendFile(pfad, `${JSON.stringify(zeile)}\n`);
}

export async function jsonDateien(ordner: string): Promise<string[]> {
  try {
    return (await readdir(ordner)).filter((f) => f.endsWith('.json')).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}
