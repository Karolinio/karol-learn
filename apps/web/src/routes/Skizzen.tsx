import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Seite } from '../components/ui/Seite';
import { TrackSegment } from '../components/ui/TrackSegment';
import { useApp, useInhalt } from '../lib/zustand';
import { sichtbareSkizzen } from '../skizzen/registry';

/** Liste aller Skizzen des gewählten Tracks. */
export function Skizzen() {
  const { einstellungen, setzeTrack, labor } = useApp();
  const inhalt = useInhalt();
  const track = einstellungen.track;
  const liste = sichtbareSkizzen(inhalt.themen, track);
  const geloest = new Set(labor.filter((e) => e.geloest).map((e) => e.szenarioId));
  const faelle = inhalt.labor.length;
  const gemacht = inhalt.labor.filter((s) => geloest.has(s.id)).length;
  return (
    <Seite titel="Skizzen" untertitel="Zum Durchklicken, Schritt für Schritt" kinder={
      <div className="stapelung" data-track={track}>
        <TrackSegment wert={track} onWahl={setzeTrack} />
        {faelle ? (
          <section aria-labelledby="anwenden-titel">
            <h2 id="anwenden-titel" className="abschnitt">Anwenden</h2>
            <Link to="/labor" className="karte einstieg" data-testid="labor-einstieg">
              <ProgressRing anteil={gemacht / faelle} groesse={52} staerke={7} farbe="var(--color-green)" label={`${gemacht} von ${faelle} Störfällen gelöst`}
                kind={<Icon name="uebung" size={20} />} />
              <span className="einstieg__text">
                <strong>Agent-Labor · {gemacht}/{faelle} gelöst</strong>
                <small>Störfälle lösen und am Harness drehen</small>
              </span>
              <Icon name="weiter" size={18} />
            </Link>
          </section>
        ) : null}
        <h2 className="abschnitt">Verstehen</h2>
        {liste.length ? (
          <ul className="liste karte skizzenliste">
            {liste.map((s, i) => (
              <li key={s.id}>
                <Link to={`/skizze/${s.id}`} className="liste__zeile skizzenliste__zeile">
                  <span className="skizzenliste__nummer" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                  <span className="liste__text">
                    <span className="skizzenliste__titel">{s.titel}</span>
                    <small>{s.kurztext}</small>
                    <small className="skizzenliste__meta">{s.schritte.length} Schritte · {s.themen.join(', ')}</small>
                  </span>
                  <Icon name="weiter" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="karte hinweistext">Für diesen Track gibt es noch keine Skizzen.</p>}
      </div>
    } />
  );
}
