import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { fortschritt, trackSchema } from '@karol-learn/karten-kern';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Seite } from '../components/ui/Seite';
import { TRACK_NAME } from '../components/ui/TrackSegment';
import { themenReihenfolge } from '../lib/inhalt';
import { useApp, useInhalt } from '../lib/zustand';

export function Fortschritt() {
  const track = trackSchema.catch('aie').parse(useParams().track);
  const { staende, labor } = useApp();
  const inhalt = useInhalt();
  const f = fortschritt(inhalt.karten.filter((k) => k.track === track), staende);
  const reihenfolge = themenReihenfolge(inhalt, track);
  const rang = (t: string) => { const i = reihenfolge.indexOf(t); return i === -1 ? 999 : i; };
  const themen = [...f.jeThema].sort((a, b) => rang(a.thema) - rang(b.thema));
  const faelle = inhalt.labor.filter((s) => s.track === track);
  const geloest = faelle.filter((s) => labor.some((e) => e.geloest && e.szenarioId === s.id)).length;
  const pz = (n: number, g: number) => `${g ? (n / g) * 100 : 0}%`;

  return (
    <Seite titel="Fortschritt" untertitel={TRACK_NAME[track]} zurueck="/mehr" klasse={`track-${track}`} kinder={
      <div className="stapelung" data-track={track}>
        <section className="karte fortschritt-kopf">
          <ProgressRing anteil={f.anteil} zweiter={{ anteil: f.gesamt ? f.lerne / f.gesamt : 0, farbe: 'var(--color-orange)' }}
            farbe="var(--color-green)" groesse={148} staerke={14} label={`${f.kann} von ${f.gesamt} Karten gekonnt`}
            kind={<span className="ring__zahl ring__zahl--gross">{Math.round(f.anteil * 100)}<small>%</small></span>} />
          <dl className="legende">
            <div className="legende__kann"><dt>Kann ich</dt><dd>{f.kann}</dd></div>
            <div className="legende__lerne"><dt>Lerne ich</dt><dd>{f.lerne}</dd></div>
            <div className="legende__offen"><dt>Offen</dt><dd>{f.offen}</dd></div>
          </dl>
        </section>
        {faelle.length ? (
          <Link to="/labor" className="karte zeile-link" data-testid="fortschritt-labor">
            <span className="zeile-link__icon" aria-hidden><Icon name="uebung" size={20} /></span>
            <span className="zeile-link__text"><small>Anwenden</small>{geloest}/{faelle.length} Störfälle gelöst</span>
            <Icon name="weiter" size={18} className="zeile-link__pfeil" />
          </Link>
        ) : null}
        <section aria-labelledby="themen-titel">
          <h2 id="themen-titel" className="abschnitt">Je Thema</h2>
          <ul className="karte themenbalken">
            {themen.map((t) => (
              <li key={t.thema}>
                <div className="themenbalken__kopf"><span>{t.thema}</span><span className="zahl">{t.kann}/{t.gesamt}</span></div>
                <div className="dreibalken" role="img" aria-label={`${t.thema}: ${t.kann} kann ich, ${t.lerne} lerne ich, ${t.offen} offen`}>
                  <span className="dreibalken__kann" style={{ width: pz(t.kann, t.gesamt) }} />
                  <span className="dreibalken__lerne" style={{ width: pz(t.lerne, t.gesamt) }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    } />
  );
}
