import { tausender, type Ende, type SimLauf } from '@karol-learn/karten-kern';

/** Beispielpreise sind klein: unter 1 $ drei Nachkommastellen, sonst zwei. */
export function usd(betrag: number): string {
  const stellen = betrag >= 1 ? 2 : 3;
  return `${betrag.toFixed(stellen).replace('.', ',')} $`;
}

export function tokens(n: number): string {
  return n >= 10_000 ? `${tausender(Math.round(n / 1000))}k` : tausender(n);
}

export const ENDE_TEXT: Record<Ende, string> = {
  fertig: 'Fertig',
  max_runden: 'Rundenlimit erreicht',
  kontext_voll: 'Kontext voll',
  wiederholung: 'Wiederholung gestoppt',
  not_aus: 'Not-Aus nach 30 Runden',
};

/** Ton für Farbe: grün = Aufgabe erledigt, orange = geordnet gestoppt, rot = gescheitert. */
export function endeTon(e: Ende): 'ok' | 'stopp' | 'fehler' {
  if (e === 'fertig') return 'ok';
  return e === 'max_runden' || e === 'wiederholung' ? 'stopp' : 'fehler';
}

export interface LaufZahlen { ende: Ende; runden: number; kontextMax: number; tokensGesamt: number; usd: number }

export function laufZahlen(l: SimLauf): LaufZahlen {
  const k = l.schritte[l.schritte.length - 1]?.kumuliert;
  return {
    ende: l.ende,
    runden: l.schritte.length,
    kontextMax: Math.max(0, ...l.schritte.map((s) => s.kontextTokens)),
    tokensGesamt: k ? k.input + k.cacheLesen + k.cacheSchreiben + k.output : 0,
    usd: k?.usd ?? 0,
  };
}
