import { useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/ui/TabBar';
import { useApp } from './lib/zustand';
import { Eingang } from './routes/Eingang';
import { Einstellungen } from './routes/Einstellungen';
import { Fertig } from './routes/Fertig';
import { Fortschritt } from './routes/Fortschritt';
import { Heute } from './routes/Heute';
import { Labor } from './routes/Labor';
import { LaborFall } from './routes/LaborFall';
import { LaborSimulator } from './routes/LaborSimulator';
import { Lexikon } from './routes/Lexikon';
import { Mehr } from './routes/Mehr';
import { Roadmap, RoadmapWeiche } from './routes/Roadmap';
import { SkizzeSeite } from './routes/Skizze';
import { Skizzen } from './routes/Skizzen';
import { Thema } from './routes/Thema';
import { Stapel } from './routes/Stapel';

const OHNE_TABS = ['/stapel', '/fertig'];

function Rahmen() {
  const { laden, fehler, einstellungen, speicherArt } = useApp();
  const ort = useLocation();
  const tabs = !OHNE_TABS.some((p) => ort.pathname.startsWith(p));

  useEffect(() => { document.documentElement.dataset.track = einstellungen.track; }, [einstellungen.track]);
  useEffect(() => { window.scrollTo(0, 0); }, [ort.pathname]);

  if (laden === 'laedt') return <div className="startbild" role="status" aria-label="Lädt" />;
  if (laden === 'fehler') {
    return <main className="leer" id="inhalt"><h1>Inhalt nicht ladbar</h1><p>{fehler}</p></main>;
  }
  return (
    <>
      <a className="sprunglink" href="#inhalt">Zum Inhalt</a>
      {speicherArt === 'ram' ? <p className="ramhinweis" role="alert">Kein dauerhafter Speicher. Dein Lernstand geht beim Schließen verloren. Exportiere ihn in den Einstellungen.</p> : null}
      <Routes>
        <Route path="/" element={<Heute />} />
        <Route path="/stapel/:track" element={<Stapel />} />
        <Route path="/fertig" element={<Fertig />} />
        <Route path="/fortschritt/:track" element={<Fortschritt />} />
        <Route path="/roadmap" element={<RoadmapWeiche />} />
        <Route path="/roadmap/:track" element={<Roadmap />} />
        <Route path="/lexikon" element={<Lexikon />} />
        <Route path="/thema/:track/:slug" element={<Thema />} />
        <Route path="/skizzen" element={<Skizzen />} />
        <Route path="/skizze/:id" element={<SkizzeSeite />} />
        <Route path="/labor" element={<Labor />} />
        <Route path="/labor/simulator" element={<LaborSimulator />} />
        <Route path="/labor/fall/:id" element={<LaborFall />} />
        <Route path="/eingang" element={<Eingang />} />
        <Route path="/einstellungen" element={<Einstellungen />} />
        <Route path="/mehr" element={<Mehr />} />
        <Route path="*" element={<Heute />} />
      </Routes>
      {tabs ? <TabBar /> : null}
    </>
  );
}

export function App() {
  return <HashRouter><Rahmen /></HashRouter>;
}
