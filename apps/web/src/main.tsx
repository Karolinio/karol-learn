import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { App } from './App';
import { AppProvider } from './lib/zustand';
import './styles/tokens.css';
import './styles/global.css';
import './styles/komponenten.css';
import './styles/seiten.css';
import './styles/skizzen.css';
import './styles/thema.css';
import './labor/labor.css';
import './erklaeren/erklaeren.css';

const wurzel = document.getElementById('app');
if (!wurzel) throw new Error('#app fehlt');
createRoot(wurzel).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppProvider><App /></AppProvider>
    </MotionConfig>
  </StrictMode>,
);
