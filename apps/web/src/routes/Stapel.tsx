import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { reiheNachFehler, trackSchema, type Session } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';
import { Sheet } from '../components/ui/Sheet';
import { SwipeCard, type SwipeCardSteuerung } from '../components/ui/SwipeCard';
import { bereiteBildVor, themenBildUrl } from '../lib/bilder';
import { roadmapThema } from '../lib/inhalt';
import { waehleFuer } from '../lib/session';
import { EingebettetKontext } from '../skizzen/SkizzenRahmen';
import { skizzeFuerKarte, type Skizze } from '../skizzen/registry';
import { useApp, useInhalt } from '../lib/zustand';
import { Leer } from './Leer';

const GRUENDE = ['Antwort ist falsch', 'Frage ist unklar', 'Doppelt', 'Zu schwer für die Stufe'];

export function Stapel() {
  const params = useParams();
  const track = trackSchema.catch('aie').parse(params.track);
  const [suche] = useSearchParams();
  const thema = suche.get('thema') ?? undefined;
  const { staende, einstellungen, bewerteKarte, speichereSession, melde, setzeTrack } = useApp();
  const inhalt = useInhalt();
  const navigate = useNavigate();
  const steuerung = useRef<SwipeCardSteuerung>(null);

  useEffect(() => setzeTrack(track), [track, setzeTrack]);

  // Die Auswahl wird beim Öffnen einmal festgelegt und ändert sich in der Session nicht.
  const [start] = useState(() => {
    return { reihe: waehleFuer(inhalt, staende, track, einstellungen.neueProSession, thema), zeit: new Date().toISOString() };
  });
  const [reihe, setReihe] = useState<readonly string[]>(start.reihe);
  const [zaehler, setZaehler] = useState<Readonly<Record<string, number>>>({});
  const [index, setIndex] = useState(0);
  const [gedreht, setGedreht] = useState(false);
  const [antworten, setAntworten] = useState<Session['antworten']>([]);
  const [meldenOffen, setMeldenOffen] = useState(false);
  const [gemeldet, setGemeldet] = useState<string>();
  const [skizze, setSkizze] = useState<Skizze>();
  const kartenZeit = useRef(performance.now());
  const sessionId = useMemo(() => `s-${Date.now().toString(36)}`, []);

  const aktuell = reihe[index] !== undefined ? inhalt.nachId.get(reihe[index]!) : undefined;
  const naechste = reihe.slice(index + 1, index + 3).map((id) => inhalt.nachId.get(id)).filter((k) => k !== undefined);

  const antworte = useCallback((gewusst: boolean) => {
    const id = reihe[index];
    if (!id) return;
    const ersteMal = !antworten.some((a) => a.id === id);
    if (ersteMal) bewerteKarte(id, gewusst);
    const neueAntworten = [...antworten, { id, gewusst, ms: Math.round(performance.now() - kartenZeit.current) }];
    const naechsteReihe = gewusst ? { reihe, zaehler } : reiheNachFehler(reihe, index, zaehler);
    setAntworten(neueAntworten);
    setReihe(naechsteReihe.reihe);
    setZaehler(naechsteReihe.zaehler);
    setGedreht(false);
    setGemeldet(undefined);
    kartenZeit.current = performance.now();
    if (index + 1 >= naechsteReihe.reihe.length) {
      speichereSession({ id: sessionId, track, start: start.zeit, ende: new Date().toISOString(), karten: [...start.reihe], antworten: neueAntworten });
      navigate('/fertig', { replace: true, state: { sessionId } });
      return;
    }
    setIndex(index + 1);
  }, [antworten, bewerteKarte, index, navigate, reihe, sessionId, speichereSession, start, track, zaehler]);

  // Layout-Effekt: Die Tasten wirken ab dem ersten sichtbaren Bild, nicht erst nach dem Malen.
  useLayoutEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (meldenOffen || skizze || e.metaKey || e.ctrlKey || e.altKey) return;
      // Knöpfe in der Karte (z. B. „Skizze ansehen“) reagieren selbst auf Enter und Leertaste.
      if ((e.key === ' ' || e.key === 'Enter') && (e.target as HTMLElement | null)?.closest?.('button, a, input')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setGedreht((g) => !g); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); steuerung.current?.werfe(true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); steuerung.current?.werfe(false); }
      else if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [meldenOffen, skizze, navigate]);

  // Bilder der nächsten Karten vorab dekodieren: sonst ruckelt der erste Swipe.
  const bildVon = useCallback((id: string | undefined) => {
    const k = id ? inhalt.nachId.get(id) : undefined;
    return k ? themenBildUrl(roadmapThema(inhalt, k.track, k.thema)) : undefined;
  }, [inhalt]);
  useEffect(() => {
    for (const id of reihe.slice(index, index + 3)) void bereiteBildVor(bildVon(id));
  }, [bildVon, index, reihe]);

  useEffect(() => { document.title = 'Stapel · karol-learn'; }, []);

  if (!aktuell) return <Leer track={track} />;

  const passend = skizzeFuerKarte(aktuell, inhalt.themen);
  const gesamt = reihe.length;
  const fertigAnteil = index / gesamt;
  const sendeMeldung = async (grund: string) => {
    const wo = await melde(aktuell.id, grund);
    setGemeldet(wo === 'server' ? 'Gemeldet. Danke!' : 'Lokal gemerkt. Danke!');
    setMeldenOffen(false);
  };

  return (
    <div className="stapelseite" data-track={track}>
      <header className="stapelseite__kopf">
        <button type="button" className="rundknopf rundknopf--gross" onClick={() => navigate('/')} aria-label="Session beenden">
          <Icon name="kreuz" size={20} />
        </button>
        <div className="fortschrittsbalken" role="progressbar" aria-label="Fortschritt der Session"
          aria-valuemin={0} aria-valuemax={gesamt} aria-valuenow={index}>
          <span style={{ transform: `scaleX(${fertigAnteil})` }} />
        </div>
        <span className="stapelseite__zahl" aria-live="polite">{index + 1}/{gesamt}</span>
        <button type="button" className="rundknopf rundknopf--gross" onClick={() => setMeldenOffen(true)} aria-label="Karte melden">
          <Icon name="fahne" size={19} />
        </button>
      </header>

      <main className="stapelseite__mitte" id="inhalt">
        <h1 className="sr-only">Lernstapel {track === 'aie' ? 'AI Engineer' : 'Forward Deployed Engineer'}</h1>
        <SwipeCard key={`${aktuell.id}-${index}`} ref={steuerung} karte={aktuell} naechste={naechste}
          gedreht={gedreht} onDrehen={() => setGedreht((g) => !g)} onAntwort={antworte} bild={bildVon(aktuell.id)}
          rueckKnopf={passend ? { text: 'Skizze ansehen', onKlick: () => setSkizze(passend) } : undefined} />
        <p className="stapelseite__status" role="status">{gemeldet ?? ''}</p>
      </main>

      <footer className="stapelseite__aktionen">
        <button type="button" className="aktionsknopf aktionsknopf--rot" onClick={() => steuerung.current?.werfe(false)}>
          <span className="aktionsknopf__kreis"><Icon name="nochmal" size={24} /></span><span>Nochmal</span>
          <kbd aria-hidden>←</kbd>
        </button>
        <button type="button" className="aktionsknopf aktionsknopf--dreh" onClick={() => setGedreht((g) => !g)} aria-label="Karte umdrehen">
          <span className="aktionsknopf__kreis aktionsknopf__kreis--klein"><Icon name="dreh" size={22} /></span><span>Umdrehen</span>
          <kbd aria-hidden>Leer</kbd>
        </button>
        <button type="button" className="aktionsknopf aktionsknopf--gruen" onClick={() => steuerung.current?.werfe(true)}>
          <span className="aktionsknopf__kreis"><Icon name="haken" size={26} /></span><span>Wusste ich</span>
          <kbd aria-hidden>→</kbd>
        </button>
      </footer>

      <Sheet gross offen={!!skizze} onZu={() => setSkizze(undefined)} titel={skizze?.titel ?? 'Skizze'} kinder={skizze ? (
        <EingebettetKontext.Provider value><skizze.Komponente /></EingebettetKontext.Provider>
      ) : null} />

      <Sheet offen={meldenOffen} onZu={() => setMeldenOffen(false)} titel="Karte melden" kinder={
        <div className="liste">
          {GRUENDE.map((g) => (
            <button key={g} type="button" className="liste__zeile" onClick={() => void sendeMeldung(g)}>
              <span>{g}</span><Icon name="weiter" size={16} />
            </button>
          ))}
        </div>
      } />
    </div>
  );
}
