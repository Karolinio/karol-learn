import { join } from 'node:path';
import { baueIndex } from './index-lib';
import { INHALT, WURZEL } from './lib';

// KL_AUSSCHLIESSEN=wiya,… lässt Themen (Karten, Roadmap-Themen, Bilder, Skizzen) für öffentliches Hosting weg.
const aus = new Set((process.env.KL_AUSSCHLIESSEN ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const r = baueIndex({ inhalt: INHALT, ziel: join(WURZEL, 'apps/web/public/inhalt'), aus });
process.stdout.write(`index-bauen: ${r.karten} Karten, ${r.roadmaps} Roadmaps, ${r.bilder} Bilder, ${r.labor} Störfälle${aus.size ? `, ohne ${[...aus].join(', ')}` : ''}\n`);
