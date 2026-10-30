import type { Wahl } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';

const BUCHSTABEN = ['A', 'B', 'C'];

/** Drei Antworten, eine Entscheidung. Falsch Gewähltes bleibt sichtbar, aber ausgegraut. */
export function WahlKarten({ frage, wahlen, ausgeschlossen, onWahl }: {
  frage: string; wahlen: readonly Wahl[]; ausgeschlossen: readonly string[]; onWahl: (id: string) => void;
}) {
  return (
    <fieldset className="wahl">
      <legend className="wahl__frage">{frage}</legend>
      <ul className="wahl__liste">
        {wahlen.map((w, i) => {
          const raus = ausgeschlossen.includes(w.id);
          return (
            <li key={w.id}>
              <button type="button" className={`wahl__knopf${raus ? ' ist-raus' : ''}`} disabled={raus} onClick={() => onWahl(w.id)}>
                <span className="wahl__buchstabe" aria-hidden>{raus ? <Icon name="kreuz" size={14} /> : BUCHSTABEN[i]}</span>
                <span className="wahl__text">{w.text}</span>
                {raus ? <span className="sr-only">(schon ausgeschlossen)</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/** Rückmeldung auf eine Wahl: grün mit Haken oder orange mit Begründung. */
export function Rueckmeldung({ richtig, titel, warum }: { richtig: boolean; titel: string; warum: string }) {
  return (
    <div className={`rueckmeldung rueckmeldung--${richtig ? 'richtig' : 'falsch'}`} role="status">
      <span className="rueckmeldung__icon" aria-hidden><Icon name={richtig ? 'haken' : 'kreuz'} size={18} /></span>
      <div>
        <p className="rueckmeldung__titel">{titel}</p>
        <p>{warum}</p>
      </div>
    </div>
  );
}
