import type { ReactNode } from 'react';
import { KRITERIEN, MAX_ERKLAER_PUNKTE, type ErklaerBewertung, type ErklaerStufe, type ZielpersonId } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Sprechblase } from './Sprechblase';
import { KRITERIUM, STUFE } from './texte';

const RING_FARBE: Readonly<Record<ErklaerStufe, string>> = { kundenreif: 'var(--color-green)', fast: 'var(--color-orange)', nochmal: 'var(--akzent)' };

interface Props {
  bewertung: ErklaerBewertung; urteil: { punkte: number; stufe: ErklaerStufe }; runde: 1 | 2; zielperson: ZielpersonId;
  kernpunkte: readonly string[]; letzteFassung?: string; onAntworten: () => void; onFertig: () => void;
}

function Punkte({ wert }: { wert: number }) {
  return (
    <span className="erkl-punkte" role="img" aria-label={`${wert} von 3 Punkten`}>
      {[0, 1, 2].map((i) => <span key={i} className={i < wert ? 'ist-voll' : ''} />)}
    </span>
  );
}

function Aufklapp({ titel, zahl, kinder, testid }: { titel: string; zahl?: number; kinder: ReactNode; testid?: string }) {
  return (
    <details className="erkl-details" data-testid={testid}>
      <summary><span>{titel}</span>{zahl !== undefined ? <span className="erkl-details__zahl">{zahl}</span> : null}</summary>
      <div className="erkl-details__inhalt">{kinder}</div>
    </details>
  );
}

/** Details: alles Modell-Output, nur als Text gerendert. */
function Details({ bewertung: b, kernpunkte, letzteFassung }: Pick<Props, 'bewertung' | 'kernpunkte' | 'letzteFassung'>) {
  const fehlend = b.fehlendeKernpunkte.map((i) => kernpunkte[i]).filter((k): k is string => !!k);
  return (
    <div className="karte erkl-detailliste">
      <Aufklapp titel="Vier Kriterien" testid="details-kriterien" kinder={
        <ul className="erkl-kriterien">
          {KRITERIEN.map((k) => (
            <li key={k}>
              <div className="erkl-kriterien__kopf"><strong>{KRITERIUM[k]}</strong><Punkte wert={b.kriterien[k].punkte} /></div>
              <p>{b.kriterien[k].satz}</p>
            </li>
          ))}
        </ul>
      } />
      {b.falscheAussagen.length ? (
        <Aufklapp titel="Falsche Aussagen" zahl={b.falscheAussagen.length} kinder={
          <ul className="erkl-falsch">
            {b.falscheAussagen.map((f, i) => (
              <li key={i}><q>{f.zitat}</q><p>{f.korrektur}</p></li>
            ))}
          </ul>
        } />
      ) : null}
      {fehlend.length ? (
        <Aufklapp titel="Fehlende Kernpunkte" zahl={fehlend.length} kinder={
          <ul className="erkl-kernliste">{fehlend.map((k) => <li key={k}>{k}</li>)}</ul>
        } />
      ) : null}
      <Aufklapp titel="Besser gesagt" kinder={<blockquote className="erkl-besser"><p>{b.besserSatz}</p></blockquote>} />
      {letzteFassung ? (
        <Aufklapp titel="Deine letzte Fassung" kinder={<p className="erkl-eigen">{letzteFassung}</p>} />
      ) : null}
    </div>
  );
}

/** Bildschirm 4: erst das Urteil, dann die Nachfrage, Details zum Aufklappen. */
export function Ergebnis(p: Props) {
  const s = STUFE[p.urteil.stufe];
  const nachfrage = p.runde === 1 ? p.bewertung.nachfrage : '';
  return (
    <>
      <section className={`karte erkl-urteil erkl-urteil--${p.urteil.stufe}`} aria-labelledby="erkl-stufe" data-testid="urteil">
        <ProgressRing anteil={p.urteil.punkte / MAX_ERKLAER_PUNKTE} groesse={84} staerke={9} farbe={RING_FARBE[p.urteil.stufe]}
          label={`${p.urteil.punkte} von ${MAX_ERKLAER_PUNKTE} Punkten`}
          kind={<span className="ring__zahl">{p.urteil.punkte}<small>/{MAX_ERKLAER_PUNKTE}</small></span>} />
        <div className="erkl-urteil__text">
          {p.runde === 2 ? <p className="ueberzeile">Runde 2</p> : null}
          <h2 id="erkl-stufe">{s.titel}</h2>
          <p className="erkl-urteil__satz">{p.bewertung.urteil}</p>
        </div>
      </section>
      {nachfrage ? (
        <Sprechblase zielperson={p.zielperson} text={nachfrage} kinder={
          <div className="erkl-blase__knoepfe">
            <Button gross icon="sprechen" onClick={p.onAntworten}>Antworten</Button>
            <Button variante="flach" onClick={p.onFertig}>Fertig ohne Antwort</Button>
          </div>
        } />
      ) : (
        <Button gross icon="haken" onClick={p.onFertig}>Fertig</Button>
      )}
      <p className="erkl-hinweis">{s.unter}</p>
      <Details bewertung={p.bewertung} kernpunkte={p.kernpunkte} letzteFassung={p.letzteFassung} />
    </>
  );
}
