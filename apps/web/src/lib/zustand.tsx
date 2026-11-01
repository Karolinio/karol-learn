import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  bewerte, erklaerErgebnisSchema, laborErgebnisSchema, merkeErklaerErgebnis, merkeLaborErgebnis,
  type ErklaerErgebnis, type LaborErgebnis, type Lernstand, type Session, type Track,
} from '@karol-learn/karten-kern';
import { heute } from './datum';
import { ladeInhalt, type Inhalt } from './inhalt';
import { serverStatus, meldeAnServer } from './server';
import { baueExport, bitteUmDauer, einstellungenSchema, gueltigeEintraege, oeffneSpeicher, type Einstellungen, type Speicher, type SpeicherExport } from './speicher';

type Staende = Readonly<Record<string, Lernstand>>;
interface Meldung { id: string; grund: string; zeit: string }

export interface AppZustand {
  laden: 'laedt' | 'fehler' | 'bereit';
  fehler?: string;
  inhalt?: Inhalt;
  staende: Staende;
  sessions: readonly Session[];
  /** Gelöste Störfälle, höchstens einer je Szenario. */
  labor: readonly LaborErgebnis[];
  /** Erklär-Training: je Karte die letzten zehn Ergebnisse, mit Karols letzter Fassung. */
  erklaeren: readonly ErklaerErgebnis[];
  einstellungen: Einstellungen;
  speicherArt?: Speicher['art'];
  server: boolean;
  /** Server mit Erklär-Coach erreichbar; sonst Selbstcheck. */
  coach: boolean;
  bewerteKarte: (id: string, gewusst: boolean) => void;
  speichereSession: (s: Session) => void;
  speichereLaborErgebnis: (e: LaborErgebnis) => void;
  speichereErklaerErgebnis: (e: ErklaerErgebnis) => void;
  setzeTrack: (t: Track) => void;
  setzeNeue: (n: Einstellungen['neueProSession']) => void;
  melde: (id: string, grund: string) => Promise<'server' | 'lokal'>;
  exportiere: () => SpeicherExport;
  importiere: (d: SpeicherExport) => void;
  setzeZurueck: () => void;
  pruefeServer: () => Promise<void>;
}

const Kontext = createContext<AppZustand | null>(null);
const MAX_SESSIONS = 365;
const STANDARD: Einstellungen = einstellungenSchema.parse({});

