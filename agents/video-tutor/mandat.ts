import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';

export class MandatsFehler extends Error {}

/** Mini-Mandat: der Tutor darf nur innerhalb des erlaubten Ordners schreiben. */
export function pruefeMandat(ziel: string, erlaubterOrdner: string): string {
  const erlaubt = resolve(erlaubterOrdner);
  const voll = resolve(ziel);
  if (!voll.startsWith(erlaubt + sep)) throw new MandatsFehler(`Schreiben nach ${voll} ist nicht erlaubt (nur ${erlaubt})`);
  return voll;
}

export function schreibeMitMandat(ziel: string, daten: unknown, erlaubterOrdner: string): string {
  const voll = pruefeMandat(ziel, erlaubterOrdner);
  mkdirSync(dirname(voll), { recursive: true });
  const tmp = `${voll}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(daten, null, 2)}\n`);
  renameSync(tmp, voll);
  return voll;
}
