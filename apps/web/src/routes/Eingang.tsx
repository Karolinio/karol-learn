import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/ui/Icon';
import { Seite } from '../components/ui/Seite';
import { SwipeCard, type SwipeCardSteuerung } from '../components/ui/SwipeCard';
import { holeEingang, lehneAb, nimmAn, type Idee, type OffenerVorschlag } from '../lib/server';
import { useApp } from '../lib/zustand';

type Laden = { art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'bereit'; liste: OffenerVorschlag[] };

const IDEE_ART: Record<Idee['art'], { icon: IconName; name: string }> = {
  skizze: { icon: 'skizze', name: 'Skizze' },
  vergleich: { icon: 'vergleich', name: 'Vergleich' },
  uebung: { icon: 'uebung', name: 'Übung' },
};

/** Nur lesen: Erklärideen, die der Tutor aus Videos abgeleitet hat. */
function Ideen({ liste }: { liste: readonly Idee[] }) {
  if (!liste.length) return null;
  return (
    <section aria-labelledby="ideen-titel" className="ideen">
      <h2 id="ideen-titel" className="abschnitt">Ideen aus Videos</h2>
      <ul className="liste karte">
        {liste.map((i) => (
          <li key={`${i.laufId}-${i.id}`} className="idee" data-track={i.track}>
            <span className="appicon idee__icon" aria-hidden><Icon name={IDEE_ART[i.art].icon} size={18} /></span>
            <div className="idee__text">
              <p className="idee__titel">{i.titel}</p>
              <p className="idee__beschreibung">{i.beschreibung}</p>
              <p className="idee__meta">{IDEE_ART[i.art].name} · {i.thema} · {i.quelle}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Eingang() {
  const { server } = useApp();
  const [stand, setStand] = useState<Laden>({ art: 'laedt' });
  const [gedreht, setGedreht] = useState(false);
  const [meldung, setMeldung] = useState('');
  const [ideen, setIdeen] = useState<Idee[]>([]);
  const steuerung = useRef<SwipeCardSteuerung>(null);

  const lade = useCallback(async () => {
    try {
      const e = await holeEingang();
      setStand({ art: 'bereit', liste: e.vorschlaege });
      setIdeen(e.ideen);
    }
    catch (e) { setStand({ art: 'fehler', text: (e as Error).message }); }
  }, []);
  useEffect(() => { if (server) void lade(); }, [server, lade]);

  const entscheide = async (annehmen: boolean) => {
    if (stand.art !== 'bereit') return;
    const [v, ...rest] = stand.liste;
    if (!v) return;
    try {
      await (annehmen ? nimmAn(v.vorschlagId) : lehneAb(v.vorschlagId));
      setMeldung(annehmen ? `„${v.frage}“ angenommen. Wird beim nächsten Build sichtbar.` : 'Abgelehnt.');
      setStand({ art: 'bereit', liste: rest });
    } catch (e) {
      setMeldung(`Hat nicht geklappt: ${(e as Error).message}`);
      setStand({ art: 'bereit', liste: [...rest, v] });
    }
    setGedreht(false);
  };

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const aufKnopf = !!(e.target as HTMLElement | null)?.closest?.('button, a, input');
      if (e.key === ' ' && !aufKnopf) { e.preventDefault(); setGedreht((g) => !g); }
      if (e.key === 'ArrowRight') { e.preventDefault(); steuerung.current?.werfe(true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); steuerung.current?.werfe(false); }
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, []);

  const kopf = stand.art === 'bereit' ? `${stand.liste.length} Vorschläge vom Video-Tutor` : 'Vorschläge vom Video-Tutor';
  let koerper;
  if (!server) {
    koerper = <p className="karte hinweistext">Der lokale Server läuft nicht. Starte ihn mit <code>npm run dev</code>, dann erscheint hier der Eingang.</p>;
  } else if (stand.art === 'laedt') {
    koerper = <p className="hinweistext" role="status">Lädt …</p>;
  } else if (stand.art === 'fehler') {
    koerper = <p className="karte hinweistext" role="alert">Eingang nicht ladbar: {stand.text}</p>;
  } else if (!stand.liste[0]) {
    koerper = <div className="karte leerkarte"><Icon name="eingang" size={30} /><p>Keine offenen Vorschläge. Starte den Tutor mit <code>npm run tutor</code>.</p></div>;
  } else {
    const v = stand.liste[0];
    koerper = (
      <>
        {v.dublettVon ? <p className="warnzeile"><Icon name="fahne" size={16} /> Sieht aus wie <Link to={`/lexikon?karte=${encodeURIComponent(v.dublettVon)}`}>{v.dublettVon}</Link></p> : null}
        <div className="eingang__buehne" data-track={v.track}>
          <SwipeCard key={v.vorschlagId} ref={steuerung} karte={v} naechste={stand.liste.slice(1, 3)} gedreht={gedreht}
            onDrehen={() => setGedreht((g) => !g)} onAntwort={(ja) => void entscheide(ja)} labels={{ ja: 'Annehmen', nein: 'Ablehnen' }} />
        </div>
        <p className="eingang__grund">{v.begruendung}</p>
        <div className="stapelseite__aktionen stapelseite__aktionen--flach">
          <button type="button" className="aktionsknopf aktionsknopf--rot" onClick={() => steuerung.current?.werfe(false)}>
            <span className="aktionsknopf__kreis"><Icon name="kreuz" size={24} /></span><span>Ablehnen</span>
          </button>
          <button type="button" className="aktionsknopf aktionsknopf--gruen" onClick={() => steuerung.current?.werfe(true)}>
            <span className="aktionsknopf__kreis"><Icon name="haken" size={26} /></span><span>Annehmen</span>
          </button>
        </div>
      </>
    );
  }
  return (
    <Seite titel="Eingang" untertitel={kopf} zurueck="/mehr" kinder={
      <div className="stapelung">{koerper}<p className="stapelseite__status" role="status">{meldung}</p><Ideen liste={ideen} /></div>
    } />
  );
}
