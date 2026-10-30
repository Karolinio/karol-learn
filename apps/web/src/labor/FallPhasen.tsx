import { useState } from 'react';
import { Link } from 'react-router-dom';
import { erfuelltBeweis, type SimLauf, type StoerfallEreignis, type StoerfallZustand } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Sheet } from '../components/ui/Sheet';
import { heute } from '../lib/datum';
import { useInhalt } from '../lib/zustand';
import { findeSkizze } from '../skizzen/registry';
import { KostenTafel } from './KostenTafel';
import { LaufAnsicht } from './LaufAnsicht';
import { NachrichtenListe } from './NachrichtenListe';
import { TraceLeiste } from './TraceLeiste';
import { useAbspielen } from './useAbspielen';
import { Vergleich } from './Vergleich';
import { Rueckmeldung, WahlKarten } from './WahlKarten';

type Senden = (e: StoerfallEreignis) => void;
interface PhaseProps { z: StoerfallZustand; senden: Senden }

const SCHRITTE = ['Symptom', 'Ursache', 'Reparatur', 'Vergleich'] as const;
const PHASE_INDEX = { symptom: 0, ursache: 1, reparatur: 2, vergleich: 3, fertig: 4 } as const;

export function Fallschritte({ z }: { z: StoerfallZustand }) {
  const jetzt = PHASE_INDEX[z.phase];
  return (
    <ol className="fallschritte" aria-label="Fortschritt im Störfall">
      {SCHRITTE.map((s, i) => (
        <li key={s} className={i < jetzt ? 'ist-erledigt' : i === jetzt ? 'ist-jetzt' : ''} aria-current={i === jetzt ? 'step' : undefined}>{s}</li>
      ))}
    </ol>
  );
}

/** Endstand eines Laufs mit Trace und Verlauf im Sheet: zum Nachsehen, ohne neu abzuspielen. */
function LaufKurz({ lauf, limit, titel }: { lauf: SimLauf; limit: number; titel: string }) {
  const [offen, setOffen] = useState(false);
  const letzter = lauf.schritte[lauf.schritte.length - 1];
  return (
    <>
      <KostenTafel schritt={letzter} limit={limit} gesamt={lauf.schritte.length} />
      <Button variante="flach" icon="balken" onClick={() => setOffen(true)}>{titel}</Button>
      <Sheet offen={offen} onZu={() => setOffen(false)} titel={titel} gross kinder={
        <div className="stapelung">
          <TraceLeiste spans={letzter?.spans ?? []} titel="Trace" />
          <h3 className="abschnitt">Verlauf am Ende</h3>
          <NachrichtenListe nachrichten={letzter?.nachrichten ?? []} />
        </div>
      } />
    </>
  );
}

export function SymptomPhase({ z, senden }: PhaseProps) {
  const abspielen = useAbspielen(z.kaputt.schritte.length);
  return (
    <>
      <section className="karte symptom" aria-labelledby="symptom-titel">
        <p className="ueberzeile">Das Symptom</p>
        <h2 id="symptom-titel">Was passiert?</h2>
        <p>{z.szenario.symptom}</p>
      </section>
      <LaufAnsicht lauf={z.kaputt} limit={z.szenario.regler.kontextLimit} abspielen={abspielen} extra={
        abspielen.amEnde ? <Button gross icon="weiter" onClick={() => senden({ typ: 'ABGESPIELT' })}>Zur Ursache</Button> : null
      } />
    </>
  );
}

export function UrsachePhase({ z, senden }: PhaseProps) {
  const r = z.rueckmeldung;
  return (
    <>
      <LaufKurz lauf={z.kaputt} limit={z.szenario.regler.kontextLimit} titel="Kaputten Lauf ansehen" />
      <WahlKarten frage="Was ist die Ursache?" wahlen={z.szenario.ursachen} ausgeschlossen={z.ausgeschlossen} onWahl={(id) => senden({ typ: 'WAEHLE_URSACHE', id })} />
      {r && !r.richtig ? <Rueckmeldung richtig={false} titel="Nicht ganz" warum={r.warum} /> : null}
    </>
  );
}

