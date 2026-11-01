import { useId } from 'react';
import { MAX_ERKLAER_TEXT, MIN_ERKLAER_TEXT, type Karte, type ZielpersonId } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Sprechblase } from './Sprechblase';
import { ANREDE } from './texte';

const ZAEHLER_AB = 1000;

interface Props {
  karte: Karte; zielperson: ZielpersonId; text: string; runde: 1 | 2; nachfrage?: string; coach: boolean;
  onText: (t: string) => void; onAbsenden: () => void; onWechseln: () => void;
}

/** Bildschirm 2: Frage oben, ein großes Feld, ein Hauptknopf. Diktieren über die Mikrofon-Taste der Tastatur. */
export function Schreibfeld({ karte, zielperson, text, runde, nachfrage, coach, onText, onAbsenden, onWechseln }: Props) {
  const id = useId();
  const laenge = text.trim().length;
  const fehlt = Math.max(0, MIN_ERKLAER_TEXT - laenge);
  const aufgabe = runde === 2 ? `Antworte ${ANREDE[zielperson]}` : `Erklär es ${ANREDE[zielperson]}`;
  return (
    <form className="stapelung erkl-schreiben" onSubmit={(e) => { e.preventDefault(); if (!fehlt) onAbsenden(); }}>
      {runde === 2 && nachfrage
        ? <Sprechblase zielperson={zielperson} text={nachfrage} />
        : (
          <section className="karte erkl-frage" aria-label="Begriff">
            <p className="ueberzeile">{karte.thema}</p>
            <h2>{karte.frage}</h2>
          </section>
        )}
      <div className="erkl-feld">
        <div className="erkl-feld__kopf">
          <label htmlFor={id} className="erkl-feld__label">{aufgabe}</label>
          {runde === 1 ? <button type="button" className="knopf knopf--flach erkl-feld__wechsel" onClick={onWechseln}>Andere Person</button> : null}
        </div>
        <textarea id={id} className="erkl-feld__text" value={text} maxLength={MAX_ERKLAER_TEXT} rows={7}
          autoCapitalize="sentences" autoCorrect="on" spellCheck enterKeyHint="done"
          placeholder={runde === 2 ? 'Deine Antwort in zwei, drei Sätzen …' : 'In deinen Worten, so wie du es im Termin sagen würdest …'}
          onChange={(e) => onText(e.target.value)} aria-describedby={`${id}-tipp`} />
        <p id={`${id}-tipp`} className="erkl-feld__fuss">
          <span>Tipp: Mikrofon-Taste der Tastatur zum Diktieren.</span>
          {text.length >= ZAEHLER_AB ? <span className="erkl-feld__zaehler" aria-live="polite">{text.length}/{MAX_ERKLAER_TEXT}</span> : null}
        </p>
      </div>
      <div className="erkl-knoepfe">
        <Button type="submit" gross icon={coach ? 'funke' : 'haken'} disabled={fehlt > 0} data-testid="absenden">
          {coach ? 'Bewerten lassen' : 'Selbst prüfen'}
        </Button>
        <p className="erkl-hinweis" aria-live="polite">
          {fehlt > 0 ? `Noch ${fehlt} Zeichen, dann geht es los.` : coach ? 'Claude gibt dir eine Rückmeldung, kein Urteil.' : 'Ohne Server vergleichst du selbst mit der Musterantwort.'}
        </p>
      </div>
    </form>
  );
}
