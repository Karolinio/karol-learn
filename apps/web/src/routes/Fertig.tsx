import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { tagesserie } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { ProgressRing } from '../components/ui/ProgressRing';
import { heute, terminText } from '../lib/datum';
import { useApp } from '../lib/zustand';

const FUNKEN = 14;
const FARBEN = ['var(--color-green)', 'var(--akzent)', 'var(--color-orange)', 'var(--color-yellow)', 'var(--color-pink)'];

function Feier() {
  const ruhig = useReducedMotion();
  if (ruhig) return null;
  return (
    <div className="feier" aria-hidden>
      {Array.from({ length: FUNKEN }, (_, i) => {
        const winkel = (i / FUNKEN) * Math.PI * 2;
        const weite = 110 + (i % 3) * 26;
        return (
          <motion.span key={i} className="feier__funke" style={{ background: FARBEN[i % FARBEN.length] }}
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
            animate={{ x: Math.cos(winkel) * weite, y: Math.sin(winkel) * weite, scale: [0.2, 1.1, 0.6], opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, delay: 0.25 + (i % 4) * 0.03, ease: [0.16, 1, 0.3, 1] }} />
        );
      })}
    </div>
  );
}

export function Fertig() {
  const { sessions, staende } = useApp();
  const ort = useLocation();
  const navigate = useNavigate();
  const ruhig = useReducedMotion();
  const sid = (ort.state as { sessionId?: string } | null)?.sessionId;
  const s = sessions.find((x) => x.id === sid) ?? sessions[sessions.length - 1];

  useEffect(() => { document.title = 'Geschafft · karol-learn'; }, []);

  if (!s) {
    return (
      <main className="leer" id="inhalt"><h1>Noch keine Session</h1><Link className="knopf knopf--primaer" to="/">Zu Heute</Link></main>
    );
  }
  const erste = new Map<string, boolean>();
  for (const a of s.antworten) if (!erste.has(a.id)) erste.set(a.id, a.gewusst);
  const gewusst = [...erste.values()].filter(Boolean).length;
  const gesamt = erste.size;
  const termine = s.karten.map((id) => staende[id]?.faellig).filter((f): f is string => !!f).sort();
  const naechster = termine.find((t) => t > heute()) ?? termine[0];
  const serie = tagesserie(sessions.filter((x) => x.ende).map((x) => heute(new Date(x.start))), heute());
  const minuten = Math.max(1, Math.round(s.antworten.reduce((m, a) => m + a.ms, 0) / 60000));
  const satz = gewusst === gesamt ? 'Alles gewusst.' : gewusst >= gesamt / 2 ? 'Stark gemacht.' : 'Gut, dass du drangeblieben bist.';

  return (
    <main className="fertig" id="inhalt" data-track={s.track}>
      <div className="fertig__buehne">
        <Feier />
        <motion.div initial={ruhig ? { opacity: 0 } : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.45, duration: 0.7 }}>
          <ProgressRing anteil={gesamt ? gewusst / gesamt : 0} groesse={176} staerke={16} farbe="var(--color-green)"
            label={`${gewusst} von ${gesamt} gewusst`}
            kind={<span className="fertig__zahl">{gewusst}<small>/{gesamt}</small></span>} />
        </motion.div>
      </div>
      <motion.div className="fertig__text" initial={{ opacity: 0, y: ruhig ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
        <h1>{satz}</h1>
        <p>{gewusst} von {gesamt} gewusst · {minuten} Min.</p>
      </motion.div>
      <ul className="fertig__fakten">
        <li><Icon name="flamme" size={20} /><span><strong>{serie}</strong> {serie === 1 ? 'Tag' : 'Tage'} in Folge</span></li>
        <li><Icon name="schleife" size={20} /><span>Nächster Termin: <strong>{terminText(naechster)}</strong></span></li>
      </ul>
      <div className="fertig__knoepfe">
        <Button gross onClick={() => navigate(`/stapel/${s.track}`, { replace: true })} icon="stapel">Noch eine Runde</Button>
        <Button gross variante="tint" onClick={() => navigate('/')}>Fertig</Button>
      </div>
    </main>
  );
}