export function ReparaturPhase({ z, senden }: PhaseProps) {
  const r = z.rueckmeldung;
  return (
    <>
      {r?.richtig ? <Rueckmeldung richtig titel="Richtig erkannt" warum={r.warum} /> : null}
      <WahlKarten frage="Wie reparierst du es?" wahlen={z.szenario.reparaturen} ausgeschlossen={z.ausgeschlossen} onWahl={(id) => senden({ typ: 'WAEHLE_REPARATUR', id })} />
      {r && !r.richtig && z.falscherLauf ? (
        <>
          <Rueckmeldung richtig={false} titel="Symptom bleibt" warum={r.warum} />
          <Vergleich vorher={z.kaputt} nachher={z.falscherLauf} titel={['Vorher', 'Mit diesem Fix']}
            erfuellt={erfuelltBeweis(z.falscherLauf, z.szenario.beweis)}
            wirkungslos={z.szenario.reparaturen.find((w) => w.id === r.wahlId)?.wirkungslos} />
        </>
      ) : null}
    </>
  );
}

export function VergleichPhase({ z, senden }: PhaseProps) {
  const r = z.rueckmeldung;
  if (!z.repariert) return null;
  return (
    <>
      {r ? <Rueckmeldung richtig titel="Repariert" warum={r.warum} /> : null}
      <Vergleich vorher={z.kaputt} nachher={z.repariert} erfuellt={erfuelltBeweis(z.repariert, z.szenario.beweis)} />
      <LaufKurz lauf={z.repariert} limit={z.szenario.regler.kontextLimit} titel="Reparierten Lauf ansehen" />
      <Button gross icon="haken" onClick={() => senden({ typ: 'WEITER', datum: heute() })}>Fall abschließen</Button>
    </>
  );
}

export function FertigPhase({ z, senden, naechster }: PhaseProps & { naechster?: string }) {
  const inhalt = useInhalt();
  const karten = z.szenario.karten.map((id) => inhalt.nachId.get(id)).filter((k) => !!k);
  const skizze = z.szenario.skizze ? findeSkizze(z.szenario.skizze, inhalt.themen) : undefined;
  const versuche = z.ergebnis?.versuche ?? z.versuche;
  return (
    <>
      <section className="karte fallfertig">
        <span className="leer__icon" aria-hidden><Icon name="haken" size={34} /></span>
        <h2>Gelöst</h2>
        <p>{versuche === 1 ? 'Ohne Fehlgriff, stark.' : `Mit ${versuche} Versuchen. Jeder Fehlgriff hat dir ein Warum gezeigt.`}</p>
      </section>
      {karten.length || skizze ? (
        <section aria-labelledby="dazu-titel">
          <h2 id="dazu-titel" className="abschnitt">Zum Nachlesen</h2>
          <ul className="liste karte">
            {skizze ? <li><Link className="liste__zeile" to={`/skizze/${skizze.id}`}><Icon name="diagramm" size={20} /><span className="liste__text">Skizze: {skizze.titel}</span><Icon name="weiter" size={16} /></Link></li> : null}
            {karten.map((k) => (
              <li key={k.id}><Link className="liste__zeile" to={`/lexikon?karte=${encodeURIComponent(k.id)}`}><Icon name="lexikon" size={20} /><span className="liste__text">{k.frage}</span><Icon name="weiter" size={16} /></Link></li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="fallknoepfe">
        {naechster ? <Link className="knopf knopf--primaer knopf--gross" to={`/labor/fall/${naechster}`}>Nächster Störfall</Link> : null}
        <Button variante="tint" icon="nochmal" onClick={() => senden({ typ: 'NEU' })}>Nochmal von vorn</Button>
        <Link className="knopf knopf--flach" to="/labor">Zur Übersicht</Link>
      </div>
    </>
  );
}
