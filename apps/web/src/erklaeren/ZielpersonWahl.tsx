import { zielpersonenFuer, type Karte, type ZielpersonId } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';
import { KUERZEL } from './texte';

/** Bildschirm 1: Wem erklärst du es? Eine große Karte je Zielperson des Tracks. */
export function ZielpersonWahl({ karte, gewaehlt, onWahl }: { karte: Karte; gewaehlt?: ZielpersonId; onWahl: (id: ZielpersonId) => void }) {
  return (
    <>
      <section className="karte erkl-frage" aria-label="Begriff">
        <p className="ueberzeile">{karte.thema}</p>
        <h2>{karte.frage}</h2>
      </section>
      <fieldset className="wahl">
        <legend className="wahl__frage">Wem erklärst du es?</legend>
        <ul className="wahl__liste">
          {zielpersonenFuer(karte.track).map((z) => (
            <li key={z.id}>
              <button type="button" className={`wahl__knopf erkl-person${gewaehlt === z.id ? ' ist-gewaehlt' : ''}`} onClick={() => onWahl(z.id)}
                data-testid={`zielperson-${z.id}`}>
                <span className="erkl-avatar" aria-hidden>{KUERZEL[z.id]}</span>
                <span className="wahl__text erkl-person__text">
                  <strong>{z.titel}</strong>
                  <small>will wissen: {z.sorgt}</small>
                </span>
                <Icon name="weiter" size={18} className="erkl-person__pfeil" />
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    </>
  );
}
