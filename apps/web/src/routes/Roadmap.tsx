import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { fortschritt, slug, trackSchema, type RoadmapThema, type ThemenFortschritt, type Track } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';
import { Seite } from '../components/ui/Seite';
import { TrackSegment } from '../components/ui/TrackSegment';
import { themenBildUrl } from '../lib/bilder';
import { useApp, useInhalt } from '../lib/zustand';

const BREITE = 340;
const ZEILE = 128;
const VERSATZ = [-24, 56, 92, 48, -30, -84, -92, -52];
const OBEN = 72;
type Zustand = 'kann' | 'lerne' | 'offen';

function zustandVon(t: ThemenFortschritt | undefined): Zustand {
  if (!t || t.gesamt === 0) return 'offen';
  if (t.kann === t.gesamt) return 'kann';
  return t.kann + t.lerne > 0 ? 'lerne' : 'offen';
}

function Knoten({ t, f, aktuell, seite, onWahl }: { t: RoadmapThema; f?: ThemenFortschritt; aktuell: boolean; seite: 'links' | 'rechts'; onWahl: () => void }) {
  const z = zustandVon(f);
  const anteil = f && f.gesamt ? (f.kann + f.lerne * 0.5) / f.gesamt : 0;
  const r = 33;
  const umfang = 2 * Math.PI * r;
  const bild = themenBildUrl(t);
  return (
    <button type="button" className={`pfadknoten pfadknoten--${z} pfadknoten--text-${seite}${aktuell ? ' ist-aktuell' : ''}`} onClick={onWahl}
      aria-label={`${t.thema}: ${f?.kann ?? 0} von ${f?.gesamt ?? 0} gekonnt${aktuell ? ', als Nächstes' : ''}`}>
      {aktuell ? <span className="pfadknoten__start">Start</span> : null}
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden className="pfadknoten__svg">
        <circle cx="40" cy="40" r="38" className="pfadknoten__grund" />
        <circle cx="40" cy="40" r={r} className="pfadknoten__spur" />
        <circle cx="40" cy="40" r={r} className="pfadknoten__bogen" strokeDasharray={umfang} strokeDashoffset={umfang * (1 - anteil)} transform="rotate(-90 40 40)" />
        <circle cx="40" cy="40" r="25" className={`pfadknoten__kern${bild ? ' pfadknoten__kern--bild' : ''}`} />
        {bild ? null : (
          <g transform="translate(28 28)" className="pfadknoten__icon">
            {z === 'kann'
              ? <path d="M5 12.5 10 17.5 19 7" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" strokeWidth="1.6" strokeLinejoin="round" />}
          </g>
        )}
      </svg>
      {bild ? <img className="pfadknoten__bild" src={bild} width={52} height={52} alt="" loading="lazy" decoding="async" draggable={false} /> : null}
      {bild && z === 'kann' ? <span className="pfadknoten__haken" aria-hidden><Icon name="haken" size={13} strokeWidth={3} /></span> : null}
      <span className="pfadknoten__beschriftung"><span className="pfadknoten__name">{t.thema}</span>
      <span className="pfadknoten__zahl">{f?.kann ?? 0}/{f?.gesamt ?? 0}</span></span>
    </button>
  );
}

function Gruppe({ name, themen, start, f, aktuell, onWahl }: {
  name: string; themen: RoadmapThema[]; start: number; f: Map<string, ThemenFortschritt>; aktuell?: string; onWahl: (t: RoadmapThema) => void;
}) {
  const punkte = themen.map((_, i) => ({ x: BREITE / 2 + (VERSATZ[(start + i) % VERSATZ.length] ?? 0), y: i * ZEILE + OBEN }));
  const pfad = punkte.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const v = punkte[i - 1]!;
    return `C ${v.x} ${v.y + ZEILE / 2}, ${p.x} ${p.y - ZEILE / 2}, ${p.x} ${p.y}`;
  }).join(' ');
  const hoehe = (themen.length - 1) * ZEILE + OBEN + 56;
  return (
    <section className="pfadgruppe" aria-label={name}>
      <h2 className="pfadgruppe__titel"><span>{name}</span></h2>
      <div className="pfadgruppe__flaeche" style={{ height: hoehe }}>
        <svg className="pfadgruppe__linie" viewBox={`0 0 ${BREITE} ${hoehe}`} preserveAspectRatio="none" aria-hidden>
          <path d={pfad} vectorEffect="non-scaling-stroke" />
        </svg>
        {themen.map((t, i) => (
          <div key={t.thema} className="pfadgruppe__platz" style={{ left: `${(punkte[i]!.x / BREITE) * 100}%`, top: punkte[i]!.y }}>
            <Knoten t={t} f={f.get(t.thema)} aktuell={t.thema === aktuell} seite={punkte[i]!.x > BREITE / 2 ? 'links' : 'rechts'} onWahl={() => onWahl(t)} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function RoadmapWeiche() {
  const { einstellungen } = useApp();
  return <Navigate to={`/roadmap/${einstellungen.track}`} replace />;
}

export function Roadmap() {
  const track: Track = trackSchema.catch('aie').parse(useParams().track);
  const { staende, setzeTrack } = useApp();
  const inhalt = useInhalt();
  const navigate = useNavigate();
  const rm = inhalt.roadmaps[track];
  const f = new Map(fortschritt(inhalt.karten.filter((k) => k.track === track), staende).jeThema.map((t) => [t.thema, t]));
  const themen = rm?.themen ?? [];
  const aktuell = themen.find((t) => zustandVon(f.get(t.thema)) !== 'kann')?.thema;
  const gruppen = themen.reduce<{ name: string; themen: RoadmapThema[]; start: number }[]>((acc, t, i) => {
    const letzte = acc[acc.length - 1];
    return letzte && letzte.name === t.gruppe
      ? [...acc.slice(0, -1), { ...letzte, themen: [...letzte.themen, t] }]
      : [...acc, { name: t.gruppe, themen: [t], start: i }];
  }, []);
  const oeffne = (t: RoadmapThema) => navigate(`/thema/${track}/${slug(t.thema)}`);
  const wechsle = (t: Track) => { setzeTrack(t); navigate(`/roadmap/${t}`, { replace: true }); };

  return (
    <Seite titel="Roadmap" untertitel={rm?.titel} klasse="roadmapseite" kinder={
      <div className="stapelung" data-track={track}>
        <TrackSegment wert={track} onWahl={wechsle} />
        <div className="pfad">
          {gruppen.map((g) => <Gruppe key={g.name} {...g} f={f} aktuell={aktuell} onWahl={oeffne} />)}
        </div>
      </div>
    } />
  );
}
