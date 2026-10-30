import type { SimLauf } from '@karol-learn/karten-kern';
import { ENDE_TEXT, endeTon, laufZahlen, tokens, usd } from './format';

function aenderung(vorher: number, nachher: number): string | undefined {
  if (!vorher || vorher === nachher) return undefined;
  const p = Math.round(((nachher - vorher) / vorher) * 100);
  return `${p > 0 ? '+' : '−'}${Math.abs(p)} %`;
}

/** Vorher/Nachher als klare Zahlenpaare: Ende, Runden, größter Kontext, Kosten. */
export function Vergleich({ vorher, nachher, titel = ['Vorher', 'Nachher'], erfuellt, wirkungslos }: {
  vorher: SimLauf; nachher: SimLauf; titel?: [string, string];
  /** Nur dann sind Änderungen grün: das Ziel des Störfalls ist erreicht. */
  erfuellt: boolean;
  /** Der Fix ändert am Lauf nichts: statt gleicher Zahlen ein klarer Satz. */
  wirkungslos?: boolean;
}) {
  const a = laufZahlen(vorher);
  const b = laufZahlen(nachher);
  const zeilen = [
    { name: 'Runden', a: String(a.runden), b: String(b.runden), d: aenderung(a.runden, b.runden) },
    { name: 'Größter Kontext', a: tokens(a.kontextMax), b: tokens(b.kontextMax), d: aenderung(a.kontextMax, b.kontextMax) },
    { name: 'Kosten', a: usd(a.usd), b: usd(b.usd), d: aenderung(a.usd, b.usd) },
  ];
  if (wirkungslos) {
    return (
      <section className="vergleich karte" aria-label="Vergleich vorher und nachher" data-testid="vergleich">
        <p className="vergleich__wirkungslos">Diese Änderung wirkt auf diesen Lauf nicht.</p>
        <p className="vergleich__fuss">Ende: {ENDE_TEXT[a.ende]}, {a.runden} Runden, {usd(a.usd)}. Alles bleibt wie vorher.</p>
      </section>
    );
  }
  return (
    <section className={`vergleich karte${erfuellt ? ' ist-erfuellt' : ''}`} aria-label="Vergleich vorher und nachher" data-testid="vergleich">
      <div className="vergleich__kopf">
        <span />
        <span className="vergleich__spalte">{titel[0]}</span>
        <span className="vergleich__spalte">{titel[1]}</span>
      </div>
      <div className="vergleich__zeile vergleich__zeile--ende">
        <span className="vergleich__name">Ende</span>
        <span className={`vergleich__ende ton-${endeTon(a.ende)}`}>{ENDE_TEXT[a.ende]}</span>
        <span className={`vergleich__ende ton-${endeTon(b.ende)}`}>{ENDE_TEXT[b.ende]}</span>
      </div>
      {zeilen.map((z) => (
        <div key={z.name} className="vergleich__zeile">
          <span className="vergleich__name">{z.name}</span>
          <span className="vergleich__wert vergleich__wert--alt">{z.a}</span>
          <span className="vergleich__wert">{z.b}{z.d ? <small>{z.d}</small> : null}</span>
        </div>
      ))}
      <p className="vergleich__fuss">Beispielpreise, keine echten Anbieterpreise. Achte auf die Verhältnisse.</p>
    </section>
  );
}
