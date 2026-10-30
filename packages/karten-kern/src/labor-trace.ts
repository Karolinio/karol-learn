import type { Span, SpanStatus } from './labor-typen';

// Dauer aus Tokens, damit der Wasserfall ohne Uhr deterministisch bleibt.
// Grobe Verhältnisse wie bei echten Modellen: Lesen ist schnell, Schreiben langsam, Gecachtes noch schneller.
const MODELL_GRUND_MS = 300;
const NEUE_TOKENS_JE_MS = 40;
const GECACHTE_TOKENS_JE_MS = 400;
const MS_JE_OUTPUT_TOKEN = 15;
const TOOL_GRUND_MS = 150;
const TOOL_TOKENS_JE_MS = 50;
export const GATEWAY_MS = 12;

export function modellDauer(gecacht: number, neu: number, output: number): number {
  return Math.round(MODELL_GRUND_MS + neu / NEUE_TOKENS_JE_MS + gecacht / GECACHTE_TOKENS_JE_MS + output * MS_JE_OUTPUT_TOKEN);
}

export function toolDauer(tokens: number): number {
  return Math.round(TOOL_GRUND_MS + tokens / TOOL_TOKENS_JE_MS);
}

export interface RundenTrace {
  runde: number;
  startMs: number;
  modell: { gecacht: number; neu: number; output: number; status: SpanStatus };
  gateway?: SpanStatus;
  tool?: { name: string; tokens: number; status: SpanStatus };
}

function rundenStatus(kinder: readonly Span[]): SpanStatus {
  if (kinder.some((s) => s.status === 'abgelehnt')) return 'abgelehnt';
  return kinder.some((s) => s.status === 'fehler') ? 'fehler' : 'ok';
}

/** Spans einer Runde: Runde → Modell → (Gateway) → (Tool), lückenlos hintereinander. */
export function rundenSpans(t: RundenTrace): { spans: Span[]; endeMs: number } {
  const id = `r${t.runde}`;
  const m = t.modell;
  const modellMs = m.status === 'fehler' ? MODELL_GRUND_MS / 3 : modellDauer(m.gecacht, m.neu, m.output);
  const modell: Span = { id: `${id}-modell`, eltern: id, art: 'modell', name: 'Modell', startMs: t.startMs, dauerMs: modellMs, status: m.status };
  const gateway: Span | undefined = t.gateway
    ? { id: `${id}-gateway`, eltern: id, art: 'gateway', name: 'Gateway', startMs: t.startMs + modellMs, dauerMs: GATEWAY_MS, status: t.gateway }
    : undefined;
  const toolStart = (gateway ? gateway.startMs + gateway.dauerMs : t.startMs + modellMs);
  const tool: Span | undefined = t.tool
    ? { id: `${id}-tool`, eltern: id, art: 'tool', name: t.tool.name, startMs: toolStart, dauerMs: toolDauer(t.tool.tokens), status: t.tool.status }
    : undefined;
  const kinder = [modell, gateway, tool].filter((s): s is Span => !!s);
  const letzter = kinder[kinder.length - 1]!;
  const endeMs = letzter.startMs + letzter.dauerMs;
  const runde: Span = { id, eltern: 'lauf', art: 'runde', name: `Runde ${t.runde}`, startMs: t.startMs, dauerMs: endeMs - t.startMs, status: rundenStatus(kinder) };
  return { spans: [runde, ...kinder], endeMs };
}

/** Wurzel des Traces: umfasst alle Runden. */
export function laufSpan(endeMs: number, status: SpanStatus): Span {
  return { id: 'lauf', art: 'lauf', name: 'Lauf', startMs: 0, dauerMs: endeMs, status };
}
