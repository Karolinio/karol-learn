import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { baueSuchindex, letztesErklaerErgebnis, stufeVon, suche, TRACKS, type Track } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';
import { Seite } from '../components/ui/Seite';
import { Sheet } from '../components/ui/Sheet';
import { TRACK_KURZ } from '../components/ui/TrackSegment';
import { STUFE } from '../erklaeren/texte';
import { useApp, useInhalt } from '../lib/zustand';

const SEITE = 60;
const STUFENTEXT = { kann: 'kann ich', lerne: 'lerne ich', offen: 'offen' } as const;

export function Lexikon() {
  const inhalt = useInhalt();
  const { staende, erklaeren } = useApp();
  const [params, setParams] = useSearchParams();
  const [anzahl, setAnzahl] = useState(SEITE);
  const q = params.get('q') ?? '';
  const track = (TRACKS as readonly string[]).includes(params.get('track') ?? '') ? (params.get('track') as Track) : undefined;
  const thema = params.get('thema') ?? undefined;
  const detail = params.get('karte') ? inhalt.nachId.get(params.get('karte')!) : undefined;
  const erklaert = detail ? letztesErklaerErgebnis(erklaeren, detail.id) : undefined;
  const index = useMemo(() => baueSuchindex(inhalt.karten), [inhalt.karten]);
  const spaet = useDeferredValue(q);
  const treffer = useMemo(() => suche(index, spaet, { track, thema }), [index, spaet, track, thema]);
  const themen = useMemo(() => [...new Set(inhalt.karten.filter((k) => !track || k.track === track).map((k) => k.thema))].sort((a, b) => a.localeCompare(b, 'de')), [inhalt.karten, track]);

  const setze = (aend: Record<string, string | undefined>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(aend)) { if (v) n.set(k, v); else n.delete(k); }
    setParams(n, { replace: true });
    setAnzahl(SEITE);
  };

  return (
    <Seite titel="Lexikon" untertitel={`${inhalt.karten.length} Begriffe`} kinder={
      <div className="stapelung stapelung--eng">
        <label className="suchfeld">
          <Icon name="lupe" size={18} />
          <span className="sr-only">Suchen</span>
          <input type="search" value={q} placeholder="Suchen" onChange={(e) => setze({ q: e.target.value || undefined })} enterKeyHint="search" />
        </label>
        <div className="filterleiste" role="group" aria-label="Track filtern">
          {[undefined, ...TRACKS].map((t) => (
            <button key={t ?? 'alle'} type="button" className={`filterchip${track === t ? ' ist-aktiv' : ''}`} data-track={t}
              aria-pressed={track === t} onClick={() => setze({ track: t, thema: undefined })}>
              {t ? TRACK_KURZ[t] : 'Alle'}
            </button>
          ))}
        </div>
        <div className="filterleiste filterleiste--scroll" role="group" aria-label="Thema filtern">
          {themen.map((t) => (
            <button key={t} type="button" className={`filterchip filterchip--klein${thema === t ? ' ist-aktiv' : ''}`}
              aria-pressed={thema === t} onClick={() => setze({ thema: thema === t ? undefined : t })}>{t}</button>
          ))}
        </div>
        <p className="trefferzahl" role="status">{treffer.length} Treffer</p>
        <ul className="liste karte">
          {treffer.slice(0, anzahl).map((k) => {
            const s = stufeVon(staende[k.id]);
            return (
              <li key={k.id}>
                <button type="button" className="liste__zeile liste__zeile--zwei" onClick={() => setze({ karte: k.id })}>
                  <span className={`statuspunkt statuspunkt--${s}`} aria-label={STUFENTEXT[s]} />
                  <span className="liste__text"><span>{k.frage}</span><small>{k.thema} · {TRACK_KURZ[k.track]}</small></span>
                  <Icon name="weiter" size={16} />
                </button>
              </li>
            );
          })}
        </ul>
        {treffer.length > anzahl ? (
          <button type="button" className="knopf knopf--tint" onClick={() => setAnzahl(anzahl + SEITE)}>Mehr zeigen</button>
        ) : null}
        <Sheet offen={!!detail} onZu={() => setze({ karte: undefined })} titel={detail?.thema ?? ''} kinder={detail ? (
          <article className="lexikonblatt" data-track={detail.track}>
            <h3>{detail.frage}</h3>
            <p>{detail.antwort}</p>
            <footer><span className={`statuspunkt statuspunkt--${stufeVon(staende[detail.id])}`} />{STUFENTEXT[stufeVon(staende[detail.id])]} · Stufe {detail.stufe} · {detail.quelle}</footer>
            {erklaert ? (
              <p className="lexikonblatt__erklaert" data-testid="letztes-erklaeren">
                Zuletzt erklärt: {STUFE[erklaert.stufe].titel} · {erklaert.punkte}/{erklaert.max}{erklaert.modus === 'selbst' ? ' (Selbstcheck)' : ''}
              </p>
            ) : null}
            {erklaert?.text ? (
              <details className="erkl-details erkl-details--blatt">
                <summary><span>Deine letzte Fassung</span></summary>
                <div className="erkl-details__inhalt"><p className="erkl-eigen">{erklaert.text}</p></div>
              </details>
            ) : null}
            <Link className="knopf knopf--tint lexikonblatt__erklaeren" to={`/erklaeren/${encodeURIComponent(detail.id)}`} data-testid="erklaeren-starten">
              <Icon name="sprechen" size={20} /><span>Erklären üben</span>
            </Link>
          </article>
        ) : null} />
      </div>
    } />
  );
}
