export const SCHWELLE_TUTOR = 0.7;

export function woerter(text: string): Set<string> {
  return new Set(
    text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean),
  );
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let schnitt = 0;
  for (const w of a) if (b.has(w)) schnitt += 1;
  return schnitt / (a.size + b.size - schnitt);
}

interface MitFrage { id: string; frage: string }

/** Liefert die id der ersten Dublette: gleiche id oder Frage-Ähnlichkeit ≥ Schwelle. */
export function findeDublette(neu: MitFrage, bestand: readonly MitFrage[], schwelle = SCHWELLE_TUTOR): string | undefined {
  const w = woerter(neu.frage);
  return bestand.find((b) => b.id === neu.id || jaccard(w, woerter(b.frage)) >= schwelle)?.id;
}
