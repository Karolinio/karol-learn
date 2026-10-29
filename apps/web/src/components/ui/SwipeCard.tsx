import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue, type PanInfo } from 'framer-motion';
import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode } from 'react';
import type { Karte } from '@karol-learn/karten-kern';
import { Icon } from './Icon';

export const AUSLOESE_WEG = 110;
const AUSLOESE_TEMPO = 600;
const MAX_DREHUNG = 12;
const TIEFE_Y = 12;
const TIEFE_SKALA = 0.045;

export interface SwipeCardSteuerung { werfe: (gewusst: boolean) => void }

interface Props {
  karte: Karte;
  naechste: readonly Karte[];
  gedreht: boolean;
  onDrehen: () => void;
  onAntwort: (gewusst: boolean) => void;
  labels?: { ja: string; nein: string };
  /** Themenbild, klein auf der Vorderseite. */
  bild?: string;
  /** Knopf auf der Rückseite, z. B. „Skizze ansehen“. */
  rueckKnopf?: { text: string; onKlick: () => void };
}

/** Knopf in der Karte: Zeiger-Ereignisse dürfen nicht zum Ziehen oder Drehen der Karte werden. */
function KartenKnopf({ onKlick, kinder }: { onKlick: () => void; kinder: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const halt = (e: Event) => e.stopPropagation();
    el.addEventListener('pointerdown', halt);
    return () => el.removeEventListener('pointerdown', halt);
  }, []);
  return <button ref={ref} type="button" className="kartenknopf" onClick={(e) => { e.stopPropagation(); onKlick(); }}>{kinder}</button>;
}

function Hinten({ karte, stufe, x }: { karte: Karte; stufe: 1 | 2; x: MotionValue<number> }) {
  const weg = useTransform(x, (v) => Math.min(Math.abs(v) / AUSLOESE_WEG, 1));
  const y = useTransform(weg, (p) => TIEFE_Y * (stufe - p));
  const scale = useTransform(weg, (p) => 1 - TIEFE_SKALA * (stufe - p));
  return (
    <motion.div className={`lernkarte lernkarte--hinten lernkarte--tiefe-${stufe}`} style={{ y, scale }} aria-hidden>
      <span className="chip">{karte.thema}</span>
    </motion.div>
  );
}

function Stufe({ n }: { n: number }) {
  return (
    <span className="stufenpunkte" aria-label={`Stufe ${n} von 3`}>
      {[1, 2, 3].map((i) => <span key={i} className={i <= n ? 'ist-voll' : ''} />)}
    </span>
  );
}

