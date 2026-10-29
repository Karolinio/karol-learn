import { fehlendeBilder, pruefeBestand, type Karte } from '@karol-learn/karten-kern';
import { vorhandeneBilder } from './index-lib';
import { INHALT, liesRoadmaps, liesThemenDateien } from './lib';

const dateien = liesThemenDateien();
const ergebnis = pruefeBestand(dateien);
const fehler = [...ergebnis.fehler];

let roadmaps: ReturnType<typeof liesRoadmaps> = [];
try {
  roadmaps = liesRoadmaps();
} catch (e) {
  fehler.push(`Roadmap ungültig: ${(e as Error).message}`);
}
const karten = dateien.flatMap((d) => ((d.inhalt as { karten?: Karte[] }).karten ?? []));
for (const r of roadmaps) {
  const themen = new Set(karten.filter((k) => k.track === r.track).map((k) => k.thema));
  const inRoadmap = new Set(r.themen.map((t) => t.thema));
  for (const t of inRoadmap) if (!themen.has(t)) fehler.push(`roadmap/${r.track}: Thema "${t}" hat keine Karten`);
  for (const t of themen) if (!inRoadmap.has(t)) fehler.push(`roadmap/${r.track}: Thema "${t}" fehlt in der Roadmap`);
}

// Fehlende Themenbilder sind nur eine Warnung: die App zeigt dann ein Symbol.
const ohneBild = fehlendeBilder(roadmaps, vorhandeneBilder(INHALT));
if (ohneBild.length) {
  process.stderr.write(`pruefen: Warnung, ${ohneBild.length} Roadmap-Themen ohne Bild in inhalt/bilder/themen/\n${ohneBild.map((b) => `  ${b}`).join('\n')}\n`);
}

if (fehler.length) {
  process.stderr.write(`pruefen: ${fehler.length} Fehler\n${fehler.map((f) => `  ${f}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`pruefen: grün, ${ergebnis.anzahl} Karten in ${dateien.length} Dateien, ${roadmaps.length} Roadmaps\n`);
}
