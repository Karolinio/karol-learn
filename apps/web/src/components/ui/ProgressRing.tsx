import { useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export function ProgressRing({ anteil, groesse = 120, staerke = 12, farbe = 'var(--akzent)', zweiter, kind, label }: {
  anteil: number; groesse?: number; staerke?: number; farbe?: string;
  zweiter?: { anteil: number; farbe: string }; kind?: ReactNode; label: string;
}) {
  const ruhig = useReducedMotion();
  const r = (groesse - staerke) / 2;
  const umfang = 2 * Math.PI * r;
  const bogen = (a: number) => umfang * (1 - Math.min(Math.max(a, 0), 1));
  const kreis = (a: number, f: string, schluessel: string) => (
    <circle key={schluessel} className={ruhig ? '' : 'ring__bogen'} cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke={f}
      strokeWidth={staerke} strokeLinecap="round" strokeDasharray={umfang} strokeDashoffset={bogen(a)} />
  );
  return (
    <div className="ring" style={{ width: groesse, height: groesse }} role="img" aria-label={label}>
      <svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke="var(--color-fill)" strokeWidth={staerke} />
        {zweiter ? kreis(Math.min(1, anteil + zweiter.anteil), zweiter.farbe, 'b') : null}
        {kreis(anteil, farbe, 'a')}
      </svg>
      {kind ? <div className="ring__mitte">{kind}</div> : null}
    </div>
  );
}
