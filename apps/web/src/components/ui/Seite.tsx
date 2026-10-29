import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/** iOS-Seite: Large Title, der beim Scrollen in eine glasige Leiste wandert. */
export function Seite({ titel, untertitel, zurueck, aktion, kinder, klasse = '' }: {
  titel: string; untertitel?: ReactNode; zurueck?: string | -1; aktion?: ReactNode; kinder: ReactNode; klasse?: string;
}) {
  const marke = useRef<HTMLDivElement>(null);
  const [kompakt, setKompakt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const el = marke.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setKompakt(!e?.isIntersecting), { rootMargin: '-52px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => { document.title = `${titel} · karol-learn`; }, [titel]);

  return (
    <div className={`seite ${klasse}`}>
      <header className={`navleiste${kompakt ? ' ist-kompakt' : ''}`}>
        <div className="navleiste__links">
          {zurueck ? (
            <button type="button" className="navleiste__zurueck" onClick={() => (zurueck === -1 ? navigate(-1) : navigate(zurueck))} aria-label="Zurück">
              <Icon name="zurueck" size={22} /><span>Zurück</span>
            </button>
          ) : null}
        </div>
        <p className="navleiste__titel" aria-hidden={!kompakt}>{titel}</p>
        <div className="navleiste__rechts">{aktion}</div>
      </header>
      <main className="seite__inhalt" id="inhalt">
        <div className="grosstitel">
          <h1>{titel}</h1>
          {untertitel ? <p className="grosstitel__unter">{untertitel}</p> : null}
        </div>
        <div ref={marke} aria-hidden className="grosstitel__marke" />
        {kinder}
      </main>
    </div>
  );
}
