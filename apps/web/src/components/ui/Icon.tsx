import type { SVGProps } from 'react';

// Icons im Stil von SF Symbols: 24er-Raster, runde Kappen, 1.9er Strich.
const PFADE = {
  heute: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  roadmap: 'M6 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm12 11a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM8 6.5h6.5a3.5 3.5 0 0 1 0 7h-5a3.5 3.5 0 0 0 0 7H16',
  lexikon: 'M4.5 5.5c2.6-1 5.1-.8 7.5.8 2.4-1.6 4.9-1.8 7.5-.8v13c-2.6-1-5.1-.8-7.5.8-2.4-1.6-4.9-1.8-7.5-.8zM12 6.3v13',
  mehr: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM8 12h.01M12 12h.01M16 12h.01',
  haken: 'M5 12.5 10 17.5 19 7',
  kreuz: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  nochmal: 'M9 6 4.5 10.5 9 15M5 10.5h9.5a5 5 0 0 1 0 10H11',
  fahne: 'M5.5 21V4m0 .5h11l-2 4 2 4h-11',
  weiter: 'M9 5.5 15.5 12 9 18.5',
  zurueck: 'M15 5.5 8.5 12 15 18.5',
  flamme: 'M12 21c-3.6 0-6-2.5-6-5.8 0-3.6 3-5.4 3.6-9.2 2.6 1.4 4 3.6 4.1 5.8.9-.6 1.5-1.6 1.7-2.8 1.6 1.4 2.6 3.6 2.6 6 0 3.6-2.4 6-6 6Z',
  lupe: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM15.3 15.3 20 20',
  teilen: 'M12 3.5v11M8 7.5l4-4 4 4M6.5 11H5.5v9h13v-9h-1',
  laden: 'M12 14.5v-11M8 10.5l4 4 4-4M5.5 14v6h13v-6',
  eingang: 'M4 13.5 6.5 5h11l2.5 8.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 13.5h4.5l1.5 2.5h4l1.5-2.5H20',
  zahnrad: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6',
  balken: 'M5 20V12M10 20V7M15 20v-5M20 20V4',
  schleife: 'M12 4.5a7.5 7.5 0 1 1-6.9 4.6M5 4v5h5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  stapel: 'M7 4.5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2ZM8.5 2.5h7',
  funke: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z',
  schloss: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13z',
  dreh: 'M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1M17.5 3.5v3.4h-3.4M6.5 20.5v-3.4h3.4',
  diagramm: 'M4.5 4.5h6v5h-6zM13.5 14.5h6v5h-6zM7.5 9.5v4a2.5 2.5 0 0 0 2.5 2.5h3.5',
  skizze: 'M4.5 19.5l4-1 10-10a2.1 2.1 0 0 0-3-3l-10 10-1 4ZM14 7l3 3',
  vergleich: 'M6 7.5h12.5M15 4l3.5 3.5L15 11M18 16.5H5.5M9 13l-3.5 3.5L9 20',
  uebung: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 4.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 4h.01',
  abspielen: 'M7.5 5v14l11-7z',
  pause: 'M8.5 5.5v13M15.5 5.5v13',
  bild: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 11 4.5-4.5 4 4 2.5-2.5L20 18M15.5 9h.01',
} as const;

export type IconName = keyof typeof PFADE;

export function Icon({ name, size = 24, titel, ...rest }: { name: IconName; size?: number; titel?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={titel ? undefined : true} role={titel ? 'img' : undefined} {...rest}>
      {titel ? <title>{titel}</title> : null}
      <path d={PFADE[name]} />
    </svg>
  );
}
