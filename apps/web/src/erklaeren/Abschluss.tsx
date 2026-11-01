import { Link } from 'react-router-dom';
import type { ErklaerErgebnis, ErklaerZustand } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { FEHLER, STUFE } from './texte';

/** Fehler: ruhig, mit zwei Auswegen. Ein neuer Lauf startet nur per Klick. */
export function FehlerKarte({ fehler, onSelbst, onErneut }: { fehler: NonNullable<ErklaerZustand['fehler']>; onSelbst: () => void; onErneut: () => void }) {
  const text = FEHLER[fehler.art];
  return (
    <section className="karte erkl-fehler" aria-live="polite" data-testid="fehler">
      <span className="erkl-fehler__icon" aria-hidden><Icon name="sprechen" size={26} /></span>
      <h2>Gerade keine Rückmeldung</h2>
      <p>{text}</p>
      {fehler.art === 'eingabe' ? <p className="erkl-fehler__detail">{fehler.meldung}</p> : null}
      <p>Dein Text ist nicht verloren.</p>
      <div className="erkl-knoepfe">
        <Button gross icon="haken" onClick={onSelbst}>Selbst prüfen</Button>
        <Button variante="tint" icon="nochmal" onClick={onErneut}>Nochmal versuchen</Button>
      </div>
    </section>
  );
}

/** Fertig: kurz bestätigen, dann weiter oder nochmal. */
export function FertigKarte({ ergebnis, naechste, onNeu }: { ergebnis: ErklaerErgebnis; naechste?: string; onNeu: () => void }) {
  const s = STUFE[ergebnis.stufe];
  return (
    <>
      <section className="karte fallfertig" data-testid="erkl-fertig">
        <span className="leer__icon" aria-hidden><Icon name="haken" size={34} /></span>
        <h2>Gespeichert</h2>
        <p>{ergebnis.modus === 'coach' ? `${s.titel} · ${ergebnis.punkte}/${ergebnis.max} Punkte` : `Selbstcheck · ${ergebnis.punkte} von ${ergebnis.max} Kernpunkten`}</p>
      </section>
      <div className="fallknoepfe">
        {naechste ? <Link className="knopf knopf--primaer knopf--gross" to={`/erklaeren/${naechste}`}>Nächster Begriff</Link> : null}
        <Button variante="tint" icon="nochmal" onClick={onNeu}>Nochmal erklären</Button>
        <Link className="knopf knopf--flach" to="/">Zu Heute</Link>
      </div>
    </>
  );
}
