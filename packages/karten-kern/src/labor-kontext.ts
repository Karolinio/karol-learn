import type { Nachricht, Skript } from './labor-typen';

/** Beschreibungs-Tokens je Tool, wenn der Regler mehr Tools anbietet, als das Skript nennt. */
export const STANDARD_TOOL_TOKENS = 250;
/** Größe der Zusammenfassung nach einer Kompaktierung. */
export const KOMPAKT_TOKENS = 1200;

/** Ein Stück des Inputs in fester Reihenfolge. Gleiche ids am Anfang = gleicher, cachebarer Präfix. */
export interface Baustein { id: string; tokens: number }

export function toolTokens(skript: Skript, anzahl: number): number {
  let summe = 0;
  for (let i = 0; i < anzahl; i += 1) summe += skript.tools[i]?.tokens ?? STANDARD_TOOL_TOKENS;
  return summe;
}

/** System, Tool-Beschreibungen und Nutzerfrage: kommen bei jedem Aufruf gleich mit. */
export function festerAnfang(skript: Skript, anzahl: number): Baustein[] {
  return [
    { id: 'system', tokens: skript.system.tokens },
    { id: `tools-${anzahl}`, tokens: toolTokens(skript, anzahl) },
    { id: 'user', tokens: skript.user.tokens },
  ];
}

export function bausteine(fest: readonly Baustein[], verlauf: readonly Nachricht[]): Baustein[] {
  return [...fest, ...verlauf.map((n) => ({ id: n.id, tokens: n.tokens }))];
}

export function summe(liste: readonly { tokens: number }[]): number {
  return liste.reduce((s, b) => s + b.tokens, 0);
}

/** Tokens, die exakt wie beim vorigen Aufruf beginnen. Ab der ersten Abweichung ist der Cache weg. */
export function gemeinsamerPraefix(vorher: readonly Baustein[], jetzt: readonly Baustein[]): number {
  let tokens = 0;
  for (let i = 0; i < Math.min(vorher.length, jetzt.length); i += 1) {
    if (vorher[i]!.id !== jetzt[i]!.id) break;
    tokens += jetzt[i]!.tokens;
  }
  return tokens;
}

/** Fasst alles vor der aktuellen Runde zusammen. Ohne ältere Runden gibt es nichts zu sparen. */
export function kompaktiere(verlauf: readonly Nachricht[], runde: number): Nachricht[] | undefined {
  const praefix = `r${runde}-`;
  const ab = verlauf.findIndex((n) => n.id.startsWith(praefix));
  if (ab <= 0) return undefined;
  const zusammenfassung: Nachricht = {
    id: `kompakt-${runde}`, rolle: 'system', tokens: KOMPAKT_TOKENS,
    text: `Zusammenfassung von Runde 1 bis ${runde - 1}: die wichtigsten Ergebnisse in Kurzform. Einzelheiten sind weg.`,
  };
  return [zusammenfassung, ...verlauf.slice(ab)];
}

export function kuerze(text: string, tokens: number, max: number | undefined): { text: string; tokens: number; gekuerzt: boolean } {
  if (max === undefined || tokens <= max) return { text, tokens, gekuerzt: false };
  return { text: `${text} … [gekürzt auf ${tausender(max)} Tokens]`, tokens: max, gekuerzt: true };
}

/** 40000 → „40.000“, unabhängig von der Laufzeit-Locale. */
export function tausender(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
