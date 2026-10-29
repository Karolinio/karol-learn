import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Track } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useInhalt } from '../lib/zustand';
import type { SkizzenSchritt } from './typen';

/** true, wenn die Skizze im Stapel als Sheet läuft: dann keine Links, die die Session verlassen. */
export const EingebettetKontext = createContext(false);

function istEingabe(ziel: EventTarget | null): boolean {
  const el = ziel as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/** Bühne + Schritttext + Steuerung. Pfeiltasten blättern, die Steuerung bleibt immer sichtbar. */
export function SkizzenRahmen({ track, label, schritte, index, onIndex, bild, extra }: {
  track: Track; label: string; schritte: readonly Pick<SkizzenSchritt, 'titel' | 'text' | 'karte'>[];
  index: number; onIndex: (n: number) => void; bild: ReactNode; extra?: ReactNode;
}) {
  const inhalt = useInhalt();
  const ruhig = useReducedMotion();
  const eingebettet = useContext(EingebettetKontext);
  const i = Math.min(index, schritte.length - 1);
  const schritt = schritte[i]!;
  const karte = schritt.karte ? inhalt.nachId.get(schritt.karte) : undefined;
  const geh = (d: number) => onIndex(Math.max(0, Math.min(schritte.length - 1, i + d)));

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (istEingabe(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); geh(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); geh(-1); }
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  });

  return (
    <div className={`skizze${eingebettet ? ' skizze--eingebettet' : ''}`} data-track={track}>
      <div className="skizze__buehne karte" role="group" aria-label={label}>{bild}</div>
      <div className="skizze__seite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={i} className="karte skizze__schritt" aria-live="polite"
            initial={{ opacity: 0, y: ruhig ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: ruhig ? 0 : -8 }}
            transition={{ duration: 0.2 }}>
            <p className="ueberzeile">Schritt {i + 1} von {schritte.length}</p>
            <h2>{schritt.titel}</h2>
            <p>{schritt.text}</p>
            {karte && !eingebettet ? (
              <Link className="textlink" to={`/lexikon?karte=${encodeURIComponent(karte.id)}`}>
                <Icon name="lexikon" size={18} /> Im Lexikon: {karte.frage}
              </Link>
            ) : null}
          </motion.section>
        </AnimatePresence>
        <div className="skizze__steuerung" data-testid="skizze-steuerung">
          <Button variante="tint" icon="zurueck" onClick={() => geh(-1)} disabled={i === 0} aria-label="Vorheriger Schritt" />
          <div className="punkte" aria-hidden>{schritte.map((s, n) => <span key={`${n}-${s.titel}`} className={n === i ? 'ist-aktiv' : ''} />)}</div>
          <Button onClick={() => geh(1)} disabled={i === schritte.length - 1} aria-label="Nächster Schritt">Weiter</Button>
        </div>
        {extra}
      </div>
    </div>
  );
}
