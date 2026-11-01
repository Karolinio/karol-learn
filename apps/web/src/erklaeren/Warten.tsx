import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';

const LANG_MS = 30_000;

/** Bildschirm 3: ruhiges Warten ohne Prozentbalken. Reduced Motion: statisch. */
export function Warten({ onAbbrechen }: { onAbbrechen: () => void }) {
  const [lang, setLang] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLang(true), LANG_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="karte erkl-warten" aria-live="polite" aria-busy="true" data-testid="warten">
      <div className="erkl-warten__punkte" aria-hidden><span /><span /><span /></div>
      <h2>Claude liest deine Erklärung.</h2>
      <p>Das dauert meist 10–40 Sekunden.</p>
      <p className="erkl-warten__lang">{lang ? 'Dauert etwas länger, alles gut.' : ' '}</p>
      <Button variante="tint" onClick={onAbbrechen}>Abbrechen</Button>
    </section>
  );
}
