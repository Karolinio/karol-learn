import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { teileAuf, TRACKS, type Karte } from '@karol-learn/karten-kern';
import { INHALT, liesRohbestand, liesThemenDateien, schreibeJson } from './lib';

// Wiederholbar: Rohbestand ist die Quelle; im Eingang angenommene Karten
// (ids, die es nur in karten/ gibt) bleiben erhalten.
const { karten: roh, fehler } = liesRohbestand();
const ersteRunde = teileAuf(roh);
const bekannt = new Set([...roh.map((k) => k.id)]);
const angenommen = liesThemenDateien()
  .flatMap((d) => ((d.inhalt as { karten?: Karte[] }).karten ?? []))
  .filter((k) => !bekannt.has(k.id));
const { dateien } = teileAuf([...roh, ...angenommen]);

for (const track of TRACKS) {
  const ordner = join(INHALT, 'karten', track);
  try {
    for (const f of readdirSync(ordner)) if (f.endsWith('.json')) rmSync(join(ordner, f));
  } catch { /* Ordner existiert noch nicht */ }
}
for (const d of dateien) schreibeJson(join(INHALT, 'karten', d.pfad), d.inhalt);

const zaehlung = dateien.reduce<Record<string, number>>((z, d) => ({ ...z, [d.inhalt.track]: (z[d.inhalt.track] ?? 0) + d.inhalt.karten.length }), {});
schreibeJson(join(INHALT, 'meta.json'), {
  version: 1,
  stand: new Date().toISOString().slice(0, 10),
  karten: zaehlung,
  legende: { offen: 'Box 0, noch nie gelernt', lerne: 'Box 1–3', kann: 'Box 4–5' },
});

const ausgabe = [
  `aufteilen: ${roh.length} Rohkarten, ${angenommen.length} angenommene behalten, ${dateien.length} Dateien`,
  ...Object.entries(zaehlung).map(([t, n]) => `  ${t}: ${n}`),
  ...dateien.map((d) => `  ${d.pfad}: ${d.inhalt.karten.length}`),
  ...ersteRunde.verworfen.map((v) => `  verworfen (${v.grund}): ${v.id} „${v.frage}“ → behalten ${v.behalten}`),
  ...fehler.map((f) => `  ungültig: ${f}`),
];
process.stdout.write(`${ausgabe.join('\n')}\n`);
if (fehler.length) process.exitCode = 1;
