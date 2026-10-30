import type { RundenKosten } from './labor-typen';

// Beispielpreise in US-Dollar je Million Tokens. Keine echten Anbieterpreise:
// Sie zeigen die Verhältnisse (Output teurer als Input, Cache-Lesen ein Zehntel).
export const BEISPIELPREIS_INPUT = 3;
export const BEISPIELPREIS_OUTPUT = 15;
export const BEISPIELPREIS_CACHE_LESEN_FAKTOR = 0.1;
export const BEISPIELPREIS_CACHE_SCHREIBEN_FAKTOR = 1.25;
const MIO = 1_000_000;

export const KEINE_KOSTEN: RundenKosten = Object.freeze({ input: 0, cacheLesen: 0, cacheSchreiben: 0, output: 0, usd: 0 });

/** Input einer Runde: `praefix` = Tokens, die exakt wie in der Vorrunde beginnen; `neu` = der Rest. */
export interface RundenInput { praefix: number; neu: number; output: number }

/** Kosten einer Modellrunde. Ohne Caching wird alles voll bezahlt, mit Caching der gleiche Anfang nur zu einem Zehntel. */
export function rundenKosten({ praefix, neu, output }: RundenInput, caching: boolean): RundenKosten {
  const input = caching ? 0 : praefix + neu;
  const cacheLesen = caching ? praefix : 0;
  const cacheSchreiben = caching ? neu : 0;
  const usd = (input * BEISPIELPREIS_INPUT
    + cacheLesen * BEISPIELPREIS_INPUT * BEISPIELPREIS_CACHE_LESEN_FAKTOR
    + cacheSchreiben * BEISPIELPREIS_INPUT * BEISPIELPREIS_CACHE_SCHREIBEN_FAKTOR
    + output * BEISPIELPREIS_OUTPUT) / MIO;
  return { input, cacheLesen, cacheSchreiben, output, usd };
}

export function addiereKosten(a: RundenKosten, b: RundenKosten): RundenKosten {
  return {
    input: a.input + b.input,
    cacheLesen: a.cacheLesen + b.cacheLesen,
    cacheSchreiben: a.cacheSchreiben + b.cacheSchreiben,
    output: a.output + b.output,
    usd: a.usd + b.usd,
  };
}