export const SwipeCard = forwardRef<SwipeCardSteuerung, Props>(function SwipeCard({ karte, naechste, gedreht, onDrehen, onAntwort, labels = { ja: 'Wusste ich', nein: 'Nochmal' }, bild, rueckKnopf }, ref) {
  const ruhig = useReducedMotion() ?? false;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-MAX_DREHUNG, 0, MAX_DREHUNG]);
  const gruen = useTransform(x, [0, AUSLOESE_WEG], [0, 1]);
  const rot = useTransform(x, [-AUSLOESE_WEG, 0], [1, 0]);
  const deckung = useTransform(x, (v) => (ruhig ? 1 - Math.min(Math.abs(v) / 600, 0.6) : 1));
  const fliegt = useRef(false);
  const weg = useRef(false);
  useEffect(() => { weg.current = false; return () => { weg.current = true; }; }, []);

  const werfe = (gewusst: boolean, tempo = 0) => {
    if (fliegt.current) return;
    fliegt.current = true;
    const ziel = (gewusst ? 1 : -1) * (window.innerWidth + 240);
    // Nach dem Verlassen der Seite nicht mehr werten (sonst springt die App zu „Fertig“).
    const fertig = () => { if (!weg.current) onAntwort(gewusst); };
    if (ruhig) {
      x.set(gewusst ? AUSLOESE_WEG : -AUSLOESE_WEG);
      setTimeout(fertig, 160);
      return;
    }
    void animate(x, ziel, { type: 'spring', velocity: tempo, bounce: 0, duration: 0.38 }).then(fertig);
  };

  useImperativeHandle(ref, () => ({ werfe: (g) => werfe(g) }));

  const ende = (_: unknown, info: PanInfo) => {
    const weit = Math.abs(info.offset.x) > AUSLOESE_WEG;
    const schnell = Math.abs(info.velocity.x) > AUSLOESE_TEMPO && Math.sign(info.velocity.x) === Math.sign(info.offset.x);
    if (weit || schnell) werfe(info.offset.x > 0, info.velocity.x);
    else void animate(x, 0, { type: 'spring', velocity: info.velocity.x, bounce: 0.25, duration: 0.45 });
  };

  return (
    <div className="kartenstapel">
      {naechste.slice(0, 2).reverse().map((k, i, liste) => (
        <Hinten key={k.id} karte={k} stufe={(liste.length - i) as 1 | 2} x={x} />
      ))}
      <motion.div
        className="lernkarte lernkarte--oben"
        style={{ x, rotate: ruhig ? 0 : rotate, opacity: deckung }}
        drag="x" dragSnapToOrigin={false} dragElastic={0.9} dragMomentum={false}
        onDragEnd={ende}
        onTap={() => { if (!fliegt.current) onDrehen(); }}
        whileTap={{ scale: 0.985 }}
        role="button" tabIndex={0} aria-pressed={gedreht}
        aria-label={gedreht ? `Antwort: ${karte.antwort}` : `Frage: ${karte.frage}. Leertaste dreht die Karte.`}
        data-testid="lernkarte"
      >
        <motion.div className="lernkarte__dreher"
          animate={ruhig ? undefined : { rotateY: gedreht ? 180 : 0 }}
          transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}>
          <div className={`lernkarte__seite lernkarte__vorne${ruhig && gedreht ? ' ist-weg' : ''}`}>
            <div className="lernkarte__kopf"><span className="chip">{karte.thema}</span><Stufe n={karte.stufe} /></div>
            <p className="lernkarte__frage">{karte.frage}</p>
            <div className="lernkarte__fuss">
              <p className="lernkarte__hinweis">Tippen zum Umdrehen</p>
              {bild ? <img className="lernkarte__bild" src={bild} width={88} height={66} alt="" loading="lazy" decoding="async" draggable={false} /> : null}
            </div>
          </div>
          <div className={`lernkarte__seite lernkarte__hinten${ruhig ? (gedreht ? ' ist-da' : ' ist-weg') : ''}`}>
            <div className="lernkarte__kopf"><span className="chip chip--leise">Antwort</span><Stufe n={karte.stufe} /></div>
            <p className="lernkarte__rueckfrage">{karte.frage}</p>
            <div className="lernkarte__antwortblock">
              <p className="lernkarte__antwort">{karte.antwort}</p>
              {karte.erklaerhilfe ? <p className="lernkarte__hilfe"><b>Stell dir vor:</b> {karte.erklaerhilfe}</p> : null}
            </div>
            <div className="lernkarte__fuss lernkarte__fuss--hinten">
              <p className="lernkarte__quelle">Quelle: {karte.quelle}</p>
              {rueckKnopf && gedreht ? <KartenKnopf onKlick={rueckKnopf.onKlick} kinder={<><Icon name="diagramm" size={16} />{rueckKnopf.text}</>} /> : null}
            </div>
          </div>
        </motion.div>
        <motion.div className="lernkarte__schleier lernkarte__schleier--gruen" style={{ opacity: gruen }} aria-hidden />
        <motion.div className="lernkarte__schleier lernkarte__schleier--rot" style={{ opacity: rot }} aria-hidden />
        <motion.span className="stempel stempel--gruen" style={{ opacity: gruen }} aria-hidden>{labels.ja}</motion.span>
        <motion.span className="stempel stempel--rot" style={{ opacity: rot }} aria-hidden>{labels.nein}</motion.span>
      </motion.div>
    </div>
  );
});

