import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

// Höchstens fünf Tabs (Apple HIG). Detailseiten lassen ihren Tab aktiv.
const TABS: { zu: string; name: string; icon: IconName; ende?: boolean; auch?: string[] }[] = [
  { zu: '/', name: 'Heute', icon: 'heute', ende: true },
  { zu: '/roadmap', name: 'Roadmap', icon: 'roadmap', auch: ['/thema/'] },
  { zu: '/skizzen', name: 'Skizzen', icon: 'diagramm', auch: ['/skizze/', '/labor'] },
  { zu: '/lexikon', name: 'Lexikon', icon: 'lexikon' },
  { zu: '/mehr', name: 'Mehr', icon: 'mehr', auch: ['/einstellungen', '/fortschritt', '/eingang'] },
];

export function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      {TABS.map((t) => {
        const auch = t.auch?.some((p) => pathname.startsWith(p)) ?? false;
        return (
          <NavLink key={t.zu} to={t.zu} end={t.ende}
            className={({ isActive }) => `tabbar__tab${isActive || auch ? ' ist-aktiv' : ''}`}
            aria-current={auch ? 'page' : undefined}>
            <Icon name={t.icon} size={26} />
            <span>{t.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
