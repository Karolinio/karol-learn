import { Link, useNavigate } from 'react-router-dom';
import { fortschritt, naechsteErklaerKarte, slug, tagesserie } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Seite } from '../components/ui/Seite';
import { TRACK_NAME, TrackSegment } from '../components/ui/TrackSegment';
import { datumLang, heute, plusTageLokal, tageBis } from '../lib/datum';
import { roadmapThema, themenReihenfolge } from '../lib/inhalt';
import { themenBildUrl } from '../lib/bilder';
import { waehleFuer } from '../lib/session';
import { useApp, useInhalt } from '../lib/zustand';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const EXPORT_ERINNERUNG_TAGE = 7;

function Woche({ tage }: { tage: ReadonlySet<string> }) {
  const h = heute();
  const wochentag = (new Date().getDay() + 6) % 7;
  return (
    <ol className="woche" aria-label="Lerntage dieser Woche">
      {WOCHENTAGE.map((name, i) => {
        const tag = plusTageLokal(h, i - wochentag);
        const gelernt = tage.has(tag);
        return (
          <li key={name} className={`woche__tag${gelernt ? ' ist-gelernt' : ''}${tag === h ? ' ist-heute' : ''}`}>
            <span className="woche__punkt">{gelernt ? <Icon name="haken" size={14} /> : null}</span>
            <span className="woche__name">{name}</span>
            <span className="sr-only">{gelernt ? 'gelernt' : 'nicht gelernt'}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Heute() {
  const { staende, sessions, einstellungen, setzeTrack, labor, erklaeren } = useApp();
  const inhalt = useInhalt();
  const navigate = useNavigate();
  const track = einstellungen.track;
  const karten = inhalt.karten.filter((k) => k.track === track);
  const f = fortschritt(karten, staende);
  const session = waehleFuer(inhalt, staende, track, einstellungen.neueProSession);
  const faellig = session.filter((id) => (staende[id]?.box ?? 0) > 0).length;
  const lerntage = new Set(sessions.filter((s) => s.ende).map((s) => heute(new Date(s.start))));
  const serie = tagesserie([...lerntage], heute());
  const naechstesThema = f.jeThema.length
    ? themenReihenfolge(inhalt, track).find((t) => (f.jeThema.find((x) => x.thema === t)?.offen ?? 0) > 0)
    : undefined;
  const naechstesBild = naechstesThema ? themenBildUrl(roadmapThema(inhalt, track, naechstesThema)) : undefined;
  const geloest = new Set(labor.filter((e) => e.geloest).map((e) => e.szenarioId));
  const stoerfall = inhalt.labor.find((s) => s.track === track && !geloest.has(s.id));
  const erklaerKarte = naechsteErklaerKarte(inhalt.karten, staende, erklaeren, track, heute());
  const exportAlt = sessions.length > 2 && (!einstellungen.exportErinnert || tageBis(heute(), einstellungen.exportErinnert) > EXPORT_ERINNERUNG_TAGE);

  return (
    <Seite titel="Heute" untertitel={datumLang(heute())} kinder={
      <div className="stapelung">
        <TrackSegment wert={track} onWahl={setzeTrack} />

        <section className="heldkarte" aria-labelledby="session-titel">
          <div className="heldkarte__text">
            <p className="ueberzeile">{TRACK_NAME[track]}</p>
            <h2 id="session-titel" className="heldkarte__titel">
              {session.length ? `${session.length} Karten warten` : 'Alles erledigt'}
            </h2>
            <p className="heldkarte__meta">
              {session.length ? `${faellig} zum Wiederholen · ${session.length - faellig} neu` : 'Für heute ist nichts mehr fällig.'}
            </p>
          </div>
          <ProgressRing anteil={f.anteil} zweiter={{ anteil: f.gesamt ? f.lerne / f.gesamt : 0, farbe: 'var(--color-orange)' }}
            farbe="var(--color-green)" groesse={104} staerke={11} label={`${Math.round(f.anteil * 100)} Prozent gekonnt`}
            kind={<span className="ring__zahl">{Math.round(f.anteil * 100)}<small>%</small></span>} />
          <Button gross className="heldkarte__start" icon="stapel" disabled={!session.length}
            onClick={() => navigate(`/stapel/${track}`)} data-testid="start">
            {session.length ? `${session.length} Karten starten` : 'Morgen geht es weiter'}
          </Button>
        </section>

        {stoerfall ? (
          <Link to={`/labor/fall/${stoerfall.id}`} className="karte zeile-link" data-testid="naechster-stoerfall">
            <span className="zeile-link__icon" aria-hidden><Icon name="uebung" size={20} /></span>
            <span className="zeile-link__text"><small>Nächster Störfall</small>{stoerfall.titel}</span>
            <Icon name="weiter" size={18} className="zeile-link__pfeil" />
          </Link>
        ) : null}

        {erklaerKarte ? (
          <Link to={`/erklaeren/${erklaerKarte.id}`} className="karte zeile-link" data-testid="erklaeren-ueben">
            <span className="zeile-link__icon" aria-hidden><Icon name="sprechen" size={20} /></span>
            <span className="zeile-link__text"><small>Erklären üben</small>{erklaerKarte.frage}</span>
            <Icon name="weiter" size={18} className="zeile-link__pfeil" />
          </Link>
        ) : null}

        <section className="kachelreihe" aria-label="Lernstand">
          <Link to={`/fortschritt/${track}`} className="kachel kachel--kann"><strong>{f.kann}</strong><span>kann ich</span></Link>
          <Link to={`/fortschritt/${track}`} className="kachel kachel--lerne"><strong>{f.lerne}</strong><span>lerne ich</span></Link>
          <Link to={`/fortschritt/${track}`} className="kachel kachel--offen"><strong>{f.offen}</strong><span>offen</span></Link>
        </section>

        <section className="karte serie" aria-labelledby="serie-titel">
          <div className="serie__kopf">
            <span className="serie__flamme" aria-hidden><Icon name="flamme" size={22} /></span>
            <h2 id="serie-titel"><strong>{serie}</strong> {serie === 1 ? 'Tag' : 'Tage'} in Folge</h2>
          </div>
          <Woche tage={lerntage} />
        </section>

        {naechstesThema ? (
          <Link to={`/thema/${track}/${slug(naechstesThema)}`} className="karte zeile-link">
            {naechstesBild
              ? <img className="zeile-link__bild" src={naechstesBild} width={56} height={42} loading="lazy" decoding="async" alt="" />
              : <span className="zeile-link__icon" aria-hidden><Icon name="roadmap" size={20} /></span>}
            <span className="zeile-link__text"><small>Als Nächstes auf dem Pfad</small>{naechstesThema}</span>
            <Icon name="weiter" size={18} className="zeile-link__pfeil" />
          </Link>
        ) : null}

        {exportAlt ? (
          <Link to="/einstellungen" className="hinweis">
            <Icon name="teilen" size={18} /> Sichere deinen Lernstand: Export in den Einstellungen.
          </Link>
        ) : null}
      </div>
    } />
  );
}
