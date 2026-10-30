import { useState, type ReactNode } from 'react';
import type { SimLauf } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { KostenTafel } from './KostenTafel';
import { NachrichtenListe } from './NachrichtenListe';
import { TraceLeiste } from './TraceLeiste';
import type { Abspielen } from './useAbspielen';

/** Ein Lauf zum Mitlesen: Kopf mit Kontext und Kosten (sticky), Verlauf, Steuerung, Trace im Sheet. */
export function LaufAnsicht({ lauf, limit, abspielen, extra, mitKosten = true }: {
  lauf: SimLauf; limit: number; abspielen: Abspielen; extra?: ReactNode; mitKosten?: boolean;
}) {
  const [traceOffen, setTraceOffen] = useState(false);
  const schritt = lauf.schritte[abspielen.index];
  const a = abspielen;
  return (
    <div className="laufansicht">
      <KostenTafel schritt={schritt} limit={limit} gesamt={lauf.schritte.length} mitKosten={mitKosten} />
      <NachrichtenListe nachrichten={schritt?.nachrichten ?? []} />
      <div className="laborsteuerung" data-testid="labor-steuerung">
        {a.spielt
          ? <Button variante="tint" icon="pause" onClick={a.pausiere} aria-label="Pause">Pause</Button>
          : <Button variante="tint" icon="abspielen" onClick={a.spiele} aria-label="Abspielen">{a.amEnde ? 'Nochmal' : 'Abspielen'}</Button>}
        <Button variante="tint" onClick={a.weiter} disabled={a.amEnde} aria-label="Nächste Runde">+1 Runde</Button>
        <Button variante="tint" onClick={a.zumEnde} disabled={a.amEnde} aria-label="Ans Ende">Ans Ende</Button>
        <Button variante="flach" icon="balken" onClick={() => setTraceOffen(true)} aria-label="Trace öffnen">Trace</Button>
      </div>
      {extra}
      <Sheet offen={traceOffen} onZu={() => setTraceOffen(false)} titel="Trace" kinder={
        <TraceLeiste spans={schritt?.spans ?? []} />
      } />
    </div>
  );
}
