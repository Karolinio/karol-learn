import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/ui/Icon';
import { Seite } from '../components/ui/Seite';
import { useApp } from '../lib/zustand';

function Zeile({ zu, icon, titel, unter, farbe }: { zu: string; icon: IconName; titel: string; unter?: string; farbe: string }) {
  return (
    <li>
      <Link to={zu} className="liste__zeile">
        <span className="appicon" style={{ background: farbe }} aria-hidden><Icon name={icon} size={18} /></span>
        <span className="liste__text"><span>{titel}</span>{unter ? <small>{unter}</small> : null}</span>
        <Icon name="weiter" size={16} />
      </Link>
    </li>
  );
}

export function Mehr() {
  const { server } = useApp();
  return (
    <Seite titel="Mehr" kinder={
      <div className="stapelung">
        <section aria-labelledby="mehr-lernen">
          <h2 id="mehr-lernen" className="abschnitt">Lernstand</h2>
          <ul className="liste karte">
            <Zeile zu="/fortschritt/aie" icon="balken" titel="Fortschritt AI Engineer" farbe="var(--color-aie)" />
            <Zeile zu="/fortschritt/fde" icon="balken" titel="Fortschritt Forward Deployed" farbe="var(--color-fde)" />
          </ul>
        </section>
        <section aria-labelledby="mehr-app">
          <h2 id="mehr-app" className="abschnitt">App</h2>
          <ul className="liste karte">
            {server ? <Zeile zu="/eingang" icon="eingang" titel="Eingang" unter="Vorschläge vom Video-Tutor" farbe="var(--color-green-ink)" /> : null}
            <Zeile zu="/einstellungen" icon="zahnrad" titel="Einstellungen" unter="Export, Import, Server" farbe="var(--color-text-3)" />
          </ul>
        </section>
      </div>
    } />
  );
}
