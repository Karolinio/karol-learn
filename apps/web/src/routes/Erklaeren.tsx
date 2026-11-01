import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  erklaerAnfrageVon, erklaerSchritt, kernpunkteVon, letztesErklaerErgebnis, naechsteErklaerKarte, starteErklaeren,
  type ErklaerEreignis, type ErklaerZustand, type Karte,
} from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';
import { Seite } from '../components/ui/Seite';
import { TRACK_KURZ } from '../components/ui/TrackSegment';
import { FehlerKarte, FertigKarte } from '../erklaeren/Abschluss';
import { Ergebnis } from '../erklaeren/Ergebnis';
import { Schreibfeld } from '../erklaeren/Schreibfeld';
import { Selbstcheck } from '../erklaeren/Selbstcheck';
import { Warten } from '../erklaeren/Warten';
import { ZielpersonWahl } from '../erklaeren/ZielpersonWahl';
import { heute } from '../lib/datum';
import { bewerteErklaerung, ErklaerFehler } from '../lib/erklaeren';
import { liesEntwurf, schreibeEntwurf } from '../lib/entwurf';
import { useApp, useInhalt } from '../lib/zustand';

/** Zustand mit pure Reducer, aber synchron lesbar: Klick-Handler brauchen den nächsten Zustand sofort (ein Lauf je Klick). */
function useErklaerZustand(karte: Karte) {
  const kernpunkte = useMemo(() => kernpunkteVon(karte), [karte]);
  const [z, setZ] = useState<ErklaerZustand>(() => ({ ...starteErklaeren({ id: karte.id, track: karte.track, kernpunkte }), text: liesEntwurf(karte.id) }));
  const aktuell = useRef(z);
  const senden = useCallback((e: ErklaerEreignis): ErklaerZustand => {
    const neu = erklaerSchritt(aktuell.current, e);
    aktuell.current = neu;
    setZ(neu);
    return neu;
  }, []);
  return { z, senden, kernpunkte };
}

/** Startet genau einen Lauf; ein neuer Lauf bricht den alten ab. Nur aus Klick-Handlern gerufen. */
function useCoachLauf(senden: (e: ErklaerEreignis) => ErklaerZustand) {
  const lauf = useRef<AbortController>();
  useEffect(() => () => lauf.current?.abort(), []);
  const starte = useCallback((z: ErklaerZustand) => {
    const anfrage = erklaerAnfrageVon(z);
    if (z.phase !== 'wartet' || !anfrage) return;
    lauf.current?.abort();
    const ab = new AbortController();
    lauf.current = ab;
    bewerteErklaerung(anfrage, ab.signal)
      .then((bewertung) => { if (!ab.signal.aborted) senden({ typ: 'ERGEBNIS', bewertung }); })
      .catch((e: unknown) => {
        const f = e instanceof ErklaerFehler ? e : new ErklaerFehler('netz', 'Unbekannter Fehler');
        if (ab.signal.aborted || f.art === 'abgebrochen') return;
        senden({ typ: 'FEHLER', art: f.art, meldung: f.message });
      });
  }, [senden]);
  const stoppe = useCallback(() => lauf.current?.abort(), []);
  return { starte, stoppe };
}

