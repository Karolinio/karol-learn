import type { SimSchritt } from '@karol-learn/karten-kern';
import { KontextBalken } from './KontextBalken';
import { usd } from './format';

/** Kopfleiste des Labors: bleibt beim Scrollen oben. Kontext links, Kosten und Runde rechts, eine Zeile Ereignis. */
export function KostenTafel({ schritt, limit, gesamt, mitKosten = true }: { schritt?: SimSchritt; limit: number; gesamt: number; mitKosten?: boolean }) {
  const kosten = schritt?.kumuliert.usd ?? 0;
  return (
    <section className="labortafel" aria-label="Laufstand">
      <div className="labortafel__zeile">
        <KontextBalken tokens={schritt?.kontextTokens ?? 0} limit={limit} />
        <div className="labortafel__kosten">
          {mitKosten ? <span className="labortafel__betrag" data-testid="kosten-jetzt">{usd(kosten)}</span> : null}
          <small>Runde {schritt?.runde ?? 0} von {gesamt}</small>
        </div>
      </div>
      <p className="labortafel__ereignis" aria-live="polite">{schritt?.ereignis ?? 'Noch nicht gestartet.'}</p>
    </section>
  );
}
