import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { Seite } from '../components/ui/Seite';
import { TrackSegment } from '../components/ui/TrackSegment';
import { useApp, useInhalt } from '../lib/zustand';
import { sichtbareSkizzen } from '../skizzen/registry';

/** Liste aller Skizzen des gewählten Tracks. */
export function Skizzen() {
  const { einstellungen, setzeTrack } = useApp();
  const inhalt = useInhalt();
  const track = einstellungen.track;
  const liste = sichtbareSkizzen(inhalt.themen, track);
  return (
    <Seite titel="Skizzen" untertitel="Zum Durchklicken, Schritt für Schritt" kinder={
      <div className="stapelung" data-track={track}>
        <TrackSegment wert={track} onWahl={setzeTrack} />
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
