import { useLocation, useParams } from 'react-router-dom';
import { Seite } from '../components/ui/Seite';
import { useInhalt } from '../lib/zustand';
import { findeSkizze } from '../skizzen/registry';

/** /skizze/:id, auch die alte Adresse /skizze/agent-loop. */
export function SkizzeSeite() {
  const { id } = useParams();
  const ort = useLocation();
  const inhalt = useInhalt();
  const skizze = findeSkizze(id, inhalt.themen);
  // Mit Verlauf in der App zurück dorthin, sonst zur Liste.
  const zurueck = ort.key === 'default' ? '/skizzen' : -1;
  if (!skizze) {
    return <Seite titel="Skizze" zurueck="/skizzen" kinder={<p className="karte hinweistext">Diese Skizze gibt es hier nicht.</p>} />;
  }
  const { Komponente } = skizze;
  return (
    <Seite titel={skizze.titel} untertitel={skizze.kurztext} zurueck={zurueck} klasse="skizzenseite" kinder={<Komponente key={skizze.id} />} />
  );
}
