import { simuliere } from './labor-sim';
import type { Beweis, Fix, LaborErgebnis, SimLauf, Szenario, Wahl } from './labor-typen';

export type StoerfallPhase = 'symptom' | 'ursache' | 'reparatur' | 'vergleich' | 'fertig';

export interface StoerfallZustand {
  szenario: Szenario;
  phase: StoerfallPhase;
  /** 1 = ohne Fehlgriff; jede falsche Wahl zählt eins dazu. */
  versuche: number;
  kaputt: SimLauf;
  /** Rückmeldung auf die letzte Wahl, mit Begründung. */
  rueckmeldung?: { wahlId: string; richtig: boolean; warum: string };
  /** Bereits falsch gewählte ids der aktuellen Phase. */
  ausgeschlossen: readonly string[];
  /** Der Lauf mit einem falschen Fix: zeigt, dass das Symptom bleibt. */
  falscherLauf?: SimLauf;
  repariert?: SimLauf;
  ergebnis?: LaborErgebnis;
}

export type StoerfallEreignis =
  | { typ: 'ABGESPIELT' }
  | { typ: 'WAEHLE_URSACHE'; id: string }
  | { typ: 'WAEHLE_REPARATUR'; id: string }
  | { typ: 'WEITER'; datum: string }
  | { typ: 'NEU' };

/** Simuliert das Szenario mit einem Fix: Regler werden gemischt, ein Skript ersetzt das alte. */
export function laufMitFix(s: Szenario, fix: Fix): SimLauf {
  return simuliere(fix.skript ?? s.skript, { ...s.regler, ...fix.regler });
}

/** Belegt maschinell, ob ein Lauf das Ziel des Störfalls erreicht. */
export function erfuelltBeweis(lauf: SimLauf, b: Beweis): boolean {
  const usd = lauf.schritte[lauf.schritte.length - 1]?.kumuliert.usd ?? 0;
  const kontextMax = Math.max(0, ...lauf.schritte.map((x) => x.kontextTokens));
  switch (b.metrik) {
    case 'ende': return lauf.ende === b.erwartet;
    case 'usd': return usd <= Number(b.erwartet);
    case 'kontextMax': return kontextMax <= Number(b.erwartet);
    case 'injektion': return lauf.injektionAusgefuehrt === b.erwartet;
    case 'fehlerSichtbar': return lauf.fehlerSichtbar === b.erwartet;
    case 'tool': return lauf.genutzteTools.includes(String(b.erwartet));
  }
}

export function starteStoerfall(szenario: Szenario): StoerfallZustand {
  return { szenario, phase: 'symptom', versuche: 1, kaputt: laufMitFix(szenario, {}), ausgeschlossen: [] };
}

function rueckmeldung(w: Wahl): StoerfallZustand['rueckmeldung'] {
  return { wahlId: w.id, richtig: w.richtig, warum: w.warum };
}

function waehleUrsache(z: StoerfallZustand, id: string): StoerfallZustand {
  const w = z.szenario.ursachen.find((x) => x.id === id);
  if (!w || z.ausgeschlossen.includes(id)) return z;
  if (w.richtig) return { ...z, phase: 'reparatur', rueckmeldung: rueckmeldung(w), ausgeschlossen: [] };
  return { ...z, versuche: z.versuche + 1, rueckmeldung: rueckmeldung(w), ausgeschlossen: [...z.ausgeschlossen, id] };
}

function waehleReparatur(z: StoerfallZustand, id: string): StoerfallZustand {
  const w = z.szenario.reparaturen.find((x) => x.id === id);
  if (!w || z.ausgeschlossen.includes(id)) return z;
  const lauf = laufMitFix(z.szenario, w);
  if (w.richtig) return { ...z, phase: 'vergleich', rueckmeldung: rueckmeldung(w), repariert: lauf, falscherLauf: undefined, ausgeschlossen: [] };
  return { ...z, versuche: z.versuche + 1, rueckmeldung: rueckmeldung(w), falscherLauf: lauf, ausgeschlossen: [...z.ausgeschlossen, id] };
}

/** Zustandsmaschine eines Störfalls: symptom → ursache → reparatur → vergleich → fertig. Pur. */
export function stoerfallSchritt(z: StoerfallZustand, e: StoerfallEreignis): StoerfallZustand {
  if (e.typ === 'NEU') return starteStoerfall(z.szenario);
  if (z.phase === 'symptom' && e.typ === 'ABGESPIELT') return { ...z, phase: 'ursache' };
  if (z.phase === 'ursache' && e.typ === 'WAEHLE_URSACHE') return waehleUrsache(z, e.id);
  if (z.phase === 'reparatur' && e.typ === 'WAEHLE_REPARATUR') return waehleReparatur(z, e.id);
  if (z.phase === 'vergleich' && e.typ === 'WEITER') {
    const s = z.szenario;
    return { ...z, phase: 'fertig', ergebnis: { szenarioId: s.id, track: s.track, geloest: true, versuche: z.versuche, datum: e.datum } };
  }
  return z;
}

function istBesser(neu: LaborErgebnis, alt: LaborErgebnis): boolean {
  if (neu.geloest !== alt.geloest) return neu.geloest;
  return neu.versuche < alt.versuche || (!alt.geloest && neu.versuche >= alt.versuche);
}

/** Merkt ein Ergebnis je Szenario und behält das beste: gelöst schlägt ungelöst, weniger Versuche schlagen mehr. */
export function merkeLaborErgebnis(liste: readonly LaborErgebnis[], e: LaborErgebnis): LaborErgebnis[] {
  const alt = liste.find((x) => x.szenarioId === e.szenarioId);
  if (!alt) return [...liste, e];
  return istBesser(e, alt) ? liste.map((x) => (x === alt ? e : x)) : [...liste];
}
