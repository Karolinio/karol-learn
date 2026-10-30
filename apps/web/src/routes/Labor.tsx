import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Seite } from '../components/ui/Seite';
import { TrackSegment } from '../components/ui/TrackSegment';
import { useApp, useInhalt } from '../lib/zustand';

/** /labor: Störfälle des gewählten Tracks plus der Simulator. */
export function Labor() {
  const { einstellungen, setzeTrack, labor } = useApp();
  const inhalt = useInhalt();
  const track = einstellungen.track;
  const faelle = inhalt.labor.filter((s) => s.track === track);
  const geloest = new Set(labor.filter((e) => e.geloest).map((e) => e.szenarioId));
  const anzahl = faelle.filter((s) => geloest.has(s.id)).length;

  return (
    <Seite titel="Agent-Labor" untertitel="Symptom sehen, Ursache finden, reparieren" zurueck="/skizzen" kinder={
      <div className="stapelung" data-track={track}>
        <TrackSegment wert={track} onWahl={setzeTrack} />
        <section className="karte laborkopf" aria-label="Gelöste Störfälle">
          <ProgressRing anteil={faelle.length ? anzahl / faelle.length : 0} groesse={64} staerke={8} farbe="var(--color-green)"
            label={`${anzahl} von ${faelle.length} gelöst`} kind={<span className="ring__zahl">{anzahl}<small>/{faelle.length}</small></span>} />
          <div>
            <h2>{anzahl === faelle.length && faelle.length ? 'Alles gelöst' : `${faelle.length - anzahl} Störfälle offen`}</h2>
            <p>Je Fall rund drei Minuten. Falsche Wahlen kosten nichts, sie zeigen dir das Warum.</p>
          </div>
        </section>

        {faelle.length ? (
          <ul className="liste karte laborliste" aria-label="Störfälle">
            {faelle.map((s) => {
              const ok = geloest.has(s.id);
              return (
                <li key={s.id}>
                  <Link to={`/labor/fall/${s.id}`} className="liste__zeile laborliste__zeile">
                    <span className={`laborstatus${ok ? ' ist-geloest' : ''}`}>
                      {ok ? <Icon name="haken" size={16} titel="gelöst" /> : <span className="sr-only">offen</span>}
                    </span>
                    <span className="liste__text">
                      <span className="laborliste__titel">{s.titel}</span>
                      <small>{s.symptom}</small>
                    </span>
                    <Icon name="weiter" size={16} />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <p className="karte hinweistext">Für diesen Track gibt es noch keine Störfälle.</p>}

        {inhalt.grundlaeufe.length ? (
          <Link to="/labor/simulator" className="karte einstieg">
            <span className="zeile-link__icon" aria-hidden><Icon name="zahnrad" size={20} /></span>
            <span className="einstieg__text"><strong>Simulator</strong><small>Ein Lauf, alle Regler: dreh und sieh, was sich ändert.</small></span>
            <Icon name="weiter" size={18} />
          </Link>
        ) : null}
      </div>
    } />
  );
}
