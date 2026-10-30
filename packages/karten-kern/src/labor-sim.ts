import { festerAnfang } from './labor-kontext';
import { spieleRunde, START, type Stand, type Umgebung } from './labor-runde';
import { laufSpan } from './labor-trace';
import { HARTES_LIMIT, type Ende, type HarnessRegler, type Nachricht, type SimLauf, type SimSchritt, type Skript, type SkriptRunde } from './labor-typen';

export { STANDARD_TOOL_TOKENS } from './labor-kontext';

function rundeAusSkript(skript: Skript, n: number): SkriptRunde | undefined {
  return skript.runden[n - 1] ?? skript.schleife;
}

function grenzeErreicht(regler: HarnessRegler, n: number): Ende | undefined {
  if (regler.maxRunden !== null && regler.maxRunden <= HARTES_LIMIT && n > regler.maxRunden) return 'max_runden';
  return n > HARTES_LIMIT ? 'not_aus' : undefined;
}

/** Hängt den Lauf-Span vorn an; erst am Ende steht fest, ob der Lauf grün ist. */
function mitLaufSpan(s: SimSchritt, uhrMs: number, gruen: boolean): SimSchritt {
  return { ...s, spans: [laufSpan(uhrMs, gruen ? 'ok' : 'fehler'), ...s.spans] };
}

/**
 * Spielt ein Skript unter den Harness-Reglern ab. Pur und deterministisch: kein Zufall, keine Uhr,
 * Spandauern kommen aus den Tokens. Endet mit fertig, Limit, vollem Kontext, Wiederholung oder Not-Aus.
 */
export function simuliere(skript: Skript, regler: HarnessRegler): SimLauf {
  const anfang: Nachricht[] = [
    { id: 'system', rolle: 'system', text: skript.system.text, tokens: skript.system.tokens },
    { id: 'user', rolle: 'user', text: skript.user.text, tokens: skript.user.tokens },
  ];
  const u: Umgebung = { regler, fest: festerAnfang(skript, regler.toolAnzahl), anfang };
  let stand: Stand = START;
  let schritte: SimSchritt[] = [];
  let ende: Ende = 'fertig';
  for (let n = 1; ; n += 1) {
    const grenze = grenzeErreicht(regler, n);
    const r = rundeAusSkript(skript, n);
    if (grenze || !r) { ende = grenze ?? 'fertig'; break; }
    const e = spieleRunde(u, stand, n, r);
    stand = e.stand;
    schritte = [...schritte, mitLaufSpan(e.schritt, stand.uhrMs, true)];
    if (e.ende) { ende = e.ende; break; }
  }
  const letzter = schritte[schritte.length - 1];
  const fertigeSchritte = letzter
    ? [...schritte.slice(0, -1), mitLaufSpan({ ...letzter, spans: letzter.spans.slice(1) }, stand.uhrMs, ende === 'fertig')]
    : schritte;
  return {
    schritte: fertigeSchritte, ende,
    injektionAusgefuehrt: stand.injektionAusgefuehrt,
    fehlerSichtbar: stand.fehlerSichtbar,
    genutzteTools: stand.genutzteTools,
  };
}
