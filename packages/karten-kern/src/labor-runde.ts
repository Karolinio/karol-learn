import { addiereKosten, KEINE_KOSTEN, rundenKosten } from './labor-kosten';
import { bausteine, gemeinsamerPraefix, kompaktiere, kuerze, summe, tausender, type Baustein } from './labor-kontext';
import { rundenSpans, type RundenTrace } from './labor-trace';
import type { Ende, HarnessRegler, Nachricht, RundenKosten, SimSchritt, SkriptRunde, Span } from './labor-typen';

/** Alles, was zwischen zwei Runden weitergetragen wird. Wird nie verändert, nur neu gebaut. */
export interface Stand {
  verlauf: readonly Nachricht[];
  vorige: readonly Baustein[];
  uhrMs: number;
  spans: readonly Span[];
  kumuliert: RundenKosten;
  injektionsZiele: readonly string[];
  injektionAusgefuehrt: boolean;
  fehlerSichtbar: boolean;
  genutzteTools: readonly string[];
  letzteBitte?: { schluessel: string; anzahl: number };
}

export interface Umgebung { regler: HarnessRegler; fest: readonly Baustein[]; anfang: readonly Nachricht[] }

export interface RundenErgebnis { stand: Stand; schritt: SimSchritt; ende?: Ende }

export const START: Stand = {
  verlauf: [], vorige: [], uhrMs: 0, spans: [], kumuliert: KEINE_KOSTEN,
  injektionsZiele: [], injektionAusgefuehrt: false, fehlerSichtbar: false, genutzteTools: [],
};

interface ToolTeil { nachricht?: Nachricht; trace: Pick<RundenTrace, 'gateway' | 'tool'>; ereignis: string; stand: Partial<Stand>; ende?: Ende }

/** Gateway, Tool und Ergebnis einer Runde mit Tool-Bitte. */
function toolTeil(u: Umgebung, s: Stand, n: number, r: SkriptRunde): ToolTeil {
  const bitte = r.bitte!;
  const schluessel = `${bitte.tool}|${bitte.args}`;
  const anzahl = s.letzteBitte?.schluessel === schluessel ? s.letzteBitte.anzahl + 1 : 1;
  const letzteBitte = { schluessel, anzahl };
  if (u.regler.gleicheBitteMax !== undefined && anzahl > u.regler.gleicheBitteMax) {
    return { trace: {}, ereignis: `Runde ${n}: ${bitte.tool} zum ${anzahl}. Mal mit gleichen Argumenten. Der Harness stoppt.`, stand: { letzteBitte }, ende: 'wiederholung' };
  }
  const basis = { rolle: 'tool_result' as const, tool: bitte.tool, aufrufId: `t${n}`, id: `r${n}-ergebnis` };
  const gesperrt = u.regler.gateway && u.regler.mandat !== undefined && !u.regler.mandat.tools.includes(bitte.tool);
  if (gesperrt) {
    const text = `Abgelehnt vom Gateway: „${bitte.tool}“ steht nicht im Mandat. Quittung q-${n} gespeichert.`;
    return { nachricht: { ...basis, text, tokens: 30, istFehler: true }, trace: { gateway: 'abgelehnt' }, ereignis: `Runde ${n}: Gateway lehnt ${bitte.tool} ab, nicht im Mandat.`, stand: { letzteBitte } };
  }
  const erg = r.ergebnis ?? { text: 'ok', tokens: 5 };
  const zeigtFehler = !!erg.fehler && u.regler.fehlerDurchreichen;
  const roh = zeigtFehler ? `HTTP ${erg.fehler!.status}: ${erg.fehler!.text}` : erg.text;
  const k = kuerze(roh, erg.tokens, u.regler.ergebnisMaxTokens);
  const nachricht: Nachricht = { ...basis, text: k.text, tokens: k.tokens, ...(zeigtFehler ? { istFehler: true } : {}), ...(erg.injektion ? { istInjektion: true } : {}) };
  const ereignis = zeigtFehler
    ? `Runde ${n}: ${bitte.tool} meldet HTTP ${erg.fehler!.status}.`
    : `Runde ${n}: ${bitte.tool} liefert ${tausender(k.tokens)} Tokens${k.gekuerzt ? ' (gekürzt)' : ''}.`;
  return {
    nachricht, ereignis,
    trace: { ...(u.regler.gateway ? { gateway: 'ok' as const } : {}), tool: { name: bitte.tool, tokens: k.tokens, status: zeigtFehler ? 'fehler' : 'ok' } },
    stand: {
      letzteBitte,
      genutzteTools: [...s.genutzteTools, bitte.tool],
      injektionsZiele: erg.injektion ? [...s.injektionsZiele, erg.injektion.zielTool] : s.injektionsZiele,
      injektionAusgefuehrt: s.injektionAusgefuehrt || s.injektionsZiele.includes(bitte.tool),
      fehlerSichtbar: s.fehlerSichtbar || zeigtFehler,
    },
  };
}

