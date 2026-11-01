import type { Karte } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

interface Props { karte: Karte; text: string; kernpunkte: readonly string[]; haken: readonly number[]; grund?: string; onHaken: (i: number) => void; onFertig: () => void }

/** Bildschirm 5: ohne Server. Eigener Text, Musterantwort, Erklärhilfe, Kernpunkte zum Abhaken. */
export function Selbstcheck({ karte, text, kernpunkte, haken, grund, onHaken, onFertig }: Props) {
  return (
    <>
      {grund ? <p className="erkl-grund" role="status">{grund}</p> : null}
      <section className="karte erkl-selbst erkl-selbst--eigen" aria-label="Deine Erklärung">
        <p className="ueberzeile">Deine Erklärung</p>
        <p className="erkl-eigen" data-testid="eigener-text">{text}</p>
      </section>
      <section className="karte erkl-selbst" aria-labelledby="erkl-selbst-titel">
        <p className="ueberzeile">Musterantwort</p>
        <h2 id="erkl-selbst-titel" className="sr-only">Vergleich mit der Musterantwort</h2>
        <p>{karte.antwort}</p>
        {karte.erklaerhilfe ? <p className="erkl-selbst__hilfe"><Icon name="funke" size={16} /> {karte.erklaerhilfe}</p> : null}
      </section>
      <fieldset className="karte erkl-check">
        <legend className="erkl-check__titel">Was davon steckt in deiner Erklärung?</legend>
        <ul>
          {kernpunkte.map((k, i) => {
            const an = haken.includes(i);
            return (
              <li key={i}>
                <button type="button" role="checkbox" aria-checked={an} className={`erkl-check__zeile${an ? ' ist-an' : ''}`} onClick={() => onHaken(i)}>
                  <span className="erkl-check__kasten" aria-hidden>{an ? <Icon name="haken" size={16} /> : null}</span>
                  <span>{k}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <Button gross icon="haken" onClick={onFertig} data-testid="selbst-fertig">Fertig: {haken.length} von {kernpunkte.length}</Button>
    </>
  );
}
