import type { ComponentType } from 'react';
import type { Track } from '@karol-learn/karten-kern';

export interface SkizzenSchritt {
  titel: string;
  text: string;
  /** Lexikon-Karte zu diesem Schritt (id muss existieren, prüft registry.test.ts). */
  karte?: string;
  /** Teile, die in diesem Schritt hervorgehoben sind. */
  fokus: readonly string[];
}

export interface SkizzenMeta {
  id: string;
  titel: string;
  track: Track;
  /** Roadmap-Themen, die die Skizze erklärt. Sind alle ausgeblendet, verschwindet die Skizze. */
  themen: readonly string[];
  kurztext: string;
}

export interface Skizze extends SkizzenMeta {
  schritte: readonly SkizzenSchritt[];
  Komponente: ComponentType;
}
