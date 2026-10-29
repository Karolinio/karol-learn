import type { Karte, Track } from '@karol-learn/karten-kern';
import { agentLoop } from './agent-loop';
import { einsatz } from './einsatz';
import { gatewayMandat } from './gateway-mandat';
import { gitAblauf } from './git-ablauf';
import { hierarchie } from './hierarchie';
import { kontextfenster } from './kontextfenster';
import { mcp } from './mcp';
import { rag } from './rag';
import { repoStruktur } from './repo-struktur';
import { schichten } from './schichten';
import type { Skizze } from './typen';
import { vierWege } from './vier-wege';

export type { Skizze, SkizzenMeta, SkizzenSchritt } from './typen';

/** Alle Skizzen in Lernreihenfolge. Neue Skizze: Datei in skizzen/, hier eintragen, Test läuft mit. */
export const SKIZZEN: readonly Skizze[] = [
  schichten, agentLoop, kontextfenster, vierWege, hierarchie, mcp, rag,
  einsatz, gitAblauf, repoStruktur, gatewayMandat,
];

type ThemenJeTrack = Readonly<Record<Track, ReadonlySet<string>>>;

/** Eine Skizze ist sichtbar, solange mindestens eines ihrer Themen im Index steht (KL_AUSSCHLIESSEN). */
export function istSichtbar(s: Skizze, themen: ThemenJeTrack): boolean {
  return s.themen.some((t) => themen[s.track].has(t));
}

export function sichtbareSkizzen(themen: ThemenJeTrack, track?: Track, liste: readonly Skizze[] = SKIZZEN): Skizze[] {
  return liste.filter((s) => (!track || s.track === track) && istSichtbar(s, themen));
}

export function findeSkizze(id: string | undefined, themen: ThemenJeTrack, liste: readonly Skizze[] = SKIZZEN): Skizze | undefined {
  const s = liste.find((x) => x.id === id);
  return s && istSichtbar(s, themen) ? s : undefined;
}

/** Skizze zu einer Karte: erst das Feld `skizze`, sonst die erste Skizze ihres Tracks, die das Thema abdeckt. */
export function skizzeFuerKarte(k: Pick<Karte, 'track' | 'thema' | 'skizze'>, themen: ThemenJeTrack, liste: readonly Skizze[] = SKIZZEN): Skizze | undefined {
  const sichtbar = sichtbareSkizzen(themen, k.track, liste);
  return (k.skizze ? sichtbar.find((s) => s.id === k.skizze) : undefined) ?? sichtbar.find((s) => s.themen.includes(k.thema));
}

/** Skizzen, die ein Roadmap-Thema erklären. */
export function skizzenZumThema(track: Track, thema: string, themen: ThemenJeTrack, liste: readonly Skizze[] = SKIZZEN): Skizze[] {
  return sichtbareSkizzen(themen, track, liste).filter((s) => s.themen.includes(thema));
}
