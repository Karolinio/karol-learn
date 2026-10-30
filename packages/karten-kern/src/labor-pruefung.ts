import { erfuelltBeweis, laufMitFix } from './labor-stoerfall';
import { szenarioSchema, type Beweis, type SimLauf, type Szenario, type Wahl } from './labor-typen';
import type { Track } from './typen';

export type KartenIndex = ReadonlyMap<string, { track: Track }>;

function messwert(l: SimLauf, metrik: Beweis['metrik']): string {
  switch (metrik) {
    case 'ende': return l.ende;
    case 'usd': return (l.schritte[l.schritte.length - 1]?.kumuliert.usd ?? 0).toFixed(4);
    case 'kontextMax': return String(Math.max(0, ...l.schritte.map((s) => s.kontextTokens)));
    case 'injektion': return String(l.injektionAusgefuehrt);
    case 'fehlerSichtbar': return String(l.fehlerSichtbar);
    case 'tool': return l.genutzteTools.join(',') || '-';
  }
}

function pruefeWahlen(name: string, liste: readonly Wahl[]): string[] {
  const fehler: string[] = [];
  const richtige = liste.filter((w) => w.richtig).length;
  if (richtige !== 1) fehler.push(`${name}: ${richtige} richtige statt genau 1`);
  const ids = liste.map((w) => w.id);
  if (new Set(ids).size !== ids.length) fehler.push(`${name}: Wahl-id doppelt`);
  return fehler;
}

function pruefeKarten(s: Szenario, karten: KartenIndex): string[] {
  if (!s.karten.length) return ['braucht mindestens eine Karte'];
  return s.karten.flatMap((id) => {
    const k = karten.get(id);
    if (!k) return [`Karte ${id} fehlt`];
    return k.track === s.track ? [] : [`Karte ${id} gehört zu Track ${k.track}, Szenario zu ${s.track}`];
  });
}

/** Ein Fix ohne Regler und Skript ändert nichts; das muss im Inhalt ausdrücklich stehen. */
function pruefeMarken(s: Szenario): string[] {
  return s.reparaturen.flatMap((r) => {
    const aendert = r.regler !== undefined || r.skript !== undefined;
    if (r.richtig && r.wirkungslos) return [`richtige Reparatur ${r.id} darf nicht wirkungslos sein`];
    if (!aendert && !r.wirkungslos) return [`Reparatur ${r.id} ändert nichts, braucht wirkungslos: true`];
    return aendert && r.wirkungslos ? [`Reparatur ${r.id} ist als wirkungslos markiert, ändert aber Regler oder Skript`] : [];
  });
}

/**
 * Simuliert den kaputten Lauf und alle drei Reparaturen.
 * Ehrlich gesagt belegt das mechanisch nur die richtige Reparatur: Sie ändert Regler oder Skript,
 * und der Beweis muss danach erfüllt sein. Falsche Fixes sind entweder wirkungslos (No-op, so markiert)
 * oder ein von Hand geschriebenes Skript; geprüft wird nur, dass sie den Beweis verfehlen.
 */
function pruefeWirkung(s: Szenario): string[] {
  const fehler: string[] = [];
  if (erfuelltBeweis(laufMitFix(s, {}), s.beweis)) fehler.push('kaputter Lauf erfüllt den Beweis schon');
  for (const r of s.reparaturen) {
    const lauf = laufMitFix(s, r);
    const ok = erfuelltBeweis(lauf, s.beweis);
    if (r.richtig && !ok) fehler.push(`richtige Reparatur ${r.id} erfüllt den Beweis nicht (${s.beweis.metrik} = ${messwert(lauf, s.beweis.metrik)})`);
    if (!r.richtig && ok) fehler.push(`falsche Reparatur ${r.id} erfüllt den Beweis trotzdem`);
  }
  return fehler;
}

/** Prüft ein Szenario aus inhalt/labor: Schema, Wahlen, Karten, und dass die Reparatur maschinell wirkt. */
export function pruefeSzenario(roh: unknown, karten: KartenIndex): string[] {
  const r = szenarioSchema.safeParse(roh);
  const name = String((roh as { id?: unknown })?.id);
  if (!r.success) {
    const i = r.error.issues[0];
    return [`${name}: Schema ungültig bei ${i?.path.join('.')}: ${i?.message}`];
  }
  const s = r.data;
  const fehler = [
    ...pruefeWahlen('Ursachen', s.ursachen),
    ...pruefeWahlen('Reparaturen', s.reparaturen),
    ...pruefeKarten(s, karten),
    ...pruefeMarken(s),
  ];
  return [...fehler, ...pruefeWirkung(s)].map((f) => `${s.id}: ${f}`);
}

/** Alle Szenarien zusammen: Einzelprüfung plus eindeutige ids. */
export function pruefeLabor(liste: readonly unknown[], karten: KartenIndex): string[] {
  const gesehen = new Set<string>();
  const doppelt = new Set<string>();
  for (const roh of liste) {
    const id = String((roh as { id?: unknown })?.id);
    if (gesehen.has(id)) doppelt.add(id);
    gesehen.add(id);
  }
  const einzeln = [...new Set(liste.flatMap((s) => pruefeSzenario(s, karten)))];
  return [...[...doppelt].map((id) => `${id}: id doppelt`), ...einzeln];
}
