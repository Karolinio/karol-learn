import { useReducedMotion } from 'framer-motion';
import { useId, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { KANTEN, KNOTEN, SCHRITTE, type KnotenId } from './agent-loop-daten';
import { SkizzenRahmen } from './SkizzenRahmen';
import type { Skizze } from './typen';

const AKTIVE_KANTEN: Partial<Record<KnotenId, string[]>> = {
  modell: ['k-m'], fertig: ['m-f'], gateway: ['m-g'], tool: ['g-t', 'm-t'], ergebnis: ['t-e'], schleife: ['e-k', 'k-m', 'm-g', 'm-t', 'g-t', 't-e'],
};

function AgentLoop() {
  const ruhig = useReducedMotion();
  const marke = `al${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [gateway, setGateway] = useState(true);
  const schritte = SCHRITTE.filter((s) => gateway || !s.nurMitGateway);
  const [index, setIndex] = useState(0);
  const i = Math.min(index, schritte.length - 1);
  const aktiv = schritte[i]!.knoten;
  const kanten = KANTEN.filter((k) => (gateway ? !k.ohneGateway : !k.nurMitGateway));
  const heiss = new Set(AKTIVE_KANTEN[aktiv] ?? []);

  const springe = (k: KnotenId) => { const n = schritte.findIndex((s) => s.knoten === k); if (n >= 0) setIndex(n); };
  const tasteKnoten = (k: KnotenId) => (e: ReactKeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); springe(k); } };

  const umgebung = (id: 'runtime' | 'harness', x: number, y: number, b: number, h: number, name: string) => (
    <g className={`skizze__rahmen skizze__rahmen--${id}${aktiv === id ? ' ist-aktiv' : ''}`} role="button" tabIndex={0}
      aria-label={name} onClick={() => springe(id)} onKeyDown={tasteKnoten(id)}>
      <rect x={x} y={y} width={b} height={h} rx={id === 'runtime' ? 26 : 20} />
      <text x={x + 16} y={y + 26}>{name}</text>
    </g>
  );

  const bild = (
    <svg viewBox="0 0 360 430" className="skizze__svg">
      <defs>
        {(['kalt', 'heiss'] as const).map((art) => (
          <marker key={art} id={`${marke}-${art}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 9 5 1 9" className={`skizze__pfeilspitze${art === 'heiss' ? ' ist-heiss' : ''}`} />
          </marker>
        ))}
      </defs>
      {umgebung('runtime', 10, 116, 340, 306, 'Runtime')}
      {umgebung('harness', 30, 160, 300, 248, 'Harness')}
      {kanten.map((k) => (
        <path key={k.id} d={k.d} className={`skizze__kante${heiss.has(k.id) ? ' ist-heiss' : ''}`} markerEnd={`url(#${marke}-${heiss.has(k.id) ? 'heiss' : 'kalt'})`} />
      ))}
      {(Object.keys(KNOTEN) as (keyof typeof KNOTEN)[]).filter((k) => gateway || k !== 'gateway').map((k) => {
        const n = KNOTEN[k];
        const ist = aktiv === k || (aktiv === 'schleife' && k !== 'fertig');
        return (
          <g key={k} className={`skizze__knoten skizze__knoten--${k}${ist ? ' ist-aktiv' : ''}`} role="button" tabIndex={0}
            aria-label={n.name} aria-current={aktiv === k ? 'step' : undefined} onClick={() => springe(k)} onKeyDown={tasteKnoten(k)}>
            <g transform={`translate(${n.x} ${n.y})`}>
              {aktiv === k && !ruhig ? <circle r="40" className="skizze__puls" /> : null}
              <rect x="-46" y="-26" width="92" height="52" rx="16" />
              <text y="5">{n.name}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );

  return (
    <SkizzenRahmen track="aie" label="Diagramm Agent-Loop" schritte={schritte} index={i} onIndex={setIndex} bild={bild} extra={
      <label className="schalter karte">
        <span><strong>Gateway-Zweig</strong><small>Prüfung zwischen Tool-Bitte und Ausführung</small></span>
        <input type="checkbox" role="switch" checked={gateway} onChange={(e) => setGateway(e.target.checked)} />
        <span className="schalter__bahn" aria-hidden><span /></span>
      </label>
    } />
  );
}

export const agentLoop: Skizze = {
  id: 'agent-loop',
  titel: 'Agent-Loop',
  track: 'aie',
  themen: ['Agent', 'Tool-Schleife', 'Harness'],
  kurztext: 'Wie ein Agent arbeitet: Kontext, Modell, Tool, Ergebnis, von vorn.',
  schritte: SCHRITTE.map((s) => ({ titel: s.titel, text: s.text, karte: s.karte, fokus: [s.knoten] })),
  Komponente: AgentLoop,
};
