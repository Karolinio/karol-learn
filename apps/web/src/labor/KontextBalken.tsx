import { tausender } from '@karol-learn/karten-kern';

const WARN_AB = 0.7;
const ROT_AB = 0.9;

/** Wie voll das Kontextfenster ist. Der Balken wächst über scaleX, nie über die Breite. */
export function KontextBalken({ tokens, limit }: { tokens: number; limit: number }) {
  const anteil = limit ? tokens / limit : 0;
  const ton = anteil >= ROT_AB ? 'rot' : anteil >= WARN_AB ? 'orange' : 'gruen';
  const prozent = Math.round(anteil * 100);
  return (
    <div className="kbalken">
      <div className="kbalken__kopf">
        <span className="kbalken__titel">Kontext</span>
        <span className="kbalken__zahl">{tausender(tokens)} / {tausender(limit)} <small>{prozent} %</small></span>
      </div>
      <div className="kbalken__spur" role="meter" aria-label="Kontextfenster belegt" aria-valuemin={0} aria-valuemax={limit}
        aria-valuenow={Math.min(tokens, limit)} aria-valuetext={`${prozent} Prozent belegt`}>
        <span className={`kbalken__fuellung kbalken__fuellung--${ton}`} style={{ transform: `scaleX(${Math.min(anteil, 1)})` }} />
      </div>
    </div>
  );
}
