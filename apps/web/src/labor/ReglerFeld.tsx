import type { HarnessRegler } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';
import { tokens } from './format';

const RUNDEN = [null, 2, 3, 4, 5, 6, 8, 10] as const;
const FENSTER = [8000, 16000, 32000, 64000, 128000] as const;
const KUERZEN_AUF = 4000;
const KOMPAKT_AB = 0.7;
const GLEICHE_MAX = 1;

/** Zahl mit − und +, Knöpfe 44 px, per Tastatur bedienbar. */
function Stepper<T>({ name, hilfe, werte, wert, text, onWert }: {
  name: string; hilfe: string; werte: readonly T[]; wert: T; text: (w: T) => string; onWert: (w: T) => void;
}) {
  const i = Math.max(0, werte.indexOf(wert));
  return (
    <div className="regler">
      <span className="regler__text"><strong>{name}</strong><small>{hilfe}</small></span>
      <div className="stepper" role="group" aria-label={name}>
        <button type="button" className="stepper__knopf" aria-label={`${name} weniger`} disabled={i === 0} onClick={() => onWert(werte[i - 1]!)}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 7h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
        <output className="stepper__wert" aria-live="polite">{text(wert)}</output>
        <button type="button" className="stepper__knopf" aria-label={`${name} mehr`} disabled={i === werte.length - 1} onClick={() => onWert(werte[i + 1]!)}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function Schalter({ name, hilfe, an, onAn }: { name: string; hilfe: string; an: boolean; onAn: (an: boolean) => void }) {
  return (
    <label className="schalter regler regler--schalter">
      <span><strong>{name}</strong><small>{hilfe}</small></span>
      <input type="checkbox" role="switch" checked={an} onChange={(e) => onAn(e.target.checked)} />
      <span className="schalter__bahn" aria-hidden><span /></span>
    </label>
  );
}

/** Alle Harness-Regler. Jede Änderung baut einen neuen Regler-Wert, nichts wird verändert. */
export function ReglerFeld({ regler, onRegler, onZurueck }: { regler: HarnessRegler; onRegler: (r: HarnessRegler) => void; onZurueck: () => void }) {
  const setze = (teil: Partial<HarnessRegler>) => onRegler({ ...regler, ...teil });
  const zahlen: readonly number[] = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="reglerfeld">
      <div className="reglerfeld__gruppe karte">
        <Stepper name="Tools angeboten" hilfe="Jede Beschreibung kostet in jeder Runde Tokens." werte={zahlen} wert={regler.toolAnzahl} text={String} onWert={(toolAnzahl) => setze({ toolAnzahl })} />
        <Stepper name="Rundenlimit" hilfe="Wie viele Runden der Harness höchstens erlaubt." werte={RUNDEN} wert={regler.maxRunden as (typeof RUNDEN)[number]} text={(w) => (w === null ? 'aus' : String(w))} onWert={(maxRunden) => setze({ maxRunden })} />
        <Stepper name="Kontextfenster" hilfe="Was nicht hineinpasst, lässt den Aufruf scheitern." werte={FENSTER} wert={regler.kontextLimit as (typeof FENSTER)[number]} text={tokens} onWert={(kontextLimit) => setze({ kontextLimit })} />
      </div>
      <div className="reglerfeld__gruppe karte">
        <Schalter name="Prompt Caching" hilfe="Gleicher Anfang kostet ab Runde 2 nur ein Zehntel." an={regler.caching} onAn={(caching) => setze({ caching })} />
        <Schalter name="Ergebnisse kürzen" hilfe={`Tool-Ergebnisse höchstens ${tokens(KUERZEN_AUF)} Tokens.`} an={regler.ergebnisMaxTokens !== undefined} onAn={(an) => setze({ ergebnisMaxTokens: an ? KUERZEN_AUF : undefined })} />
        <Schalter name="Kompaktierung" hilfe="Ab 70 % fasst der Harness Altes zusammen." an={regler.kompaktierungAb !== undefined} onAn={(an) => setze({ kompaktierungAb: an ? KOMPAKT_AB : undefined })} />
        <Schalter name="Wiederholung stoppen" hilfe="Gleiche Tool-Bitte zweimal hintereinander: Stopp." an={regler.gleicheBitteMax !== undefined} onAn={(an) => setze({ gleicheBitteMax: an ? GLEICHE_MAX : undefined })} />
        <Schalter name="Fehler durchreichen" hilfe="HTTP-Fehler kommen ins Ergebnis und in den Trace." an={regler.fehlerDurchreichen} onAn={(fehlerDurchreichen) => setze({ fehlerDurchreichen })} />
        <Schalter name="Gateway mit Mandat" hilfe={`Erlaubt nur: ${regler.mandat?.tools.join(', ') ?? 'alles'}.`} an={regler.gateway} onAn={(gateway) => setze({ gateway })} />
      </div>
      <button type="button" className="knopf knopf--flach reglerfeld__zurueck" onClick={onZurueck}><Icon name="nochmal" size={18} /> Regler zurücksetzen</button>
    </div>
  );
}
