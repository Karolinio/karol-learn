import type { Span } from '@karol-learn/karten-kern';

const TIEFE: Record<Span['art'], number> = { lauf: 0, runde: 1, modell: 2, gateway: 2, tool: 2 };
const STATUS_TEXT: Record<Span['status'], string> = { ok: 'ok', fehler: 'Fehler', abgelehnt: 'abgelehnt' };

function dauer(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${Math.round(ms)} ms`;
}

/** Trace als Wasserfall: jede Zeile ein Span, der Balken zeigt Start und Dauer im ganzen Lauf. */
export function TraceLeiste({ spans, titel }: { spans: readonly Span[]; titel?: string }) {
  const gesamt = Math.max(1, ...spans.map((s) => s.startMs + s.dauerMs));
  return (
    <figure className="trace">
      {titel ? <figcaption className="abschnitt">{titel}</figcaption> : null}
      <ol className="trace__liste">
        {spans.map((s) => (
          <li key={s.id} className={`trace__zeile trace__zeile--${s.art} ist-${s.status}`} style={{ ['--tiefe' as string]: TIEFE[s.art] }}>
            <span className="trace__name">{s.name}</span>
            <span className="trace__bahn" aria-hidden>
              <span className="trace__balken" style={{ left: `${(s.startMs / gesamt) * 100}%`, width: `max(3px, ${(s.dauerMs / gesamt) * 100}%)` }} />
            </span>
            <span className="trace__wert">{dauer(s.dauerMs)}<span className="sr-only">, Status {STATUS_TEXT[s.status]}</span></span>
            {s.status !== 'ok' ? <span className="trace__status">{STATUS_TEXT[s.status]}</span> : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
