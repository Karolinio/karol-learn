/** Heutiges Datum in lokaler Zeit als YYYY-MM-DD. */
export function heute(jetzt = new Date()): string {
  const j = jetzt.getFullYear();
  const m = String(jetzt.getMonth() + 1).padStart(2, '0');
  const t = String(jetzt.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

const FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

export function datumLang(iso: string): string {
  const [j, m, t] = iso.split('-').map(Number) as [number, number, number];
  return FORMAT.format(new Date(j, m - 1, t));
}

export function tageBis(iso: string, von = heute()): number {
  const ms = (s: string) => { const [j, m, t] = s.split('-').map(Number) as [number, number, number]; return Date.UTC(j, m - 1, t); };
  return Math.round((ms(iso) - ms(von)) / 86_400_000);
}

export function terminText(iso: string | undefined, von = heute()): string {
  if (!iso) return 'Noch kein Termin';
  const d = tageBis(iso, von);
  if (d <= 0) return 'Heute';
  if (d === 1) return 'Morgen';
  if (d < 7) return `In ${d} Tagen`;
  return datumLang(iso);
}

export function plusTageLokal(iso: string, tage: number): string {
  const [j, m, t] = iso.split('-').map(Number) as [number, number, number];
  return heute(new Date(j, m - 1, t + tage));
}
