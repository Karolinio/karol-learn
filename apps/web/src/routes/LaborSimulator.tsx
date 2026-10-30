import { useEffect, useMemo, useState } from 'react';
import { simuliere, type Grundlauf, type HarnessRegler } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Seite } from '../components/ui/Seite';
import { Sheet } from '../components/ui/Sheet';
import { ENDE_TEXT, endeTon, laufZahlen, usd } from '../labor/format';
import { LaufAnsicht } from '../labor/LaufAnsicht';
import { ReglerFeld } from '../labor/ReglerFeld';
import { useAbspielen } from '../labor/useAbspielen';
import { useInhalt } from '../lib/zustand';

const BREIT = '(min-width: 1024px)';

function useIstBreit(): boolean {
  const [breit, setBreit] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(BREIT).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return undefined;
    const m = matchMedia(BREIT);
    const wechsel = () => setBreit(m.matches);
    m.addEventListener('change', wechsel);
    return () => m.removeEventListener('change', wechsel);
  }, []);
  return breit;
}

function Simulator({ grundlauf }: { grundlauf: Grundlauf }) {
  const [regler, setRegler] = useState<HarnessRegler>(grundlauf.regler);
  const [reglerOffen, setReglerOffen] = useState(false);
  const breit = useIstBreit();
  const lauf = useMemo(() => simuliere(grundlauf.skript, regler), [grundlauf.skript, regler]);
  // Startet am Ende, und jede Regleränderung (neuer Lauf) springt wieder dorthin.
  const abspielen = useAbspielen(lauf.schritte.length, { auto: false, start: Number.MAX_SAFE_INTEGER, endeBei: lauf });
  const z = laufZahlen(lauf);
  const regel = <ReglerFeld regler={regler} onRegler={setRegler} onZurueck={() => setRegler(grundlauf.regler)} />;

  const ergebnis = (
    <section className="karte simergebnis" aria-label="Ergebnis des Laufs">
      <p className={`simergebnis__ende ton-${endeTon(z.ende)}`}>{ENDE_TEXT[z.ende]}<small>nach {z.runden} {z.runden === 1 ? 'Runde' : 'Runden'}</small></p>
      <p className="simergebnis__kosten" data-testid="gesamtkosten">{usd(z.usd)}<small>gesamt, Beispielpreise</small></p>
    </section>
  );

  return (
    <div className="simlayout" data-track={grundlauf.track}>
      <div className="stapelung">
        {/* Nur eine Ergebniskarte gemountet: bei offenem Regler-Sheet steht sie dort. */}
        {reglerOffen && !breit ? null : ergebnis}
        {breit ? null : <Button gross variante="tint" icon="zahnrad" onClick={() => setReglerOffen(true)}>Regler</Button>}
        <LaufAnsicht lauf={lauf} limit={regler.kontextLimit} abspielen={abspielen} mitKosten={false} />
      </div>
      {breit ? <aside className="simlayout__seite" aria-label="Regler"><h2 className="abschnitt">Regler</h2>{regel}</aside> : null}
      {breit ? null : <Sheet offen={reglerOffen} onZu={() => setReglerOffen(false)} titel="Regler" kinder={<>{ergebnis}{regel}</>} />}
    </div>
  );
}

/** /labor/simulator: der Grundlauf mit allen Harness-Reglern. */
export function LaborSimulator() {
  const inhalt = useInhalt();
  const grundlauf = inhalt.grundlaeufe[0];
  return (
    <Seite titel="Simulator" untertitel={grundlauf?.titel} zurueck="/labor" kinder={
      grundlauf ? <Simulator grundlauf={grundlauf} /> : <p className="karte hinweistext">Kein Grundlauf im Inhalt.</p>
    } />
  );
}
