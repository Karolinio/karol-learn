import type { RoadmapThema } from '@karol-learn/karten-kern';

/** Themenbilder sind 4:3; width/height verhindern Layout-Sprünge. */
export const BILD_SEITEN = { breite: 4, hoehe: 3 } as const;

export function bildUrl(bild: string): string {
  return `${import.meta.env.BASE_URL}${bild}`;
}

export function themenBildUrl(t: RoadmapThema | undefined): string | undefined {
  return t?.bild ? bildUrl(t.bild) : undefined;
}

const vorbereitet = new Map<string, Promise<void>>();

/**
 * Lädt und dekodiert ein Bild vorab, damit der erste Swipe nicht ruckelt.
 * Fehler sind egal: dann lädt das <img> normal.
 */
export function bereiteBildVor(url: string | undefined): Promise<void> {
  if (!url || typeof Image === 'undefined') return Promise.resolve();
  const da = vorbereitet.get(url);
  if (da) return da;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  const p = (typeof img.decode === 'function' ? img.decode() : Promise.resolve()).catch(() => undefined);
  vorbereitet.set(url, p);
  return p;
}