function Uebung({ karte }: { karte: Karte }) {
  const { coach, erklaeren, staende, speichereErklaerErgebnis, pruefeServer } = useApp();
  const inhalt = useInhalt();
  const { z, senden, kernpunkte } = useErklaerZustand(karte);
  const { starte, stoppe } = useCoachLauf(senden);
  const [letzteFassung] = useState(() => letztesErklaerErgebnis(erklaeren, karte.id)?.text);
  useEffect(() => { window.scrollTo(0, 0); }, [z.phase]);
  // Server neu fragen: läuft er erst seit eben, gibt es trotzdem „Bewerten lassen“. Nur GET /api/status, kein Lauf.
  useEffect(() => { void pruefeServer(); }, [pruefeServer]);

  const text = (t: string) => { const neu = senden({ typ: 'TEXT', text: t }); if (neu.runde === 1) schreibeEntwurf(karte.id, neu.text); };
  const merke = (neu: ErklaerZustand) => { if (neu.ergebnis) { speichereErklaerErgebnis(neu.ergebnis); schreibeEntwurf(karte.id, ''); } };
  const naechste = z.phase === 'fertig'
    ? naechsteErklaerKarte(inhalt.karten.filter((k) => k.id !== karte.id), staende, erklaeren, karte.track, heute())?.id
    : undefined;
  const grund = z.fehler ? 'Claude war gerade nicht erreichbar. Vergleich selbst mit der Musterantwort.' : coach ? undefined : 'Ohne lokalen Server prüfst du selbst. Das zählt genauso.';

  switch (z.phase) {
    case 'zielperson':
      return <ZielpersonWahl karte={karte} gewaehlt={z.zielperson} onWahl={(id) => senden({ typ: 'WAEHLE', id })} />;
    case 'schreiben':
      return <Schreibfeld karte={karte} zielperson={z.zielperson ?? 'gf'} text={z.text} runde={z.runde} nachfrage={z.nachfrage} coach={coach}
        onText={text} onAbsenden={() => starte(senden({ typ: 'ABSENDEN', online: coach }))} onWechseln={() => senden({ typ: 'ZIELPERSON_WECHSELN' })} />;
    case 'wartet':
      return <Warten onAbbrechen={() => { stoppe(); senden({ typ: 'ABBRECHEN' }); }} />;
    case 'fehler':
      return z.fehler ? <FehlerKarte fehler={z.fehler} onSelbst={() => senden({ typ: 'SELBST_PRUEFEN' })} onErneut={() => starte(senden({ typ: 'ERNEUT' }))} /> : null;
    case 'ergebnis':
      return z.bewertung && z.urteil ? (
        <Ergebnis bewertung={z.bewertung} urteil={z.urteil} runde={z.runde} zielperson={z.zielperson ?? 'gf'} kernpunkte={kernpunkte}
          letzteFassung={letzteFassung} onAntworten={() => senden({ typ: 'NACHFRAGE_BEANTWORTEN' })}
          onFertig={() => merke(senden({ typ: 'FERTIG', datum: heute() }))} />
      ) : null;
    case 'selbst':
      return <Selbstcheck karte={karte} text={z.ersterText ?? z.text} kernpunkte={kernpunkte} haken={z.haken} grund={grund}
        onHaken={(i) => senden({ typ: 'HAKEN', i })} onFertig={() => merke(senden({ typ: 'SELBST_FERTIG', datum: heute() }))} />;
    case 'fertig':
      return z.ergebnis ? <FertigKarte ergebnis={z.ergebnis} naechste={naechste} onNeu={() => senden({ typ: 'NEU' })} /> : null;
  }
}

function zurueckZiel(): string | -1 {
  return ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0 ? -1 : '/';
}

/** /erklaeren = nächste passende Karte, /erklaeren/:id = diese Karte. */
export function Erklaeren() {
  const { id } = useParams();
  const { staende, erklaeren, einstellungen } = useApp();
  const inhalt = useInhalt();
  if (!id) {
    const k = naechsteErklaerKarte(inhalt.karten, staende, erklaeren, einstellungen.track, heute());
    if (k) return <Navigate to={`/erklaeren/${k.id}`} replace />;
    return (
      <Seite titel="Erklären" zurueck={zurueckZiel()} kinder={
        <section className="karte erkl-leer">
          <span className="zeile-link__icon" aria-hidden><Icon name="sprechen" size={20} /></span>
          <h2>Gerade nichts fällig</h2>
          <p>Erklären kommt dran, sobald du Karten ein paar Mal gewusst hast. Im Lexikon kannst du jede Karte frei wählen.</p>
          <Link className="knopf knopf--tint" to="/lexikon">Zum Lexikon</Link>
        </section>
      } />
    );
  }
  const karte = inhalt.nachId.get(id);
  if (!karte) return <Seite titel="Erklären" zurueck="/" kinder={<p className="karte hinweistext">Diese Karte gibt es hier nicht.</p>} />;
  return (
    <Seite titel="Erklären" untertitel={`${karte.thema} · ${TRACK_KURZ[karte.track]}`} zurueck={zurueckZiel()} klasse={`track-${karte.track}`} kinder={
      <div className="stapelung erkl" data-track={karte.track}>
        <Uebung key={karte.id} karte={karte} />
      </div>
    } />
  );
}
