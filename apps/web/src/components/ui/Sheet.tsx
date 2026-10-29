import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

const SCHLIESS_WEG = 120;
const SCHLIESS_TEMPO = 600;

/** Bottom Sheet mit Abdunklung, Wischen nach unten und Escape zum Schließen. */
export function Sheet({ offen, onZu, titel, kinder, gross }: { offen: boolean; onZu: () => void; titel: string; kinder: ReactNode; gross?: boolean }) {
  const ruhig = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const vorher = useRef<HTMLElement | null>(null);
  // onZu in einer Ref: sonst läuft der Effekt bei jedem Neu-Rendern des Elternteils und zieht den Fokus hin und her.
  const zu = useRef(onZu);
  useEffect(() => { zu.current = onZu; }, [onZu]);

  useEffect(() => {
    if (!offen) return;
    vorher.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => box.current?.focus(), 30);
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') zu.current(); };
    window.addEventListener('keydown', taste);
    return () => { clearTimeout(t); window.removeEventListener('keydown', taste); vorher.current?.focus?.(); };
  }, [offen]);

  const ende = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SCHLIESS_WEG || info.velocity.y > SCHLIESS_TEMPO) onZu();
  };
  const feder = { type: 'spring', bounce: 0, duration: 0.42 } as const;

  return (
    <AnimatePresence>
      {offen ? (
        <div className="sheet-ebene">
          <motion.div className="sheet-abdunkeln" onClick={onZu} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div ref={box} className={`sheet${gross ? ' sheet--gross' : ''}`} role="dialog" aria-modal="true" aria-label={titel} tabIndex={-1}
            initial={ruhig ? { opacity: 0 } : { y: '100%' }} animate={ruhig ? { opacity: 1 } : { y: 0 }}
            exit={ruhig ? { opacity: 0 } : { y: '100%' }} transition={feder}
            drag={ruhig || gross ? false : 'y'} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 0.7 }} onDragEnd={ende}>
            <div className="sheet__griff" aria-hidden />
            <div className="sheet__kopf">
              <h2>{titel}</h2>
              <button type="button" className="rundknopf" onClick={onZu} aria-label="Schließen">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="sheet__inhalt">{kinder}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
