import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

/** Zeit je Runde beim Abspielen. Lang genug zum Mitlesen der Zahlen, kurz genug für 30 Runden. */
export const SCHRITT_MS = 750;

export interface Abspielen {
  index: number;
  spielt: boolean;
  amEnde: boolean;
  spiele: () => void;
  pausiere: () => void;
  weiter: () => void;
  zumEnde: () => void;
  vonVorn: () => void;
}

/**
 * Schritt-Timer für einen Lauf: Runde für Runde, mit Pause und Weiter.
 * Bei Reduced Motion startet nichts von allein; Karol tippt sich selbst durch.
 */
export function useAbspielen(anzahl: number, { auto = true, start = 0, endeBei }: {
  auto?: boolean; start?: number;
  /** Ändert sich dieser Wert (z. B. ein neuer Lauf), springt die Ansicht ans Ende und hält an. */
  endeBei?: unknown;
} = {}): Abspielen {
  const ruhig = useReducedMotion() ?? false;
  const letzter = Math.max(0, anzahl - 1);
  const [roh, setIndex] = useState(Math.min(start, letzter));
  const [spielt, setSpielt] = useState(auto && !ruhig && anzahl > 1);
  const [gemerkt, setGemerkt] = useState(endeBei);
  if (gemerkt !== endeBei) {
    // Abgeleiteter Zustand während des Renderns: kein Effekt, kein Flackern über die alte Runde.
    setGemerkt(endeBei);
    setIndex(Number.MAX_SAFE_INTEGER);
    setSpielt(false);
  }
  const index = Math.min(roh, letzter);
  const amEnde = index >= letzter;

  useEffect(() => {
    if (!spielt) return undefined;
    if (amEnde) { setSpielt(false); return undefined; }
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, letzter)), SCHRITT_MS);
    return () => clearTimeout(t);
  }, [spielt, amEnde, index, letzter]);

  const spiele = useCallback(() => { setIndex((i) => (i >= letzter ? 0 : i)); setSpielt(true); }, [letzter]);
  const pausiere = useCallback(() => setSpielt(false), []);
  const weiter = useCallback(() => { setSpielt(false); setIndex((i) => Math.min(i + 1, letzter)); }, [letzter]);
  const zumEnde = useCallback(() => { setSpielt(false); setIndex(letzter); }, [letzter]);
  const vonVorn = useCallback(() => { setSpielt(false); setIndex(0); }, []);

  return { index, spielt, amEnde, spiele, pausiere, weiter, zumEnde, vonVorn };
}
