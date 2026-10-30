import { useEffect, useReducer } from 'react';
import { useParams } from 'react-router-dom';
import { starteStoerfall, stoerfallSchritt, type Szenario } from '@karol-learn/karten-kern';
import { Seite } from '../components/ui/Seite';
import { TRACK_NAME } from '../components/ui/TrackSegment';
import { FertigPhase, Fallschritte, ReparaturPhase, SymptomPhase, UrsachePhase, VergleichPhase } from '../labor/FallPhasen';
import { useApp, useInhalt } from '../lib/zustand';

function Fall({ szenario, naechster }: { szenario: Szenario; naechster?: string }) {
  const { speichereLaborErgebnis } = useApp();
  const [z, senden] = useReducer(stoerfallSchritt, szenario, starteStoerfall);
  useEffect(() => { if (z.ergebnis) speichereLaborErgebnis(z.ergebnis); }, [z.ergebnis, speichereLaborErgebnis]);
  // Jede neue Phase beginnt oben: eine Entscheidung pro Bildschirm.
  useEffect(() => { window.scrollTo(0, 0); }, [z.phase]);

  const phase = {
    symptom: <SymptomPhase z={z} senden={senden} />,
    ursache: <UrsachePhase z={z} senden={senden} />,
    reparatur: <ReparaturPhase z={z} senden={senden} />,
    vergleich: <VergleichPhase z={z} senden={senden} />,
    fertig: <FertigPhase z={z} senden={senden} naechster={naechster} />,
  }[z.phase];

  return (
    <div className="stapelung" data-track={szenario.track} data-phase={z.phase}>
      <Fallschritte z={z} />
      {phase}
    </div>
  );
}

/** /labor/fall/:id: ein Störfall von Symptom bis Vergleich. */
export function LaborFall() {
  const { id } = useParams();
  const { labor } = useApp();
  const inhalt = useInhalt();
  const szenario = inhalt.labor.find((s) => s.id === id);
  if (!szenario) {
    return <Seite titel="Störfall" zurueck="/labor" kinder={<p className="karte hinweistext">Diesen Störfall gibt es hier nicht.</p>} />;
  }
  const geloest = new Set(labor.filter((e) => e.geloest).map((e) => e.szenarioId));
  const naechster = inhalt.labor.find((s) => s.track === szenario.track && s.id !== szenario.id && !geloest.has(s.id))?.id;
  return (
    <Seite titel={szenario.titel} untertitel={`Störfall · ${TRACK_NAME[szenario.track]}`} zurueck="/labor" klasse={`track-${szenario.track}`}
      kinder={<Fall key={szenario.id} szenario={szenario} naechster={naechster} />} />
  );
}