export function AppProvider({ children }: { children: ReactNode }) {
  const [inhalt, setInhalt] = useState<Inhalt>();
  const [laden, setLaden] = useState<AppZustand['laden']>('laedt');
  const [fehler, setFehler] = useState<string>();
  const [staende, setStaende] = useState<Staende>({});
  const [sessions, setSessions] = useState<readonly Session[]>([]);
  const [labor, setLabor] = useState<readonly LaborErgebnis[]>([]);
  const [erklaeren, setErklaeren] = useState<readonly ErklaerErgebnis[]>([]);
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(STANDARD);
  const [server, setServer] = useState(false);
  const [coach, setCoach] = useState(false);
  const [speicherArt, setSpeicherArt] = useState<Speicher['art']>();
  const speicher = useRef<Speicher>();

  const schreibe = useCallback((schluessel: string, wert: unknown) => {
    speicher.current?.schreibe(schluessel, wert).catch(() => setSpeicherArt('ram'));
  }, []);

  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const sp = await oeffneSpeicher();
        speicher.current = sp;
        const [i, st, se, ei, la, er] = await Promise.all([
          ladeInhalt(),
          sp.lies<Staende>('lernstand'),
          sp.lies<Session[]>('sessions'),
          sp.lies<unknown>('einstellungen'),
          sp.lies<unknown>('labor'),
          sp.lies<unknown>('erklaeren'),
        ]);
        if (!aktiv) return;
        setInhalt(i);
        setStaende(st ?? {});
        setSessions(se ?? []);
        setLabor(gueltigeEintraege(laborErgebnisSchema, la));
        setErklaeren(gueltigeEintraege(erklaerErgebnisSchema, er));
        setEinstellungen(einstellungenSchema.catch(STANDARD).parse(ei ?? {}));
        setSpeicherArt(sp.art);
        setLaden('bereit');
        void bitteUmDauer();
      } catch (e) {
        if (!aktiv) return;
        setFehler((e as Error).message);
        setLaden('fehler');
      }
    })();
    void serverStatus().then((st) => { if (aktiv) { setServer(st.da); setCoach(st.erklaeren); } });
    return () => { aktiv = false; };
  }, []);

  const bewerteKarte = useCallback((id: string, gewusst: boolean) => {
    setStaende((alt) => {
      const neu = { ...alt, [id]: bewerte(alt[id], gewusst, heute(), id) };
      schreibe('lernstand', neu);
      return neu;
    });
  }, [schreibe]);

  const speichereSession = useCallback((s: Session) => {
    setSessions((alt) => {
      const neu = [...alt.filter((x) => x.id !== s.id), s].slice(-MAX_SESSIONS);
      schreibe('sessions', neu);
      return neu;
    });
  }, [schreibe]);

  const speichereLaborErgebnis = useCallback((e: LaborErgebnis) => {
    setLabor((alt) => {
      const neu = merkeLaborErgebnis(alt, e);
      schreibe('labor', neu);
      return neu;
    });
  }, [schreibe]);

  const speichereErklaerErgebnis = useCallback((e: ErklaerErgebnis) => {
    setErklaeren((alt) => {
      const neu = merkeErklaerErgebnis(alt, e);
      schreibe('erklaeren', neu);
      return neu;
    });
  }, [schreibe]);

  const setzeTrack = useCallback((track: Track) => {
    setEinstellungen((alt) => { const neu = { ...alt, track }; schreibe('einstellungen', neu); return neu; });
  }, [schreibe]);

  const setzeNeue = useCallback((neueProSession: Einstellungen['neueProSession']) => {
    setEinstellungen((alt) => { const neu = { ...alt, neueProSession }; schreibe('einstellungen', neu); return neu; });
  }, [schreibe]);

  const melde = useCallback(async (id: string, grund: string) => {
    if (server) {
      try { await meldeAnServer(id, grund); return 'server' as const; } catch { /* lokal weiter */ }
    }
    const alt = (await speicher.current?.lies<Meldung[]>('meldungen')) ?? [];
    schreibe('meldungen', [...alt, { id, grund, zeit: new Date().toISOString() }]);
    setStaende((s) => (s[id] ? { ...s, [id]: { ...s[id]!, gemeldet: true } } : s));
    return 'lokal' as const;
  }, [server, schreibe]);

  const exportiere = useCallback(() => {
    const ei = { ...einstellungen, exportErinnert: heute() };
    setEinstellungen(ei);
    schreibe('einstellungen', ei);
    return baueExport({ lernstand: { ...staende }, sessions: [...sessions], einstellungen: ei, labor: [...labor], erklaeren: [...erklaeren] });
  }, [einstellungen, labor, erklaeren, schreibe, sessions, staende]);

  const importiere = useCallback((d: SpeicherExport) => {
    setStaende(d.lernstand); setSessions(d.sessions); setEinstellungen(d.einstellungen); setLabor(d.labor); setErklaeren(d.erklaeren);
    schreibe('lernstand', d.lernstand); schreibe('sessions', d.sessions); schreibe('einstellungen', d.einstellungen); schreibe('labor', d.labor);
    schreibe('erklaeren', d.erklaeren);
  }, [schreibe]);

  const setzeZurueck = useCallback(() => {
    setStaende({}); setSessions([]); setLabor([]); setErklaeren([]);
    schreibe('lernstand', {}); schreibe('sessions', []); schreibe('labor', []); schreibe('erklaeren', []);
  }, [schreibe]);

  const pruefeServer = useCallback(async () => {
    const st = await serverStatus();
    setServer(st.da);
    setCoach(st.erklaeren);
  }, []);

  const wert = useMemo<AppZustand>(() => ({
    laden, fehler, inhalt, staende, sessions, labor, erklaeren, einstellungen, speicherArt, server, coach,
    bewerteKarte, speichereSession, speichereLaborErgebnis, speichereErklaerErgebnis, setzeTrack, setzeNeue, melde, exportiere, importiere, setzeZurueck, pruefeServer,
  }), [laden, fehler, inhalt, staende, sessions, labor, erklaeren, einstellungen, speicherArt, server, coach,
    bewerteKarte, speichereSession, speichereLaborErgebnis, speichereErklaerErgebnis, setzeTrack, setzeNeue, melde, exportiere, importiere, setzeZurueck, pruefeServer]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useApp(): AppZustand {
  const z = useContext(Kontext);
  if (!z) throw new Error('useApp außerhalb von AppProvider');
  return z;
}

/** Nur für Bildschirme, die geladenen Inhalt brauchen. */
export function useInhalt(): Inhalt {
  const { inhalt } = useApp();
  if (!inhalt) throw new Error('Inhalt noch nicht geladen');
  return inhalt;
}