function modellNachrichten(n: number, r: SkriptRunde): Nachricht[] {
  const denken: Nachricht = { id: `r${n}-denken`, rolle: 'assistant', text: r.denken.text, tokens: r.denken.tokens };
  if (!r.bitte || r.fertig) return [denken];
  return [denken, { id: `r${n}-bitte`, rolle: 'tool_use', tool: r.bitte.tool, aufrufId: `t${n}`, text: `${r.bitte.tool}(${r.bitte.args})`, tokens: r.bitte.tokens }];
}

function baueSchritt(u: Umgebung, n: number, verlauf: readonly Nachricht[], kosten: RundenKosten, kumuliert: RundenKosten, spans: readonly Span[], ereignis: string): SimSchritt {
  const kontextTokens = summe(bausteine(u.fest, verlauf));
  return { runde: n, nachrichten: [...u.anfang, ...verlauf], kontextTokens, kontextAnteil: kontextTokens / u.regler.kontextLimit, kosten, kumuliert, spans, ereignis };
}

/** Kontext zu groß: der Aufruf scheitert, bevor das Modell rechnet. */
function kontextVoll(u: Umgebung, s: Stand, n: number, input: number): RundenErgebnis {
  const { spans, endeMs } = rundenSpans({ runde: n, startMs: s.uhrMs, modell: { gecacht: 0, neu: 0, output: 0, status: 'fehler' } });
  const alle = [...s.spans, ...spans];
  const ereignis = `Runde ${n}: Kontext voll, ${tausender(input)} von ${tausender(u.regler.kontextLimit)} Tokens. Der Aufruf scheitert.`;
  return { stand: { ...s, uhrMs: endeMs, spans: alle }, schritt: baueSchritt(u, n, s.verlauf, KEINE_KOSTEN, s.kumuliert, alle, ereignis), ende: 'kontext_voll' };
}

/** Eine Runde: Modell aufrufen, ggf. Tool ausführen, Verlauf anhängen, ggf. kompaktieren. */
export function spieleRunde(u: Umgebung, s: Stand, n: number, r: SkriptRunde): RundenErgebnis {
  const jetzt = bausteine(u.fest, s.verlauf);
  const input = summe(jetzt);
  if (input > u.regler.kontextLimit) return kontextVoll(u, s, n, input);
  const praefix = gemeinsamerPraefix(s.vorige, jetzt);
  const modell = modellNachrichten(n, r);
  const output = summe(modell);
  const kosten = rundenKosten({ praefix, neu: input - praefix, output }, u.regler.caching);
  const kumuliert = addiereKosten(s.kumuliert, kosten);
  const tool = modell.length > 1 ? toolTeil(u, s, n, r) : undefined;
  const gecacht = u.regler.caching ? praefix : 0;
  const { spans, endeMs } = rundenSpans({ runde: n, startMs: s.uhrMs, modell: { gecacht, neu: input - gecacht, output, status: 'ok' }, ...tool?.trace });
  const angehaengt = [...s.verlauf, ...modell, ...(tool?.nachricht ? [tool.nachricht] : [])];
  const grenze = u.regler.kompaktierungAb;
  const voll = grenze !== undefined && summe(bausteine(u.fest, angehaengt)) >= grenze * u.regler.kontextLimit;
  const kompakt = voll ? kompaktiere(angehaengt, n) : undefined;
  const verlauf = kompakt ?? angehaengt;
  const ereignis = (tool?.ereignis ?? `Runde ${n}: Antwort ohne Tool-Bitte. Der Lauf ist fertig.`) + (kompakt ? ' Verlauf zusammengefasst.' : '');
  const alle = [...s.spans, ...spans];
  const stand: Stand = { ...s, ...tool?.stand, verlauf, vorige: jetzt, uhrMs: endeMs, spans: alle, kumuliert };
  return { stand, schritt: baueSchritt(u, n, verlauf, kosten, kumuliert, alle, ereignis), ende: tool ? tool.ende : 'fertig' };
}
